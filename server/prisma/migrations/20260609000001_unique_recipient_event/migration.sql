-- Deduplicate campaign_recipient_events before adding unique constraint.
-- Keep the earliest event row for each (recipient_id, event) pair;
-- delete any later duplicates that were created by concurrent webhook requests.
DELETE FROM "campaign_recipient_events"
WHERE "id" NOT IN (
  SELECT DISTINCT ON ("recipient_id", "event") "id"
  FROM "campaign_recipient_events"
  ORDER BY "recipient_id", "event", "created_at" ASC
);

-- Enforce one event row per (recipient, event_type) at the database level.
-- This prevents race-condition duplicates even if application-level dedup is bypassed.
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_recipient_events_recipient_id_event_key"
  ON "campaign_recipient_events" ("recipient_id", "event");
