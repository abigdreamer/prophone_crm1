-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "domain_name" TEXT NOT NULL,
    "resend_domain_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "spf_record" TEXT NOT NULL DEFAULT '',
    "dkim_record" TEXT NOT NULL DEFAULT '',
    "dmarc_record" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domains_domain_name_key" ON "domains"("domain_name");
