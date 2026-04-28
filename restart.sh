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
npx prisma generate
npx prisma migrate deploy

# Seed is best-effort — a failure must not abort deployment
echo "Seeding database (non-fatal)..."
node prisma/seed.js || echo "Seed skipped or partially failed — continuing deployment"

# Frontend build
echo "Frontend build..."
cd "$APP_DIR/client"
npm run build

# PM2 reload (zero downtime)
echo "Restarting services..."
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

# Status check
pm2 status

echo "Deployment completed successfully"