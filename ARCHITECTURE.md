# CCaSS Competitor Intelligence Engine — Architecture & Approach

> **Purpose of this document:** Portable summary of the architecture, current state, and
> remaining work for external review (Codex, Gemini, or human architects). Updated 2026-02-13.

---

## 1. What This Is

An automated competitive intelligence platform for EY's Climate Change and Sustainability
Services (CCaSS) practice. Replaces a manually-produced quarterly PowerPoint with a living
dashboard that:

- Continuously scrapes 10 competitors' sustainability publications
- Classifies content using Google Gemini AI (themes, sentiment, relevance)
- Tracks regulatory changes, headcount, talent signals, and messaging shifts
- Surfaces decision-useful insights for ~30-50 EY senior leaders

**Sponsor:** Bruno Sarda, Global Chief Sustainability Strategist, EY
**Competitors tracked:** EY, KPMG, PwC, Deloitte, ERM, WSP, Bureau Veritas, McKinsey, BCG, Accenture

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14+ (App Router) | TypeScript strict mode |
| Styling | Tailwind CSS + shadcn/ui | EY brand colors enforced |
| Charts | Recharts + D3 | Recharts for standard, D3 for complex viz |
| Auth | NextAuth.js | Credentials + Magic Link, restricted to @ey.com |
| API | tRPC | Type-safe end-to-end, no standalone API routes for data |
| Database | PostgreSQL (Neon) + pgvector | 768-dim embeddings for semantic search |
| ORM | Prisma | Singleton client; raw SQL for vector ops |
| AI | Google Gemini 3.0 Flash Preview | Single model for screening + classification + synthesis |
| Embeddings | text-embedding-004 | 768 dimensions |
| Scraping | Playwright + Cheerio | JS-heavy sites vs. static HTML |
| Job Queue | BullMQ + Redis | Scrape every 24h, classify every 6h |
| Email | Resend | Alert digests (not yet implemented) |
| Exports | PptxGenJS + @react-pdf/renderer | PPTX/PDF (not yet implemented) |

---

## 3. Architecture Decisions

### 3.1 Single Gemini Model
We use **Gemini 3.0 Flash Preview** for all AI tasks (screening, classification, synthesis)
rather than splitting across Flash/Pro. Rationale:
- Flash Preview quality is sufficient for classification tasks
- Single model simplifies prompt management and reduces API key surface area
- Cost savings: ~70% cheaper than Pro for equivalent throughput
- Prompt templates are stored in the database (`AiPrompt` table) with versioning

### 3.2 Scraper → Classify Pipeline (Decoupled)
Scrapers store raw data only. A separate BullMQ job classifies in batches:
```
Scraper (every 24h) → raw Publication rows → Classifier (every 6h) → enriched metadata
```
This lets us re-classify historical data when prompts improve without re-scraping.

### 3.3 Sustainability Talent Signals (not generic hiring/layoffs)
The "Layoffs & Hiring" module is scoped to **sustainability-practice-specific signals only**:
- Practice leadership appointments/departures
- ESG practice restructurings (e.g., BCG dissolving standalone climate team)
- Sustainability team expansions tied to specific regulatory drivers (CSRD, ISSB)
- ESG-focused acquisitions

**Explicitly excluded:** Generic corporate hiring numbers, LinkedIn scraping (EY legal/ToS risk),
general restructuring that doesn't specifically name sustainability divisions.

