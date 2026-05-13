-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_contact_lead_state
--
-- Changes:
--   1. Add `lead_state` column to contacts.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. contacts — lead_state ──────────────────────────────────────────────────

ALTER TABLE "contacts"
    ADD COLUMN IF NOT EXISTS "lead_state" TEXT NOT NULL DEFAULT 'prospect';
