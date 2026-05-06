-- Add cancellation tracking fields to contacts

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "is_canceled"   BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "canceled_at"   TIMESTAMPTZ;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "canceled_by"   TEXT        NOT NULL DEFAULT '';
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT        NOT NULL DEFAULT '';
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "restored_at"   TIMESTAMPTZ;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "restored_by"   TEXT        NOT NULL DEFAULT '';

-- Index for fast lookup of canceled contacts per pool/client
CREATE INDEX IF NOT EXISTS "contacts_is_canceled_idx" ON "contacts"("is_canceled");
