ALTER TABLE "email_templates"
  ADD COLUMN IF NOT EXISTS "source_type" TEXT NOT NULL DEFAULT 'builder';
