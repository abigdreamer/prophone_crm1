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

# Restart PM2 (start if not yet running)
echo "🚀 Restarting PM2..."
pm2 describe prophone-server > /dev/null 2>&1 \
  && pm2 restart prophone-server \
  || pm2 start "$APP_DIR/server/index.js" --name prophone-server

pm2 describe prophone-client > /dev/null 2>&1 \
  && pm2 restart prophone-client \
  || pm2 start npx --name prophone-client -- serve -s "$APP_DIR/client/dist" -l 3000

pm2 save

echo "✅ Done! App is live."
pm2 status
