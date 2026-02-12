# Agent Instructions — CCaSS Intelligence Engine

## Branch Strategy

- **Development branch:** `claude/review-product-spec-ehH2A`
- All work MUST be committed to this branch.
- NEVER push to `main` or `master`.
- Use `git push -u origin claude/review-product-spec-ehH2A` when pushing.

## Commit Conventions

Use conventional commits with module context:

```
feat(publications): add Deloitte publication scraper
feat(auth): set up NextAuth with credentials provider
fix(scrapers): handle timeout in KPMG scraper
chore(prisma): add headcount snapshot table
refactor(trpc): extract shared pagination logic
```

Prefixes: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`

Module tags: `publications`, `regulatory`, `headcount`, `gtm`, `sentiment`, `layoffs`, `scrapers`, `auth`, `trpc`, `prisma`, `ai`, `ui`, `export`

## Before Committing

1. Run `npm run lint` — fix any linting errors
2. Run `npm run build` — ensure the build succeeds (catches type errors)
3. After schema changes: run `npx prisma validate` and `npx prisma generate`
4. Never commit `.env.local` or any file with real API keys/secrets

## What NOT To Do

- **Don't modify `.env.local`** with real secrets — only edit `.env.example`
- **Don't delete Prisma migrations** — create new ones to fix issues
- **Don't change the auth domain restriction** (@ey.com) without explicit permission
- **Don't add dependencies** without clear justification — prefer existing packages
- **Don't create documentation files** (README, docs/) unless explicitly requested
- **Don't hardcode** competitor names, API URLs, or AI prompts in application code
- **Don't use `any` type** in TypeScript — use proper typing or `unknown`
- **Don't skip error handling** in tRPC routers — use TRPCError with appropriate codes
- **Don't bypass scraper health reporting** — every scraper run must log to ScraperRun table

## Security Rules

- All API keys go in environment variables, never in code
- Never log API keys, passwords, or user emails in plain text
- Sanitize all user input in tRPC input validators (use Zod schemas)
- Auth routes must check session — use `protectedProcedure` or `adminProcedure`
- File uploads (CSV, PDF) must validate content type and size before processing
- Scraping user-agents should be honest (identify as a bot, not impersonate a browser)

## Testing Protocol

### Manual Testing
- After building a scraper: run it standalone via `npx tsx workers/scrapers/publications/{firm}.ts` and verify output
- After building a tRPC router: test via the frontend or a REST client
- After building a page: verify in browser at the correct route

### Automated Testing (when set up)
- Unit tests for AI prompt templates (verify JSON output parsing)
- Integration tests for tRPC routers (verify DB queries return expected shapes)
- Scraper smoke tests (verify at least one item is scraped from each target)

## File Organization Rules

- New pages go in `src/app/(dashboard)/{module}/page.tsx`
- New tRPC routers go in `src/server/trpc/routers/{module}.ts` and must be added to the root router
- New scrapers go in `workers/scrapers/{category}/{firm}.ts` and must extend `BaseScraper`
- New AI prompts go in `src/server/ai/prompts/defaults/{slug}.ts` and must be added to the seed script
- New shadcn/ui components: install via `npx shadcn@latest add {component}`
- Shared chart components go in `src/components/charts/`
- Module-specific components go in `src/components/modules/{module}/`

## Performance Guidelines

- Use React Server Components by default (no `"use client"` unless needed)
- Add `"use client"` only for: interactive components, hooks, event handlers, browser APIs
- Use `loading.tsx` files for route-level loading states
- Database queries should use pagination — never fetch unbounded result sets
- Scraper results should be processed in batches, not all at once
