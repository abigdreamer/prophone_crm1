#!/bin/bash
set -e

APP_DIR=~/prophone_crm1

echo "🔄 Starting deployment..."

# Pull latest code
cd "$APP_DIR"
git pull

# Backend setup
echo "📦 Backend setup..."
cd "$APP_DIR/server"
npm ci
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js

# Frontend build
echo "🎨 Frontend build..."
cd "$APP_DIR/client"
npm ci
npm run build

# PM2 reload (zero downtime)
echo "🚀 Restarting services..."
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

# Status check
pm2 status

echo "✅ Deployment completed successfully"