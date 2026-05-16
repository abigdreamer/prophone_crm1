-- Add from_email column to email_templates
ALTER TABLE "email_templates" ADD COLUMN "from_email" TEXT NOT NULL DEFAULT '';

-- Backfill from_email from body JSON for existing HTML templates
UPDATE "email_templates"
SET "from_email" = body->>'from'
WHERE body->>'from' IS NOT NULL AND body->>'from' != '';
