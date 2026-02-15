# ── Stage 1: Install dependencies ──────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# ── Stage 2: Build the Next.js application ───────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy env vars for build — Next.js traces server modules during build.
# pg.Pool is lazy (no actual connection), but modules must load cleanly.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL=${DATABASE_URL}
ARG NEXTAUTH_SECRET="build-secret-placeholder"
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ARG AUTH_SECRET="build-secret-placeholder"
ENV AUTH_SECRET=${AUTH_SECRET}

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Bundle seed script to plain JS so tsx is not needed at runtime.
# All package imports stay external — resolved from runner's node_modules.
RUN npx esbuild prisma/seed.ts \
    --bundle --platform=node --format=cjs --outfile=prisma/seed.cjs \
    --packages=external \
    --external:../src/generated/prisma

# Bundle prisma.config.ts to plain JS so the Prisma CLI can load it
# in the slim runner without TypeScript dev dependencies.
RUN npx esbuild prisma.config.ts \
    --bundle --platform=node --format=esm --outfile=prisma.config.mjs \
    --packages=external

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (includes server.js and a minimal node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy FULL node_modules from builder on top of standalone's minimal set.
# Prisma 7's CLI (db push) has 30+ hoisted transitive deps (c12, jiti,
# valibot, @prisma/dev, etc.) — cherry-picking them is fragile and breaks
# on every Prisma update. Copying the full tree is the only reliable approach.
# Docker COPY merges directories, so standalone's files are preserved.
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema + generated client (needed at runtime for queries)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

# Copy prisma config (compiled to JS) and package.json
COPY --from=builder /app/prisma.config.mjs ./prisma.config.mjs
COPY --from=builder /app/package.json ./package.json

# Copy bundled seed script (compiled from seed.ts during build)
COPY --from=builder /app/prisma/seed.cjs ./prisma/seed.cjs

# Copy entrypoint script
COPY --from=builder /app/scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
