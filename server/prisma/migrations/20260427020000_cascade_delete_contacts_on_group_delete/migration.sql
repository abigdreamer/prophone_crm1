-- Change contacts.group_id FK from SET NULL to CASCADE
-- When a contact group is deleted, all contacts in that group are deleted too.

ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "contacts_group_id_fkey";
ALTER TABLE "contacts"
    ADD CONSTRAINT "contacts_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "contact_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
