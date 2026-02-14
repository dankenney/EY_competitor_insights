#!/bin/bash
# setup.sh — One-shot setup for CCaSS Intelligence Engine
# Run this from Git Bash in your EY_competitor_insights folder
set -e

echo "=== CCaSS Setup Script ==="
echo ""

# 1. Remove nested clone if it exists
if [ -d "EY_competitor_insights" ]; then
  echo "[1/7] Removing nested clone directory..."
  rm -rf EY_competitor_insights
else
  echo "[1/7] No nested clone found (good)"
fi

# 2. Make sure we're on the right branch
echo "[2/7] Pulling latest code..."
git checkout claude/review-product-spec-ehH2A
git pull origin claude/review-product-spec-ehH2A

# 3. Clean install (removes node_modules and reinstalls fresh)
echo "[3/7] Clean installing dependencies..."
rm -rf node_modules package-lock.json
npm install

# 4. Start Docker containers
echo "[4/7] Starting Postgres + Redis..."
docker compose up -d

# 5. Wait for Postgres to be ready
echo "[5/7] Waiting for Postgres..."
sleep 5

# 6. Setup database
echo "[6/7] Setting up database..."
npx prisma generate
npx prisma db push
npx prisma db seed

# 7. Clear Next.js cache and start
echo "[7/7] Clearing cache..."
rm -rf .next

echo ""
echo "=== Setup complete! ==="
echo "Run 'npm run dev' to start the dev server"
echo "Then open http://localhost:3000"
