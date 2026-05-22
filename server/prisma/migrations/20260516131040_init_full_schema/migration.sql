-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Rep',
    "avatar" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "industry" TEXT NOT NULL DEFAULT '',
    "plan" TEXT NOT NULL DEFAULT 'Starter',
    "mrr" INTEGER NOT NULL DEFAULT 0,
    "is_canceled" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "canceled_by" TEXT NOT NULL DEFAULT '',
    "cancel_reason" TEXT NOT NULL DEFAULT '',
    "restored_at" TIMESTAMP(3),
    "restored_by" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_groups" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "pool" TEXT NOT NULL DEFAULT 'prospect',
    "client_id" TEXT,
    "contact_group_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "trucks" INTEGER NOT NULL DEFAULT 0,
    "lifecycle_stage" TEXT NOT NULL DEFAULT 'new',
    "lead_state" TEXT NOT NULL DEFAULT 'prospect',
    "lead_score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "emails_sent" INTEGER NOT NULL DEFAULT 0,
    "emails_opened" INTEGER NOT NULL DEFAULT 0,
    "emails_clicked" INTEGER NOT NULL DEFAULT 0,
    "calls_made" INTEGER NOT NULL DEFAULT 0,
    "calls_answered" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contract_value" INTEGER NOT NULL DEFAULT 0,
    "account_size" TEXT NOT NULL DEFAULT '1-5',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "owned_by" TEXT NOT NULL DEFAULT '',
    "added_by" TEXT NOT NULL DEFAULT '',
    "is_canceled" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "canceled_by" TEXT NOT NULL DEFAULT '',
    "cancel_reason" TEXT NOT NULL DEFAULT '',
    "restored_at" TIMESTAMP(3),
    "restored_by" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'contact',
    "entity_id" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "by" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "domain_name" TEXT NOT NULL,
    "resend_domain_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "default_from_email" TEXT NOT NULL DEFAULT '',
    "spf_record" TEXT NOT NULL DEFAULT '',
    "dkim_record" TEXT NOT NULL DEFAULT '',
    "dmarc_record" TEXT NOT NULL DEFAULT '',
    "is_canceled" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT NOT NULL DEFAULT '',
    "restored_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "body" JSONB NOT NULL DEFAULT '{"blocks": [], "version": 1}',
    "html_output" TEXT NOT NULL DEFAULT '',
    "tracked_links" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_canceled" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT NOT NULL DEFAULT '',
    "restored_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL,
    "event" TEXT NOT NULL DEFAULT 'link_click',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_links" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "client_id" TEXT,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "scoring_rule_id" TEXT,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'regular',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "template_id" TEXT,
    "template_id_b" TEXT,
    "subject" TEXT NOT NULL DEFAULT '',
    "subject_b" TEXT NOT NULL DEFAULT '',
    "from_name" TEXT NOT NULL DEFAULT '',
    "from_email" TEXT NOT NULL DEFAULT '',
    "sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "recipients_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "opened_count" INTEGER NOT NULL DEFAULT 0,
    "clicked_count" INTEGER NOT NULL DEFAULT 0,
    "bounced_count" INTEGER NOT NULL DEFAULT 0,
    "unsubscribed_count" INTEGER NOT NULL DEFAULT 0,
    "is_canceled" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT NOT NULL DEFAULT '',
    "restored_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "ab_variant" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_recipient_events" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_recipient_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactive_sessions" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT,
    "template_id" TEXT,
    "block_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "token" TEXT NOT NULL,
    "response" JSONB,
    "responded_at" TIMESTAMP(3),
    "score_given" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interactive_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_field_settings" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "module" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_field_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posthog_projects" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posthog_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "contact_groups_client_id_idx" ON "contact_groups"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_groups_client_id_name_key" ON "contact_groups"("client_id", "name");

-- CreateIndex
CREATE INDEX "activities_entity_type_entity_id_created_at_idx" ON "activities"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "domains_domain_name_key" ON "domains"("domain_name");

-- CreateIndex
CREATE INDEX "email_templates_client_id_idx" ON "email_templates"("client_id");

-- CreateIndex
CREATE INDEX "scoring_rules_is_active_idx" ON "scoring_rules"("is_active");

-- CreateIndex
CREATE INDEX "template_links_template_id_idx" ON "template_links"("template_id");

-- CreateIndex
CREATE INDEX "template_links_client_id_idx" ON "template_links"("client_id");

-- CreateIndex
CREATE INDEX "campaigns_client_id_idx" ON "campaigns"("client_id");

-- CreateIndex
CREATE INDEX "campaign_recipients_campaign_id_idx" ON "campaign_recipients"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_recipients_campaign_id_contact_id_key" ON "campaign_recipients"("campaign_id", "contact_id");

-- CreateIndex
CREATE INDEX "campaign_recipient_events_recipient_id_idx" ON "campaign_recipient_events"("recipient_id");

-- CreateIndex
CREATE INDEX "campaign_recipient_events_campaign_id_idx" ON "campaign_recipient_events"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "interactive_sessions_token_key" ON "interactive_sessions"("token");

-- CreateIndex
CREATE INDEX "interactive_sessions_contact_id_idx" ON "interactive_sessions"("contact_id");

-- CreateIndex
CREATE INDEX "interactive_sessions_template_id_idx" ON "interactive_sessions"("template_id");

-- CreateIndex
CREATE INDEX "contact_field_settings_client_id_idx" ON "contact_field_settings"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_field_settings_client_id_module_key" ON "contact_field_settings"("client_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "posthog_projects_key_key" ON "posthog_projects"("key");

-- AddForeignKey
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contact_group_id_fkey" FOREIGN KEY ("contact_group_id") REFERENCES "contact_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_links" ADD CONSTRAINT "template_links_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_links" ADD CONSTRAINT "template_links_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_links" ADD CONSTRAINT "template_links_scoring_rule_id_fkey" FOREIGN KEY ("scoring_rule_id") REFERENCES "scoring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipient_events" ADD CONSTRAINT "campaign_recipient_events_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "campaign_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
