-- CreateTable: campaign_queues
CREATE TABLE "campaign_queues" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "daily_limit" INTEGER NOT NULL,
    "send_time" TEXT NOT NULL DEFAULT '09:00',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3),
    "estimated_end_at" TIMESTAMP(3),
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "total_sent" INTEGER NOT NULL DEFAULT 0,
    "current_day" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable: campaign_queue_runs
CREATE TABLE "campaign_queue_runs" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_queue_runs_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add queue_run_id to campaign_recipients
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "queue_run_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "campaign_queues_campaign_id_key" ON "campaign_queues"("campaign_id");
CREATE INDEX "campaign_queues_client_id_idx" ON "campaign_queues"("client_id");
CREATE INDEX "campaign_queue_runs_queue_id_idx" ON "campaign_queue_runs"("queue_id");
CREATE INDEX "campaign_queue_runs_scheduled_at_idx" ON "campaign_queue_runs"("scheduled_at");

-- AddForeignKey
ALTER TABLE "campaign_queues" ADD CONSTRAINT "campaign_queues_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_queues" ADD CONSTRAINT "campaign_queues_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_queue_runs" ADD CONSTRAINT "campaign_queue_runs_queue_id_fkey"
    FOREIGN KEY ("queue_id") REFERENCES "campaign_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_queue_run_id_fkey"
    FOREIGN KEY ("queue_run_id") REFERENCES "campaign_queue_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
