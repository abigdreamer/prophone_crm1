-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: unified_activity_and_cancel_restore
--
-- Changes applied in this migration:
--   1. Refactor `activities` table — replace contact-only FK with a polymorphic
--      (entity_type, entity_id) pair so all entity types share one activity log.
--   2. Add soft-cancel/restore columns to `domains`.
--   3. Add soft-cancel/restore columns to `email_templates`.
--   4. Add soft-cancel/restore columns to `campaigns`.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. activities — polymorphic refactor ──────────────────────────────────────

-- Drop FK constraint that tied activities exclusively to contacts
ALTER TABLE "activities"
    DROP CONSTRAINT IF EXISTS "activities_contact_id_fkey";

-- Drop old single-column index on contact_id
DROP INDEX IF EXISTS "activities_contact_id_ts_idx";

-- Add the two new polymorphic columns with safe defaults before dropping the old one.
-- Existing rows will get entity_type='contact' and entity_id='' (unknown after drop).
-- NOTE: the contact_id values present at migration time are intentionally lost;
-- they were accepted as data-loss when db:push was run during development.
ALTER TABLE "activities"
    ADD COLUMN IF NOT EXISTS "entity_type" TEXT NOT NULL DEFAULT 'contact';

ALTER TABLE "activities"
    ADD COLUMN IF NOT EXISTS "entity_id"   TEXT NOT NULL DEFAULT '';

-- Back-fill entity_id from contact_id while it still exists (best-effort).
-- Rows where contact_id IS NULL (non-contact activities added after the code
-- change but before this migration) are left as '' and handled at app level.
UPDATE "activities"
    SET "entity_id" = "contact_id"
    WHERE "contact_id" IS NOT NULL
      AND "entity_id" = '';

-- Drop the old FK column
ALTER TABLE "activities"
    DROP COLUMN IF EXISTS "contact_id";

-- Create new composite index for efficient per-entity timeline queries
CREATE INDEX IF NOT EXISTS "activities_entity_type_entity_id_ts_idx"
    ON "activities"("entity_type", "entity_id", "ts" DESC);


-- ── 2. domains — soft-cancel / restore ───────────────────────────────────────

ALTER TABLE "domains"
    ADD COLUMN IF NOT EXISTS "is_canceled"   BOOLEAN     NOT NULL DEFAULT false;

ALTER TABLE "domains"
    ADD COLUMN IF NOT EXISTS "canceled_at"   TIMESTAMPTZ;

ALTER TABLE "domains"
    ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT        NOT NULL DEFAULT '';

ALTER TABLE "domains"
    ADD COLUMN IF NOT EXISTS "restored_at"   TIMESTAMPTZ;


-- ── 3. email_templates — soft-cancel / restore ────────────────────────────────

ALTER TABLE "email_templates"
    ADD COLUMN IF NOT EXISTS "is_canceled"   BOOLEAN     NOT NULL DEFAULT false;

ALTER TABLE "email_templates"
    ADD COLUMN IF NOT EXISTS "canceled_at"   TIMESTAMPTZ;

ALTER TABLE "email_templates"
    ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT        NOT NULL DEFAULT '';

ALTER TABLE "email_templates"
    ADD COLUMN IF NOT EXISTS "restored_at"   TIMESTAMPTZ;


-- ── 4. campaigns — soft-cancel / restore ──────────────────────────────────────

ALTER TABLE "campaigns"
    ADD COLUMN IF NOT EXISTS "is_canceled"   BOOLEAN     NOT NULL DEFAULT false;

ALTER TABLE "campaigns"
    ADD COLUMN IF NOT EXISTS "canceled_at"   TIMESTAMPTZ;

ALTER TABLE "campaigns"
    ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT        NOT NULL DEFAULT '';

ALTER TABLE "campaigns"
    ADD COLUMN IF NOT EXISTS "restored_at"   TIMESTAMPTZ;
