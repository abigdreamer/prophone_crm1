-- Migration: add_custom_sort_filter_options
-- Adds two tables that power the admin-configurable sort and filter option lists.
--
--   custom_sort_options  — per-pool sort options shown in the sidebar sort dropdown.
--                          Built-in rows (is_built_in = true) are seeded by seed-sorts.js
--                          and can be toggled but not deleted.
--
--   custom_filter_options — per-pool filter options shown in the sidebar filter panel.
--                           Built-in rows (is_built_in = true) are seeded by seed-filters.js.
--                           filter_type values: TEXT | NUMBER | DROPDOWN | STAGE_SELECT | STATUS_SELECT
--
-- Both tables:
--   • clientId NULL  → prospect pool (shared across all clients)
--   • clientId set   → scoped to that client
--   • New clients get defaults auto-seeded via clients.controller.js → seedDefaultsForClient()

-- ─── custom_sort_options ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "custom_sort_options" (
    "id"           TEXT        NOT NULL,
    "client_id"    TEXT,
    "label"        TEXT        NOT NULL,
    "sort_value"   TEXT        NOT NULL DEFAULT '',
    "contact_field" TEXT       NOT NULL DEFAULT '',
    "direction"    TEXT        NOT NULL DEFAULT 'asc',
    "is_built_in"  BOOLEAN     NOT NULL DEFAULT false,
    "is_active"    BOOLEAN     NOT NULL DEFAULT true,
    "display_order" INTEGER    NOT NULL DEFAULT 0,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_sort_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "custom_sort_options_client_id_idx"
    ON "custom_sort_options"("client_id");

ALTER TABLE "custom_sort_options"
    ADD CONSTRAINT "custom_sort_options_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;  -- skip row-level check for existing rows during migration

-- ─── custom_filter_options ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "custom_filter_options" (
    "id"           TEXT        NOT NULL,
    "client_id"    TEXT,
    "label"        TEXT        NOT NULL,
    "contact_field" TEXT       NOT NULL,
    "filter_type"  TEXT        NOT NULL DEFAULT 'TEXT',
    "options"      JSONB       NOT NULL DEFAULT '[]',
    "is_built_in"  BOOLEAN     NOT NULL DEFAULT false,
    "is_active"    BOOLEAN     NOT NULL DEFAULT true,
    "display_order" INTEGER    NOT NULL DEFAULT 0,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_filter_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "custom_filter_options_client_id_idx"
    ON "custom_filter_options"("client_id");

ALTER TABLE "custom_filter_options"
    ADD CONSTRAINT "custom_filter_options_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;
