#!/bin/bash
set -e

APP_DIR=~/prophone_crm1

echo "🔄 Restarting prophone_crm1..."

# Update code
cd "$APP_DIR"
git pull

# Backend setup
echo "📦 Updating backend..."
cd "$APP_DIR/server"
npm install
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js

# Frontend build
echo "🎨 Building frontend..."
cd "$APP_DIR/client"
npm install
npm run build

# Restart PM2 safely
echo "🚀 Restarting PM2..."
cd "$APP_DIR"
pm2 delete ecosystem.config.cjs || true
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Deployment completed"
pm2 status