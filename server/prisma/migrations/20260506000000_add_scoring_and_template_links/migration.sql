-- Add points column to activities (non-breaking, default 0)
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;

-- Add composite index on activities for contact timeline queries
CREATE INDEX IF NOT EXISTS "activities_contact_id_ts_idx" ON "activities"("contact_id", "ts" DESC);

-- ── scoring_rules ────────────────────────────────────────────────────────────
CREATE TABLE "scoring_rules" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"        TEXT         NOT NULL,
    "description" TEXT         NOT NULL DEFAULT '',
    "points"      INTEGER      NOT NULL,
    "event"       TEXT         NOT NULL DEFAULT 'link_click',
    "is_active"   BOOLEAN      NOT NULL DEFAULT true,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scoring_rules_is_active_idx" ON "scoring_rules"("is_active");

-- ── template_links ───────────────────────────────────────────────────────────
CREATE TABLE "template_links" (
    "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
    "template_id"     UUID        NOT NULL,
    "client_id"       UUID,
    "url"             TEXT        NOT NULL,
    "label"           TEXT        NOT NULL DEFAULT '',
    "scoring_rule_id" UUID,
    "click_count"     INTEGER     NOT NULL DEFAULT 0,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "template_links_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "template_links_template_id_fkey"
        FOREIGN KEY ("template_id")
        REFERENCES "email_templates"("id")
        ON DELETE CASCADE,

    CONSTRAINT "template_links_client_id_fkey"
        FOREIGN KEY ("client_id")
        REFERENCES "clients"("id")
        ON DELETE SET NULL,

    CONSTRAINT "template_links_scoring_rule_id_fkey"
        FOREIGN KEY ("scoring_rule_id")
        REFERENCES "scoring_rules"("id")
        ON DELETE SET NULL
);

CREATE INDEX "template_links_template_id_idx" ON "template_links"("template_id");
CREATE INDEX "template_links_client_id_idx"   ON "template_links"("client_id");
