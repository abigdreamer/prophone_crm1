-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_system_settings
--
-- Adds `system_settings` table for global (non-client-scoped) configuration
-- such as the active email provider. Using a separate table avoids the Prisma
-- limitation where null values cannot be used in composite unique-constraint
-- WHERE clauses (as in tenant_settings where clientId is nullable).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "system_settings" (
    "module"     TEXT        NOT NULL,
    "config"     JSONB       NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("module")
);
