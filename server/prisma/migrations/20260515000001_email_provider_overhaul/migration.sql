-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: email_provider_overhaul
--
-- Changes:
--   1. domains      — add provider, provider_domain_id, sender_name,
--                     sender_prefix; make resend_domain_id nullable
--   2. campaigns    — add provider column
--   3. campaign_recipients — add provider column
--   4. provider_settings  — new table for encrypted API keys
--   5. email_events       — new table for unified normalized email events
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. domains ────────────────────────────────────────────────────────────────

ALTER TABLE "domains"
    ADD COLUMN IF NOT EXISTS "provider"            TEXT NOT NULL DEFAULT 'resend',
    ADD COLUMN IF NOT EXISTS "provider_domain_id"  TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "sender_name"         TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "sender_prefix"       TEXT NOT NULL DEFAULT 'noreply';

-- resend_domain_id may now be empty for Brevo domains — ensure it has a default
ALTER TABLE "domains"
    ALTER COLUMN "resend_domain_id" SET DEFAULT '';

-- Back-fill existing rows: copy resend_domain_id → provider_domain_id
UPDATE "domains"
SET "provider_domain_id" = "resend_domain_id"
WHERE "provider_domain_id" = '' AND "resend_domain_id" <> '';

CREATE INDEX IF NOT EXISTS "domains_provider_idx" ON "domains"("provider");

-- ── 2. campaigns ──────────────────────────────────────────────────────────────

ALTER TABLE "campaigns"
    ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'resend';

-- ── 3. campaign_recipients ────────────────────────────────────────────────────

ALTER TABLE "campaign_recipients"
    ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'resend';

-- ── 4. provider_settings ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "provider_settings" (
    "provider"                TEXT        NOT NULL,
    "encrypted_api_key"       TEXT        NOT NULL DEFAULT '',
    "encrypted_webhook_secret" TEXT       NOT NULL DEFAULT '',
    "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "provider_settings_pkey" PRIMARY KEY ("provider")
);

-- ── 5. email_events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "email_events" (
    "id"                  TEXT        NOT NULL,
    "campaign_id"         TEXT,
    "recipient_id"        TEXT,
    "provider_message_id" TEXT,
    "recipient_email"     TEXT        NOT NULL DEFAULT '',
    "provider"            TEXT        NOT NULL DEFAULT '',
    "event"               TEXT        NOT NULL,
    "occurred_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "metadata"            JSONB,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_events_provider_message_id_idx" ON "email_events"("provider_message_id");
CREATE INDEX IF NOT EXISTS "email_events_campaign_id_idx"         ON "email_events"("campaign_id");
CREATE INDEX IF NOT EXISTS "email_events_recipient_id_idx"        ON "email_events"("recipient_id");
