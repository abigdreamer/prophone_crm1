-- Unified audit log for contact/client lifecycle events (CREATE, UPDATE, CANCEL, RESTORE).
-- No FK to entities intentionally — history is preserved even if the entity is deleted.

CREATE TABLE "client_activities" (
    "id"           TEXT        NOT NULL,
    "entity_type"  TEXT        NOT NULL DEFAULT 'contact',
    "entity_id"    TEXT        NOT NULL,
    "action"       TEXT        NOT NULL,
    "performed_by" TEXT        NOT NULL DEFAULT '',
    "metadata"     JSONB       NOT NULL DEFAULT '{}',
    "ts"           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "client_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_activities_entity_id_ts_idx" ON "client_activities"("entity_id", "ts" DESC);
CREATE INDEX "client_activities_action_idx"        ON "client_activities"("action");

-- Client cancellation tracking fields

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "is_canceled"   BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "canceled_at"   TIMESTAMPTZ;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "canceled_by"   TEXT        NOT NULL DEFAULT '';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT        NOT NULL DEFAULT '';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "restored_at"   TIMESTAMPTZ;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "restored_by"   TEXT        NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "clients_is_canceled_idx" ON "clients"("is_canceled");
