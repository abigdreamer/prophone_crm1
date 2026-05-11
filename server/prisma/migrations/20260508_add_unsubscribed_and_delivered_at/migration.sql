-- AlterTable: Add is_unsubscribed to contacts
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "is_unsubscribed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add delivered_at to campaign_recipients
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3);
