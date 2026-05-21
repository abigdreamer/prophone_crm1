-- Add send_id to campaign_recipients
-- Populated by markRecipientSent() with a fresh UUID on every send so that
-- repeated sends of the same campaign to the same contact produce distinct
-- tracking groups. Cleared to NULL whenever a recipient is reset to 'pending'.
ALTER TABLE "campaign_recipients"
  ADD COLUMN "send_id" TEXT;

CREATE INDEX "campaign_recipients_send_id_idx"
  ON "campaign_recipients" ("send_id");

-- Add send_id to campaign_recipient_events
-- Written by applyTrackingEvent(); copied from the recipient row at the time
-- the open/click fires. For legacy rows where send_id is NULL the analytics
-- layer derives an effective send_id from: recipient.send_id → recipient.message_id
-- → recipient.id, ensuring backward compatibility without modifying stored events.
ALTER TABLE "campaign_recipient_events"
  ADD COLUMN "send_id" TEXT;

CREATE INDEX "campaign_recipient_events_send_id_idx"
  ON "campaign_recipient_events" ("send_id");
