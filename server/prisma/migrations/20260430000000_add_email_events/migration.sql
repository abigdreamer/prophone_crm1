CREATE TABLE IF NOT EXISTS "email_events" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "campaign_id"  UUID        NOT NULL,
  "recipient_id" UUID        NOT NULL,
  "event_type"   TEXT        NOT NULL,
  "url"          TEXT,
  "user_agent"   TEXT        NOT NULL DEFAULT '',
  "ip_address"   TEXT        NOT NULL DEFAULT '',
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_events_campaign_id_idx"  ON "email_events"("campaign_id");
CREATE INDEX IF NOT EXISTS "email_events_recipient_id_idx" ON "email_events"("recipient_id");
