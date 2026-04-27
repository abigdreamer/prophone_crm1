ALTER TABLE "campaigns"
  ADD COLUMN IF NOT EXISTS "ab_subject_b"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "ab_template_id_b" UUID,
  ADD COLUMN IF NOT EXISTS "ab_html_snapshot" TEXT NOT NULL DEFAULT '';

ALTER TABLE "campaign_recipients"
  ADD COLUMN IF NOT EXISTS "ab_variant" TEXT NOT NULL DEFAULT 'A';
