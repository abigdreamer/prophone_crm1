-- Make prophone_id nullable on users so super_admin can exist without a company.
-- Drop the existing NOT NULL FK constraint, alter the column, then re-add the FK
-- as optional (NULLs allowed). admin/rep enforcement is handled at the app layer.

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_prophone_id_fkey";

ALTER TABLE "users" ALTER COLUMN "prophone_id" DROP NOT NULL;

ALTER TABLE "users"
  ADD CONSTRAINT "users_prophone_id_fkey"
  FOREIGN KEY ("prophone_id")
  REFERENCES "company_profiles"("prophone_id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
