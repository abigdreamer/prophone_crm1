-- Remove duplicate campaign_recipient_events rows before adding unique constraint.
-- Keeps the earliest event per (recipient_id, event) pair; deletes all later duplicates.
-- Run this once before `npm run db:push` when the unique constraint is being added.
DELETE FROM "campaign_recipient_events"
WHERE "id" NOT IN (
  SELECT DISTINCT ON ("recipient_id", "event") "id"
  FROM "campaign_recipient_events"
  ORDER BY "recipient_id", "event", "created_at" ASC
);
