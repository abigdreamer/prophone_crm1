#!/bin/bash
set -e

APP_DIR=~/prophone_crm1

cd "$APP_DIR"
git pull

echo "Backend setup..."
cd "$APP_DIR/server"
npm ci
npx prisma generate
npx prisma migrate deploy

echo "Frontend build..."
cd "$APP_DIR/client"
npm ci
npm run build

echo "Restarting PM2..."
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

pm2 status

echo "Deployment completed"