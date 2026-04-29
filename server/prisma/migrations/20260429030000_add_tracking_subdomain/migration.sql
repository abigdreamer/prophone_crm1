ALTER TABLE "domains"
  ADD COLUMN IF NOT EXISTS "tracking_subdomain" TEXT NOT NULL DEFAULT '';
