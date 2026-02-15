# Railway Deployment — Lessons Learned

> A chronicle of every issue we hit trying to deploy the CCaSS Competitor Intelligence Engine to Railway, documented so we never repeat these mistakes.

---

## Table of Contents

1. [Middleware Edge Runtime Incompatibility](#1-middleware-edge-runtime-incompatibility)
2. [Auth Middleware Blocks Everything in Dev](#2-auth-middleware-blocks-everything-in-dev)
3. [Prisma 7 Requires the PrismaPg Adapter](#3-prisma-7-requires-the-prismapg-adapter)
4. [Missing `output: "standalone"` in Next.js Config](#4-missing-output-standalone-in-nextjs-config)
5. [Next.js Build Fails Without Environment Variables](#5-nextjs-build-fails-without-environment-variables)
6. [Fragile `dotenv/config` Import in prisma.config.ts](#6-fragile-dotenvconfig-import-in-prismaconfigts)
7. [Prisma v7 Changed the Generated Client Location](#7-prisma-v7-changed-the-generated-client-location)
8. [Health Check Endpoint Blocked by Auth Middleware](#8-health-check-endpoint-blocked-by-auth-middleware)
9. [ESLint Chokes on Prisma Auto-Generated Files](#9-eslint-chokes-on-prisma-auto-generated-files)
10. [React Anti-Patterns Caught by ESLint in CI](#10-react-anti-patterns-caught-by-eslint-in-ci)
11. [CI Build Also Needs Placeholder Env Vars](#11-ci-build-also-needs-placeholder-env-vars)
12. [Railway Needed a Manual Rebuild Trigger](#12-railway-needed-a-manual-rebuild-trigger)
13. [Worker Dockerfile Still Has Stale Prisma Copy](#13-worker-dockerfile-still-has-stale-prisma-copy)

---

## 1. Middleware Edge Runtime Incompatibility

**Commit:** `1f115da` — *fix: switch middleware from edge auth() to cookie check for dev compatibility*

### What Happened

The original middleware used the `auth()` wrapper exported from NextAuth:

```ts
import { auth } from "@/server/auth/config";
export default auth((req) => { ... });
```

This imported `bcrypt` and `PrismaAdapter` under the hood, both of which require Node.js `crypto` APIs. Next.js middleware runs in the **Edge Runtime**, which doesn't support Node.js built-in modules. The build would fail (or silently error at runtime) because Edge can't resolve `bcrypt` or `crypto`.

### The Fix

Replaced the `auth()` wrapper with a plain `middleware()` function that checks for the NextAuth session cookie directly:

```ts
export default function middleware(req: NextRequest) {
  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}
```

Actual session validation still happens server-side in tRPC `protectedProcedure` — the middleware just does a lightweight cookie-presence gate.

### Lesson

**Never import server-only modules (bcrypt, Prisma, Node crypto) in Next.js middleware.** Middleware runs on the Edge Runtime. If you need auth checks in middleware, check cookies or use a JWT-based strategy that doesn't need Node.js APIs.

---

## 2. Auth Middleware Blocks Everything in Dev

**Commit:** `150954e` — *fix: skip auth redirect in development when database is unavailable*

### What Happened

After switching to cookie-based middleware, every route still redirected to `/login` in local development because there was no session cookie (no one had logged in). This made the entire app inaccessible during development — you couldn't even see the dashboard to test it.

### The Fix

Added a development-mode escape hatch in the middleware:

```ts
if (process.env.NODE_ENV === "development") {
  return NextResponse.next();
}
```

Combined with a dev session bypass in the tRPC context (`8b2cb39`) that returns a fake admin session when `NODE_ENV === "development"` and no real session exists.

### Lesson

**Always have a dev-mode auth bypass for local development.** The middleware and tRPC layer both need to allow unauthenticated access in dev mode, otherwise you can't test anything without a fully running auth flow and database.

---

## 3. Prisma 7 Requires the PrismaPg Adapter

**Commit:** `8b2cb39` — *fix: connect database end-to-end — seed command, PrismaPg adapter, dev auth bypass*

### What Happened

The project uses Prisma 7, which changed how database connections work. The seed script was using `new PrismaClient()` directly, but Prisma 7 with PostgreSQL requires the `@prisma/adapter-pg` driver adapter. The seed command also wasn't registered in `prisma.config.ts`, so `prisma db seed` did nothing.

### The Fix

1. Added `seed: "npx tsx prisma/seed.ts"` to `prisma.config.ts`
2. Updated `seed.ts` to use the PrismaPg adapter:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

### Lesson

**Prisma 7 is a breaking change.** You can't just `new PrismaClient()` for PostgreSQL anymore — you need the `@prisma/adapter-pg` driver adapter. And `prisma db seed` requires the seed command to be explicitly configured in `prisma.config.ts`, not just in `package.json` (Prisma 7 reads from the config file, not package.json's `prisma.seed` field).

---

## 4. Missing `output: "standalone"` in Next.js Config

**Commit:** `2789e6a` — *feat: add Railway deployment foundation*

### What Happened

Without `output: "standalone"` in `next.config.ts`, Next.js produces a build that requires the full `node_modules` directory at runtime. This makes Docker images enormous (1GB+) and defeats the purpose of multi-stage builds. The standalone output mode produces a self-contained `server.js` with only the required dependencies inlined.

### The Fix

```ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

### Lesson

**Always enable `output: "standalone"` for Docker/Railway deployments.** This is not optional for containerized deployments — it's required for a reasonable image size and for the `node server.js` entrypoint to work. Without it, you'd need to copy the entire `node_modules` into the production image.

---

## 5. Next.js Build Fails Without Environment Variables

**Commit:** `24677af` — *fix(deploy): harden Dockerfile for Railway and remove fragile dotenv import*

### What Happened

The Docker build stage ran `next build`, which performs **module tracing** — it statically analyzes all server-side imports to determine which files need to be bundled. Our code imports `pg.Pool` (via Prisma) and references `process.env.DATABASE_URL`. Even though `pg.Pool` is lazy and doesn't actually connect during build, the module still needs to *load* cleanly. Next.js was crashing during build because `DATABASE_URL` and `NEXTAUTH_SECRET` were undefined.

The Railway build kept failing with cryptic module tracing errors that didn't clearly point to missing env vars.

### The Fix

Added dummy build-time environment variables in the Dockerfile builder stage:

```dockerfile
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL=${DATABASE_URL}
ARG NEXTAUTH_SECRET="build-secret-placeholder"
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
```

These are never used at runtime — Railway injects the real values. They just exist so the build can complete module tracing without errors.

### Lesson

**Next.js standalone builds trace all server imports at build time.** Any module that reads env vars at import time (not just at call time) will crash the build if those vars are missing. You need dummy values in the Dockerfile's build stage. This is a well-known Next.js footgun but the error messages are terrible — they point to module resolution failures, not missing env vars.

---

## 6. Fragile `dotenv/config` Import in prisma.config.ts

**Commit:** `24677af` — *fix(deploy): harden Dockerfile for Railway and remove fragile dotenv import*

### What Happened

`prisma.config.ts` had `import "dotenv/config"` at the top to load `.env` files locally. In Docker, there are no `.env` files — env vars are injected by Railway directly. The `dotenv` import was a transitive dependency that sometimes resolved and sometimes didn't depending on the install order. When it failed, `prisma generate` crashed.

### The Fix

Removed the import entirely:

```diff
-import "dotenv/config";
 import { defineConfig } from "prisma/config";
```

In Docker, env vars are injected by the runtime. Locally, Next.js auto-loads `.env.local`. There's no need for an explicit dotenv import.

### Lesson

**Don't add `import "dotenv/config"` to config files used in Docker builds.** It's fragile, unnecessary (Next.js and Railway both handle env injection), and creates a dependency that can break in CI/Docker where `.env` files don't exist. If you need dotenv for local non-Next.js scripts, import it in those scripts only.

---

## 7. Prisma v7 Changed the Generated Client Location

**Commit:** `417886b` — *fix(docker): remove node_modules/.prisma copy (Prisma v7)*

### What Happened

This one was particularly frustrating. The initial Dockerfile had:

```dockerfile
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
```

Prisma v7 generates the client to `src/generated/prisma` (as configured in the schema). The old `node_modules/.prisma` directory **doesn't exist anymore** in Prisma v7. Docker's `COPY` fails hard when the source path doesn't exist — the entire build blew up with a "not found" error.

What made this worse: the initial Dockerfile was written with *both* locations (belt and suspenders), but the old location just doesn't exist in v7.

### The Fix

Removed the stale `COPY` line:

```diff
 COPY --from=builder /app/prisma ./prisma
 COPY --from=builder /app/src/generated/prisma ./src/generated/prisma
-COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
 COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
```

### Lesson

**Know where your Prisma version puts the generated client.** Prisma v5 and earlier used `node_modules/.prisma/client`. Prisma v6+ with a custom output path puts it wherever you configure (e.g., `src/generated/prisma`). Prisma v7 dropped the `node_modules/.prisma` location entirely when using custom output. If you upgrade Prisma, audit every `COPY` directive in your Dockerfiles.

### Outstanding Issue

**The `Dockerfile.worker` still has the stale `node_modules/.prisma` COPY** (see [Issue #13](#13-worker-dockerfile-still-has-stale-prisma-copy)). It hasn't been deployed yet, so this hasn't blown up, but it will the moment someone deploys the worker service.

---

## 8. Health Check Endpoint Blocked by Auth Middleware

**Commit:** `2789e6a` — *feat: add Railway deployment foundation*

### What Happened

Railway sends HTTP health check probes to verify your service is alive. The health check was configured to hit `/api/health`. But the auth middleware intercepted all routes and redirected unauthenticated requests to `/login`. Railway's health probe (which has no session cookie) kept getting redirected → Railway thought the service was unhealthy → Railway killed and restarted the container in a loop.

This one was caught proactively during the initial setup, not from a failed deploy — but it's exactly the kind of thing that would have been a maddening debugging session ("why does Railway keep restarting my service?!").

### The Fix

Added `/api/health` to the middleware's public paths:

```ts
const publicPaths = ["/login", "/api/auth", "/api/health", "/_next", "/favicon.ico"];
```

### Lesson

**Always whitelist your health check endpoint in auth middleware.** Any health check, readiness probe, or liveness probe URL that Railway (or Kubernetes, or any orchestrator) uses must be accessible without authentication. Otherwise, the orchestrator will think your app is dead.

---

## 9. ESLint Chokes on Prisma Auto-Generated Files

**Commit:** `47fd749` — *fix(ci): add GitHub Actions CI workflow and fix all ESLint errors*

### What Happened

When we added a CI pipeline, ESLint tried to lint everything including `src/generated/`, which contains Prisma's auto-generated client code. These generated files have patterns that violate ESLint rules (and they should — they're machine-generated). The CI lint job failed on hundreds of errors in code we don't control.

### The Fix

Added `src/generated/**` to the ESLint global ignores in `eslint.config.mjs`:

```js
globalIgnores([
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
  "src/generated/**",  // Prisma generated client
]),
```

### Lesson

**Exclude all auto-generated code from linting.** When adding CI, always check what directories contain generated code (Prisma, GraphQL codegen, OpenAPI clients, etc.) and add them to your lint ignores before the first CI run.

---

## 10. React Anti-Patterns Caught by ESLint in CI

**Commit:** `47fd749` — *fix(ci): add GitHub Actions CI workflow and fix all ESLint errors*

### What Happened

Code that worked fine locally (because we weren't running the linter consistently) failed in CI. Four distinct issues:

1. **`Math.random()` in render** — `loading-skeleton.tsx` used `Math.random()` to generate skeleton bar heights. This is an impure render call that produces different output on every render, breaking React's reconciliation.

2. **Variable reassignment during render** — `publication-stats.tsx` used `let cumulativePercent = 0` and mutated it in a `.map()` callback. Technically works but the linter flagged it as a side-effect in render.

3. **Component defined inside component** — `publications-table.tsx` defined a `ColHeader` component *inside* the `PublicationsTable` component body. This creates a new component identity on every render, causing unnecessary unmount/remount cycles.

4. **Unused variable** — `erm.ts` scraper had an unused `$` parameter.

### The Fixes

1. Replaced `Math.random()` with a deterministic array of heights: `[100, 60, 140, 80, 120, ...]`
2. Replaced the `let` + `.map()` pattern with `.reduce()` that accumulates offsets purely
3. Moved `ColHeader` to a module-level function component with explicit props
4. Renamed unused `$` to `_$`

### Lesson

**Set up CI linting from day one, not after you've written 3,000+ lines of code.** Every one of these issues was trivial to fix individually, but finding and fixing all of them at once during a deployment push was an unwelcome distraction. Run linting in pre-commit hooks or at least in CI from the first commit.

---

## 11. CI Build Also Needs Placeholder Env Vars

**Commit:** `47fd749` — *fix(ci): add GitHub Actions CI workflow and fix all ESLint errors*

### What Happened

Same issue as [#5](#5-nextjs-build-fails-without-environment-variables) but in GitHub Actions instead of Docker. The CI `build` job ran `next build` without any environment variables set. Next.js module tracing crashed because `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` were undefined.

### The Fix

Added placeholder env vars to the CI workflow:

```yaml
build:
  runs-on: ubuntu-latest
  env:
    DATABASE_URL: "postgresql://placeholder:placeholder@localhost:5432/placeholder"
    NEXTAUTH_SECRET: "ci-placeholder-secret"
    NEXTAUTH_URL: "http://localhost:3000"
```

### Lesson

**If you need dummy env vars in Docker, you also need them in CI.** The build step has the same requirements regardless of where it runs. Keep a checklist of required build-time env vars and make sure they're set in every environment that runs `next build`.

---

## 12. Railway Needed a Manual Rebuild Trigger

**Commit:** `2a014f3` — *chore: trigger Railway rebuild*

### What Happened

After merging all the fixes, Railway didn't automatically pick up the new commits and trigger a rebuild. Whether this was a webhook timing issue, a Railway dashboard config issue, or a branch mismatch, the deploy was stuck on the old (broken) build.

### The Fix

A trivial whitespace change to the Dockerfile (added one dash to a comment line) to force a new commit and trigger Railway's build webhook:

```diff
-# ── Stage 1: Install dependencies ─────────────────────────────────────────────
+# ── Stage 1: Install dependencies ──────────────────────────────────────────────
```

This is the "turn it off and on again" of CI/CD.

### Lesson

**Sometimes you just need to push a dummy commit to trigger a rebuild.** Know how to manually trigger builds in Railway's dashboard, but also know that a trivial commit to a watched file will do the trick. It's ugly, but it works.

---

## 13. Worker Dockerfile Still Has Stale Prisma Copy

**Status: UNFIXED (as of 2026-02-15)**

### What's Wrong

`Dockerfile.worker` still contains:

```dockerfile
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
```

This path doesn't exist in Prisma v7 (see [Issue #7](#7-prisma-v7-changed-the-generated-client-location)). It was removed from the main `Dockerfile` in commit `417886b`, but the same fix was never applied to `Dockerfile.worker`. The worker service hasn't been deployed yet, so this hasn't caused a failure — but it will fail the moment it's built.

### Required Fix

Remove the stale line from `Dockerfile.worker`:

```diff
 COPY --from=builder /app/src/generated/prisma ./src/generated/prisma
-COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
 COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
```

### Lesson

**When you fix a bug in one Dockerfile, check if the same bug exists in others.** We had two Dockerfiles with the same stale COPY line and only fixed one of them.

---

## Summary: The Full Timeline

| # | PR | Commit | Problem | Root Cause |
|---|-----|--------|---------|------------|
| 1 | — | `1f115da` | Middleware crashes on Edge Runtime | `auth()` imports Node.js-only modules (bcrypt, crypto) |
| 2 | — | `150954e` | App inaccessible in development | Middleware redirects everything to /login without a session |
| 3 | — | `8b2cb39` | Prisma seed/connect fails | Prisma 7 needs PrismaPg adapter; seed not configured |
| 4 | PR #1 | `2789e6a` | No standalone output for Docker | `output: "standalone"` missing from next.config.ts |
| 5 | PR #1 | `24677af` | Docker build fails on module tracing | Missing DATABASE_URL/NEXTAUTH_SECRET at build time |
| 6 | PR #1 | `24677af` | `prisma generate` crashes in Docker | `import "dotenv/config"` fails when no .env file exists |
| 7 | PR #3 | `417886b` | Docker COPY fails — path not found | Prisma v7 doesn't use `node_modules/.prisma` anymore |
| 8 | PR #1 | `2789e6a` | Railway health checks fail (redirect loop) | `/api/health` not in middleware public paths |
| 9 | PR #2 | `47fd749` | CI lint fails on generated code | `src/generated/` not in ESLint ignores |
| 10 | PR #2 | `47fd749` | CI lint fails on React anti-patterns | Math.random in render, components defined in components |
| 11 | PR #2 | `47fd749` | CI build fails without env vars | Same as #5 but in GitHub Actions instead of Docker |
| 12 | PR #4 | `2a014f3` | Railway stuck on old broken build | Webhook didn't trigger; needed manual push |
| 13 | — | UNFIXED | Worker Dockerfile has stale COPY | Same as #7 but in Dockerfile.worker |

**4 PRs. 13 issues. All for what should have been a "just deploy it" operation.**

---

## Checklist for Future Railway Deployments

Use this before deploying any new Next.js + Prisma app to Railway:

- [ ] `output: "standalone"` is set in `next.config.ts`
- [ ] Dockerfile has dummy `DATABASE_URL` and `NEXTAUTH_SECRET` in the builder stage
- [ ] No `import "dotenv/config"` in any file that runs during Docker build
- [ ] `COPY` directives reference the correct Prisma generated client path for your Prisma version
- [ ] All Dockerfiles (web AND worker) are consistent with each other
- [ ] Health check endpoint exists and returns 200
- [ ] Health check endpoint is whitelisted in auth middleware
- [ ] `src/generated/` (or wherever Prisma generates to) is in ESLint ignores
- [ ] CI workflow has the same placeholder env vars as the Dockerfile
- [ ] Middleware doesn't import any Node.js-only modules (runs on Edge Runtime)
- [ ] Dev-mode auth bypass exists in both middleware and tRPC context
- [ ] ESLint + TypeScript CI runs from day one, not as an afterthought
- [ ] Railway webhooks are verified working after connecting the repo
