#!/bin/bash
set -e  # exit immediately on any error

APP_DIR=~/prophone_crm1

echo "🔄 Restarting prophone_crm1..."

# Pull latest code
cd "$APP_DIR"
git pull

# Backend
echo "📦 Updating backend..."
cd "$APP_DIR/server"
npm install
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js   # ensure default users/company exist (safe to run repeatedly)

# Frontend
echo "🎨 Building frontend..."
cd "$APP_DIR/client"
npm install
NODE_ENV=production npm run build

# Restart via ecosystem config (ensures correct flags — e.g. serve -s for SPA routing)
echo "🚀 Restarting PM2..."
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "✅ Done! App is live."
pm2 status
