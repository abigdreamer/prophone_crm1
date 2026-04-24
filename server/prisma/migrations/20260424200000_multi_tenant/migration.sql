-- Multi-tenant: add company_profiles table, add prophone_id to users/contacts,
-- rename tenant_id → prophone_id in email_templates.

-- ── 1. Company profiles ────────────────────────────────────────────────────────
CREATE TABLE "company_profiles" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "prophone_id" TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "website"     TEXT         NOT NULL DEFAULT '',
    "city"        TEXT         NOT NULL DEFAULT '',
    "address"     TEXT         NOT NULL DEFAULT '',
    "phone"       TEXT         NOT NULL DEFAULT '',
    "industry"    TEXT         NOT NULL DEFAULT '',
    "plan"        TEXT         NOT NULL DEFAULT 'starter',
    "notes"       TEXT         NOT NULL DEFAULT '',
    "metadata"    JSONB        NOT NULL DEFAULT '{}',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_profiles_prophone_id_key" ON "company_profiles"("prophone_id");

-- ── 2. Add prophone_id to users ────────────────────────────────────────────────
-- Allow NULL initially so existing rows don't violate constraint immediately.
ALTER TABLE "users" ADD COLUMN "prophone_id" TEXT;

-- ── 3. Add prophone_id to contacts ────────────────────────────────────────────
ALTER TABLE "contacts" ADD COLUMN "prophone_id" TEXT;

-- ── 4. Rename tenant_id → prophone_id in email_templates ──────────────────────
ALTER TABLE "email_templates" RENAME COLUMN "tenant_id" TO "prophone_id";

-- Drop old index and recreate with new column name
DROP INDEX IF EXISTS "email_templates_tenant_id_updated_at_idx";
CREATE INDEX "email_templates_prophone_id_updated_at_idx"
    ON "email_templates"("prophone_id", "updated_at" DESC);

-- ── 5. Add index on users.prophone_id and contacts.prophone_id ────────────────
CREATE INDEX "users_prophone_id_idx"    ON "users"("prophone_id");
CREATE INDEX "contacts_prophone_id_idx" ON "contacts"("prophone_id");

-- ── NOTE ───────────────────────────────────────────────────────────────────────
-- After running this migration:
-- 1. Seed at least one row in company_profiles (e.g. INSERT INTO company_profiles ...)
-- 2. UPDATE users SET prophone_id = '<your-id>' WHERE prophone_id IS NULL
-- 3. UPDATE contacts SET prophone_id = '<your-id>' WHERE prophone_id IS NULL
-- 4. Then run: ALTER TABLE users ALTER COLUMN prophone_id SET NOT NULL;
--              ALTER TABLE contacts ALTER COLUMN prophone_id SET NOT NULL;
-- 5. Add FK: ALTER TABLE users    ADD CONSTRAINT "users_prophone_id_fkey"    FOREIGN KEY ("prophone_id") REFERENCES "company_profiles"("prophone_id");
--            ALTER TABLE contacts ADD CONSTRAINT "contacts_prophone_id_fkey" FOREIGN KEY ("prophone_id") REFERENCES "company_profiles"("prophone_id");
