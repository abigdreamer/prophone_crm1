-- Add send_order and send_sequence_number to campaign_recipients
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "send_order" INTEGER;
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "send_sequence_number" INTEGER;

-- Add send_order_mode to campaign_queues
ALTER TABLE "campaign_queues" ADD COLUMN IF NOT EXISTS "send_order_mode" TEXT NOT NULL DEFAULT 'import_order';
