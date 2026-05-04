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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "trucks" INTEGER NOT NULL DEFAULT 0,
    "lifecycle_stage" TEXT NOT NULL DEFAULT 'new',
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
    "notes" TEXT NOT NULL DEFAULT '',
    "owned_by" TEXT NOT NULL DEFAULT '',
    "added_by" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contact_group_id" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "by" TEXT NOT NULL DEFAULT '',
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "contact_groups_client_id_idx" ON "contact_groups"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_groups_client_id_name_key" ON "contact_groups"("client_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "domains_domain_name_key" ON "domains"("domain_name");

-- CreateIndex
CREATE INDEX "email_templates_client_id_idx" ON "email_templates"("client_id");

-- AddForeignKey
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contact_group_id_fkey" FOREIGN KEY ("contact_group_id") REFERENCES "contact_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
