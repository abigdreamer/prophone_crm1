CREATE TABLE IF NOT EXISTS "campaign_recipient_events" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "recipient_id" UUID         NOT NULL,
  "campaign_id"  UUID         NOT NULL,
  "event"        TEXT         NOT NULL,
  "occurred_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata"     JSONB,
  CONSTRAINT "campaign_recipient_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_recipient_events_recipient_id_fkey"
    FOREIGN KEY ("recipient_id") REFERENCES "campaign_recipients"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "campaign_recipient_events_recipient_id_idx"     ON "campaign_recipient_events"("recipient_id");
CREATE INDEX IF NOT EXISTS "campaign_recipient_events_campaign_id_event_idx" ON "campaign_recipient_events"("campaign_id", "event");