### 3.4 Prompts in Database
AI prompts are versioned in the `AiPrompt` table, not hardcoded. Changes tracked in
`AiPromptHistory`. Loaded via a caching prompt loader (5-min TTL). This lets non-engineers
(Bruno's team) tune classification without code deploys.

### 3.5 No LinkedIn Scraping
Deliberately excluded due to:
- LinkedIn Terms of Service violations risk for EY
- hiQ v. LinkedIn legal precedent uncertainty
- Alternative approach: Revelio Labs API (Phase 2) for workforce analytics

---

## 4. Data Modules — Current State

| Module | DB Schema | Scraper | tRPC Router | UI Pages | AI Pipeline | Status |
|--------|-----------|---------|-------------|----------|-------------|--------|
| Publications | Done | 10 scrapers | Full CRUD | Dashboard + Detail | Classify pipeline | **Complete** |
| Regulatory | Done | Stubbed | Dashboard widget only | None | None | **Schema + seed** |
| Headcount | Done | N/A (CSV upload) | Dashboard widget only | None | None | **Schema + seed** |
| Talent Signals | Done | None | Dashboard widget only | None | None | **Schema + seed** |
| GTM Messaging | Done | None | None | None | None | **Schema only** |
| Client Sentiment | Done | None | None | None | None | **Schema only** |
| Export (PPTX/PDF) | N/A | N/A | None | None | N/A | **Not started** |
| Admin Panel | User roles defined | N/A | None | None | N/A | **Not started** |

### What "Complete" means for Publications
- 10 per-competitor scrapers (Playwright/Cheerio)
- Two-stage AI pipeline: screen for relevance → full classification (theme, content type, keywords, summary)
- tRPC router with `list`, `getById`, `getStats`, `getTrends`, `getThemeDistribution`
- Dashboard with stat cards, trend chart, theme heatmap, sortable data table
- Publication detail page (needs tRPC query wiring — one TODO)

---

## 5. Database Schema (Key Models)

```
Competitor (10 rows, central reference — never hardcode names)
  ├── Publication (scraped + AI-classified)
  ├── HeadcountSnapshot (manual CSV upload)
  ├── GtmSnapshot → GtmChange (website diff tracking)
  ├── LayoffEvent (sustainability talent signals only)
  └── SentimentSignal (public signal approximation)

RegulatoryEvent (not competitor-specific, cross-cutting)
AiPrompt → AiPromptHistory (versioned prompt management)
ScraperRun (health monitoring for every scraper execution)
User → Session, AlertSubscription, ChatSession
```

Vector embeddings (768-dim, pgvector) are stored on `Publication` for semantic search.
Prisma uses `Unsupported("vector(768)")` — all vector ops use raw SQL.

---

## 6. Remaining Work (Priority Order)

### Phase 1 — MVP (target: working demo for Bruno)
1. **Regulatory Module** — tRPC router + UI page + seed data enrichment
2. **Headcount Module** — CSV upload UI + comparison charts
3. **Talent Signals Module** — Dedicated page with timeline view
4. **Export System** — PPTX generation (quarterly deck replacement, the whole point)
5. **Publication detail fix** — Wire up tRPC query (1 TODO)

### Phase 2 — Production Hardening
6. **GTM Messaging** — Website change detection scraper + diff UI
7. **Client Sentiment** — Public signal collection + approximation
8. **Admin Panel** — Prompt editor, competitor management, user management
9. **Email Alerts** — Resend integration for digest emails
10. **Revelio Labs Integration** — Replace manual CSV headcount with API

---

## 7. Key Questions for Review

1. **Is the single-model Gemini approach sound?** We're using Flash Preview for everything
   including synthesis. Should synthesis use a more capable model?

2. **Is the scraper architecture right?** 10 per-competitor scrapers feels maintainable now,
   but will it scale when we add regulatory sources, GTM monitoring, etc.?

3. **Should we add a caching layer?** The dashboard makes 5+ tRPC queries on load. Redis is
   already in the stack (for BullMQ). Worth adding query-level caching?

4. **PPTX export approach?** PptxGenJS generates slides server-side. Should we use a template
   approach (fill placeholders in a .pptx template) or programmatic generation?

5. **Is the talent signals scope right?** We narrowed from generic hiring/layoffs to
   sustainability-practice-specific only. Does this leave gaps that Bruno's team would notice?

---

## 8. File Map (Key Files)

```
prisma/schema.prisma                              — Full DB schema (535 lines)
prisma/seed.ts                                    — Seed data for all modules
src/app/(dashboard)/dashboard-client.tsx           — Main dashboard (618 lines)
src/app/(dashboard)/publications/                  — Publications module pages
src/server/trpc/routers/dashboard.ts               — Dashboard API (327 lines)
src/server/trpc/routers/publications.ts            — Publications API (376 lines)
src/server/ai/client.ts                            — Gemini API client
src/server/ai/pipelines/classify-publication.ts    — Publication classification pipeline
src/server/ai/prompts/index.ts                     — Prompt loader with caching
src/lib/constants.ts                               — AI model config, competitor colors
workers/index.ts                                   — Worker entrypoint (BullMQ)
workers/scrapers/publications/                     — 10 competitor scrapers
workers/health/monitor.ts                          — Scraper health monitoring
CLAUDE.md                                          — Coding standards & conventions
```
