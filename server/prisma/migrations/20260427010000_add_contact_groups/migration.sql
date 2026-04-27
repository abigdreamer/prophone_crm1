-- Add contact_groups table and group_id column on contacts

CREATE TABLE IF NOT EXISTS "contact_groups" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "prophone_id" TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "created_by"  TEXT         NOT NULL DEFAULT '',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "contact_groups_prophone_id_name_key"
    ON "contact_groups"("prophone_id", "name");

CREATE INDEX IF NOT EXISTS "contact_groups_prophone_id_idx"
    ON "contact_groups"("prophone_id");

ALTER TABLE "contacts"
    ADD COLUMN IF NOT EXISTS "group_id" UUID;

CREATE INDEX IF NOT EXISTS "contacts_group_id_idx"
    ON "contacts"("group_id");

ALTER TABLE "contacts"
    DROP CONSTRAINT IF EXISTS "contacts_group_id_fkey";
ALTER TABLE "contacts"
    ADD CONSTRAINT "contacts_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "contact_groups"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_groups"
    DROP CONSTRAINT IF EXISTS "contact_groups_prophone_id_fkey";
ALTER TABLE "contact_groups"
    ADD CONSTRAINT "contact_groups_prophone_id_fkey"
    FOREIGN KEY ("prophone_id") REFERENCES "company_profiles"("prophone_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
