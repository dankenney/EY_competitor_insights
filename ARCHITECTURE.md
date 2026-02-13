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
| AI (ETL) | Google Gemini 3.0 Flash Preview | Screening + classification (high volume, low cost) |
| AI (Reasoning) | Google Gemini 2.5 Pro | Monthly synthesis + Chat Q&A (exec-quality output) |
| Embeddings | text-embedding-004 | 768 dimensions, chunked (500 tokens, 100-token overlap) |
| Vector Index | pgvector HNSW | Better recall + no pre-population requirement vs. IVFFlat |
| Scraping | Playwright + Cheerio | CSS-based primary; Firecrawl/Jina fallback (Phase 2) |
| Job Queue | BullMQ + Redis | Scrape every 24h, classify every 6h |
| Email | Resend | Alert digests (not yet implemented) |
| Exports | docxtemplater (PPTX) + @react-pdf/renderer | Template-based PPTX; charts as server-rendered PNGs |

---

## 3. Architecture Decisions

### 3.1 Tiered Gemini Model Strategy
We use a **two-tier model approach** within Google Gemini:

| Tier | Model | Used For | Rationale |
|------|-------|----------|-----------|
| Fast | Gemini 3.0 Flash Preview | Screening, classification | High-volume ETL; ~70% cheaper than Pro |
| Reasoning | Gemini 2.5 Pro | Monthly synthesis, Chat Q&A | Executive-facing output needs cross-domain reasoning (e.g., connecting headcount drops to GTM shifts) |

- Prompt templates are stored in the database (`AiPrompt` table) with versioning
- Flash handles 95%+ of API calls (daily scraping volume); Pro runs infrequently (monthly summaries, on-demand chat)
- Cost impact of the upgrade is negligible — synthesis runs once/month, chat is on-demand

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

### 3.6 Template-Based PPTX Export
Use a **designer-owned .pptx master template** with placeholder tags (e.g., `{{COMPETITOR_1_INSIGHT}}`)
rather than programmatic slide generation with PptxGenJS. Rationale:
- EY brand team can update the template without code changes
- `docxtemplater` (with PPTX plugin) replaces tagged text and swaps chart images
- Charts render server-side as PNG binaries (Recharts → PNG via server renderer)
- Drastically reduces maintenance when brand guidelines change
- PptxGenJS remains available as a fallback for fully dynamic slide types if needed

### 3.7 HNSW Vector Index (not IVFFlat)
pgvector index uses **HNSW** (Hierarchical Navigable Small World) instead of IVFFlat:
- Faster query performance with better recall
- No requirement to pre-populate the table before building the index (IVFFlat limitation)
- Neon Postgres supports HNSW natively

### 3.8 Chunked Embeddings
Long publications are split into **chunks** (500 tokens, 100-token overlap) before embedding:
- Each chunk stored as a row in `DocumentEmbedding` (linked via `sourceType` + `sourceId` + `chunkIndex`)
- Vector search operates against chunks, not whole documents — prevents semantic dilution for 40-page whitepapers
- Schema already supports this: `DocumentEmbedding` has `chunkIndex` with a unique constraint

### 3.9 Agentic RAG for Chat Q&A (Tool Calling)
The Chat Q&A feature uses **Gemini function calling** (tool use), not pure vector similarity search:
- Pure RAG fails for structured queries like "Compare EY and KPMG headcount trends"
- The LLM decides at runtime whether to: (a) vector-search publication chunks, (b) call structured
  query tools (e.g., `get_headcount_data`, `get_publication_counts`, `get_regulatory_events`), or (c) both
- Tool definitions map to tRPC procedures — the chat handler invokes them server-side
- Gemini 2.5 Pro powers this (see Section 3.1) for its stronger reasoning on multi-step queries

