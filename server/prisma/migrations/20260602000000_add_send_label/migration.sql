-- Add send_label to campaign_recipients for batch identification
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "send_label" TEXT NOT NULL DEFAULT '';
