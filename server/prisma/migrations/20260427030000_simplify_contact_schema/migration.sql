-- Simplify contacts table: drop analytics fields, remove pool/client_id, make email nullable

ALTER TABLE "contacts"
  DROP COLUMN IF EXISTS "pool",
  DROP COLUMN IF EXISTS "client_id",
  DROP COLUMN IF EXISTS "emails_sent",
  DROP COLUMN IF EXISTS "emails_opened",
  DROP COLUMN IF EXISTS "emails_clicked",
  DROP COLUMN IF EXISTS "calls_made",
  DROP COLUMN IF EXISTS "calls_answered",
  DROP COLUMN IF EXISTS "lead_score",
  DROP COLUMN IF EXISTS "contract_value",
  DROP COLUMN IF EXISTS "account_size",
  DROP COLUMN IF EXISTS "trucks",
  DROP COLUMN IF EXISTS "campaign";

-- Make email nullable (was NOT NULL DEFAULT '')
ALTER TABLE "contacts"
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "email" DROP DEFAULT;
