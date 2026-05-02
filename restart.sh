#!/bin/bash
set -e

APP_DIR=~/prophone_crm1

echo "Starting deployment..."

# Pull latest code
cd "$APP_DIR"
git pull

# Backend setup
echo "Backend setup..."
cd "$APP_DIR/server"
npm ci
npx prisma generate
npx prisma migrate deploy

# Seed is best-effort — a failure must not abort deployment
echo "Seeding database (non-fatal)..."
node prisma/seed.js || echo "Seed skipped or partially failed — continuing deployment"

# Frontend build
echo "Frontend build..."
cd "$APP_DIR/client"
npm ci
npm run build

# PM2 reload (zero downtime)
echo "Restarting services..."
cd "$APP_DIR"

# Delete stale process if it exists with a wrong config, then reload clean
pm2 delete prophone 2>/dev/null || true
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

# Status check
pm2 status

echo "Deployment completed successfully"
