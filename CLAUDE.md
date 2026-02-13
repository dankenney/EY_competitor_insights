# CCaSS Competitor Intelligence Engine

## Project Overview

Automated competitive intelligence platform for EY's Climate Change and Sustainability Services (CCaSS) practice. Replaces a manually-produced quarterly PowerPoint with a living intelligence platform that continuously monitors 10 competitors, classifies data using Google Gemini AI, and surfaces decision-useful insights for ~30-50 senior leaders (partners, MDs, senior managers).

**Sponsor:** Bruno Sarda, Global Chief Sustainability Strategist, EY
**Competitors tracked:** EY, KPMG, PwC, Deloitte, ERM, WSP, Bureau Veritas, McKinsey, BCG, Accenture

## Tech Stack

- **Framework:** Next.js 14+ (App Router), TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts (standard charts) + D3 (complex visualizations)
- **Auth:** NextAuth.js (Credentials + Magic Link), restricted to @ey.com
- **API:** tRPC (type-safe end-to-end)
- **Database:** PostgreSQL (Neon serverless) + pgvector extension
- **ORM:** Prisma
- **AI:** Google Gemini API (`@google/generative-ai`)
  - Gemini 3.0 Flash Preview → screening, classification, synthesis (single model, cost-efficient)
  - text-embedding-004 → embeddings (768-dim)
- **Scraping:** Playwright (JS-heavy) + Cheerio (static HTML)
- **Job Queue:** BullMQ + Redis
- **Email:** Resend
- **Exports:** PptxGenJS (PPTX), @react-pdf/renderer (PDF)

## Architecture

### Directory Structure
```
src/app/(auth)/          → Login/verify pages (no dashboard chrome)
src/app/(dashboard)/     → All dashboard pages (shared sidebar layout)
src/app/api/             → tRPC handler, NextAuth, export endpoints
src/components/ui/       → shadcn/ui primitives (auto-generated)
src/components/layout/   → Sidebar, header, navigation
src/components/charts/   → Reusable chart components
src/components/shared/   → DataTable, filters, skeletons, empty states
src/server/trpc/         → tRPC routers and initialization
src/server/db/           → Prisma client singleton + query helpers
src/server/ai/           → Gemini client, prompt loader, AI pipelines
src/server/auth/         → NextAuth configuration
src/server/export/       → PPTX/PDF generation
src/lib/                 → Utils, constants, types, Zod validators
workers/                 → Background job processors (separate process)
workers/scrapers/        → Per-competitor and per-source scrapers
workers/health/          → Scraper health monitoring
prisma/                  → Schema, migrations, seed data
```

### Data Modules
1. **Publications & Thought Leadership** — Scrapes + classifies competitor publications *(fully implemented)*
2. **Regulatory Tracker** — Monitors regulatory changes across US/EU/UK/APAC *(schema + dashboard widget)*
3. **Competitor Headcount** — Manual CSV upload (MVP), Revelio Labs (Phase 2) *(schema + dashboard widget)*
4. **Sustainability Talent Signals** — Practice-specific leadership moves, ESG practice restructurings, sustainability team changes. NOT general corporate hiring/layoffs. *(schema + dashboard widget)*
5. **GTM Messaging** — Tracks competitor website/messaging changes *(schema only)*
6. **Client Sentiment** — Approximates survey insights from public signals *(schema only)*

## Coding Standards

### TypeScript
- Strict mode enabled. No `any` types unless absolutely necessary.
- Use Zod for all validation (tRPC inputs, form data, API responses).
- Prefer `interface` for object shapes, `type` for unions/intersections.

### API Layer
- **All API calls go through tRPC.** Never create standalone API route handlers for data queries.
- Use `protectedProcedure` for authenticated routes, `adminProcedure` for admin-only.
- Export endpoints (PPTX/PDF) are the exception — they use standard Next.js API routes because they return binary data.

### Components
- Use shadcn/ui components from `src/components/ui/`.
- Page-specific components go in `src/components/modules/{module}/`.
- Shared components (DataTable, filters) go in `src/components/shared/`.

### Database
- Use the Prisma client singleton from `src/server/db/index.ts`. Never create new PrismaClient instances.
- Vector operations (pgvector) use `$queryRaw` / `$executeRaw` — Prisma doesn't natively support the vector type.
- Competitor data is always queried from the `Competitor` table. Never hardcode competitor names/lists.

### AI Prompts
- **Prompts live in the database** (`AiPrompt` table), not in code.
- Default prompt templates are in `src/server/ai/prompts/defaults/` — these seed the DB.
- Load prompts via the prompt loader (`src/server/ai/prompts/index.ts`) which caches with 5-min TTL.
- Every prompt has a `slug` for lookup (e.g., `screen-publication`, `classify-publication`).
- Prompt changes are versioned — `AiPromptHistory` stores every edit.

### Scrapers
- All scrapers extend `BaseScraper` from `workers/scrapers/base.ts`.
- Every scraper run MUST record a `ScraperRun` entry (success or failure).
- Respect rate limits: minimum 2-second delay between requests to the same domain.
- Use retry with exponential backoff (3 attempts max).
- Scraper → DB is separate from AI classification. Scrapers store raw data; a separate BullMQ job classifies.

## Environment Setup

### Local Development
```bash
docker compose up -d          # Start Postgres + Redis
cp .env.example .env.local    # Copy and fill in env vars
npx prisma migrate dev        # Run migrations
npx prisma db seed            # Seed competitors, prompts, admin user
npm run dev                   # Start Next.js dev server
npm run worker:dev            # Start background workers (separate terminal)
```

### Required Environment Variables
See `.env.example` for the full list. Critical ones:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string (for BullMQ)
- `GEMINI_API_KEY` — Google Gemini API key
- `NEXTAUTH_SECRET` — NextAuth encryption secret
- `NEXTAUTH_URL` — App URL (http://localhost:3000 for dev)

## Common Pitfalls

1. **Don't use Prisma's native vector type** — Use `Unsupported("vector(768)")` in the schema and raw SQL for vector operations.
2. **Don't hardcode competitor lists** — Always query from the `Competitor` table.
3. **Don't skip scraper health reporting** — Every scraper run must record a `ScraperRun` entry.
4. **Don't create new PrismaClient instances** — Use the singleton from `src/server/db/index.ts`.
5. **Don't hardcode AI prompts** — Use the prompt loader, which reads from DB with caching.
6. **Don't use standalone API routes for data queries** — Use tRPC routers.

## EY Brand Colors

```css
--ey-yellow: #FFE600;
--ey-dark: #2E2E38;
--ey-gray-dark: #464646;
--ey-gray-medium: #747480;
--ey-gray-light: #C4C4CD;

/* Competitor colors (consistent across all charts) */
--color-ey: #FFE600;
--color-kpmg: #00338D;
--color-pwc: #EB8C00;
--color-deloitte: #86BC25;
--color-erm: #00A3E0;
--color-wsp: #E31937;
--color-bv: #00205B;
--color-mckinsey: #004B87;
--color-bcg: #00843D;
--color-accenture: #A100FF;
```
