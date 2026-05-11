-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: contact_social_and_tenant_settings
--
-- Changes:
--   1. Add `description` and `social_links` columns to contacts.
--   2. Create `tenant_settings` table for per-client module configuration.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. contacts — description + social links ──────────────────────────────────

ALTER TABLE "contacts"
    ADD COLUMN IF NOT EXISTS "description"   TEXT  NOT NULL DEFAULT '';

ALTER TABLE "contacts"
    ADD COLUMN IF NOT EXISTS "social_links"  JSONB NOT NULL DEFAULT '{}';


-- ── 2. tenant_settings — flexible per-client module config ───────────────────

CREATE TABLE IF NOT EXISTS "tenant_settings" (
    "id"         TEXT        NOT NULL,
    "client_id"  TEXT,
    "module"     TEXT        NOT NULL,
    "config"     JSONB       NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_settings_client_id_module_key" UNIQUE ("client_id", "module")
);

CREATE INDEX IF NOT EXISTS "tenant_settings_client_id_idx"
    ON "tenant_settings"("client_id");
