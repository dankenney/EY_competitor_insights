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

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + generated client (needed at runtime for queries)
# In Prisma v7 the client is generated to src/generated/prisma (no node_modules/.prisma)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy pg and adapter-pg — marked as serverExternalPackages so Next.js
# standalone doesn't bundle them; they must exist in node_modules at runtime.
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=builder /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=builder /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=builder /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=builder /app/node_modules/postgres-interval ./node_modules/postgres-interval
COPY --from=builder /app/node_modules/split2 ./node_modules/split2
COPY --from=builder /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg
COPY --from=builder /app/node_modules/@prisma/driver-adapter-utils ./node_modules/@prisma/driver-adapter-utils

# Copy next-auth v5 and its @auth/* dependencies — beta package structure
# can confuse the Next.js standalone tracer
COPY --from=builder /app/node_modules/next-auth ./node_modules/next-auth
COPY --from=builder /app/node_modules/@auth ./node_modules/@auth

# Copy bcryptjs — used in credentials provider for password verification
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Copy prisma CLI for runtime schema push (db push on first deploy)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy bundled seed script (compiled from seed.ts during build)
COPY --from=builder /app/prisma/seed.cjs ./prisma/seed.cjs

# Copy entrypoint script
COPY --from=builder /app/scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
