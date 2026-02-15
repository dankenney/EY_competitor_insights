#!/bin/sh
set -e

echo "==> Pushing database schema..."
npx prisma db push --skip-generate --accept-data-loss 2>&1
echo "==> Schema push complete."

echo "==> Seeding database..."
node prisma/seed.cjs 2>&1 && echo "==> Seed complete." || echo "==> Seed finished (may already be seeded)."

echo "==> Starting application..."
exec node server.js