### 3.10 LLM-Based GTM Change Detection (not SHA-256 hashing)
Website change detection for the GTM module uses **LLM semantic diff** instead of text hashing:
- SHA-256 hash comparison triggers false positives from timestamps, rotating widgets, and trivial edits
- Instead: pass yesterday's page text and today's page text to Gemini Flash with the prompt:
  *"Are there material changes to service offerings, positioning, or platforms? Ignore UI, timestamps, related links."*
- Flash is cheap enough that running this daily per competitor is negligible cost
- `GtmSnapshot.textHash` field remains in schema for deduplication but is not the primary change signal

### 3.11 Resilient Scraper Strategy (Fallback to LLM-Assisted Scraping)
Phase 1 scrapers use CSS selectors (Cheerio) with multiple fallback patterns. Phase 2 adds a
**Firecrawl/Jina Reader fallback**:
- When a primary scraper fails health checks (tracked via `ScraperRun`), traffic automatically
  routes to a fallback path: Firecrawl/Jina dumps raw Markdown → Gemini Flash extracts structured JSON
- This protects against site redesigns without throwing away working CSS-based scrapers
- Budget for rotating residential proxy service in Phase 2 (Big 4 domains use enterprise WAFs)

### 3.12 Caching Strategy
Dashboard data updates in batches (every 6-24h), so aggressive caching is safe:
- **Primary:** Next.js App Router Data Cache (`unstable_cache` with revalidation tags) for dashboard queries
- **Secondary:** PostgreSQL materialized views for expensive aggregations (theme distributions, trend data)
- **Redis:** Reserved for BullMQ job queue and future chat session state — not used for tRPC query caching
- Revalidation triggered when classification jobs complete (tag-based invalidation)

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
4. **Export System** — EY-designed .pptx master template + `docxtemplater` fill pipeline; server-side chart PNG rendering (see Section 3.6)
5. **Publication detail fix** — Wire up tRPC query (1 TODO)
6. **Dashboard caching** — Add `unstable_cache` to tRPC dashboard queries with revalidation tags (see Section 3.12)

### Phase 2 — Production Hardening
7. **Embedding pipeline** — Chunked ingestion (500 tokens, 100-token overlap) → `DocumentEmbedding` table; HNSW index creation (see Sections 3.7, 3.8)
8. **Chat Q&A** — Agentic RAG with Gemini 2.5 Pro function calling; vector search + structured query tools (see Section 3.9)
9. **GTM Messaging** — LLM-based semantic diff for website change detection (see Section 3.10)
10. **Scraper resilience** — Firecrawl/Jina fallback path + rotating proxy service (see Section 3.11)
11. **Client Sentiment** — Public signal collection + approximation
12. **Admin Panel** — Prompt editor, competitor management, user management
13. **Email Alerts** — Resend integration for digest emails
14. **Revelio Labs Integration** — Replace manual CSV headcount with API

---

## 7. Resolved Architecture Decisions (from external review)

These questions were raised during initial design and have been resolved after review:

1. **Single-model → Tiered model.** Flash Preview stays for ETL (screening, classification).
   Gemini 2.5 Pro added for synthesis and Chat Q&A. Cost impact negligible. *(Section 3.1)*

2. **Scraper scaling → Fallback strategy.** Current CSS-based scrapers are working and maintained.
   Phase 2 adds Firecrawl/Jina fallback triggered by health check failures. *(Section 3.11)*

3. **Caching → Next.js native first.** `unstable_cache` with revalidation tags for dashboard.
   Redis reserved for BullMQ + future chat state. No Redis in the tRPC layer. *(Section 3.12)*

4. **PPTX → Template-based.** EY designer owns a .pptx master template. `docxtemplater` fills
   placeholders. Charts render as PNGs server-side. *(Section 3.6)*

5. **Talent signals scope → Confirmed correct.** Sustainability-practice-specific only. General
   corporate hiring/layoffs excluded. Manual Revelio Labs upload covers attrition gaps. *(Section 3.3)*

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
