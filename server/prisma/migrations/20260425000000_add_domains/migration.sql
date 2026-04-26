-- CreateTable
CREATE TABLE "domains" (
    "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
    "prophone_id"      TEXT         NOT NULL,
    "domain"           TEXT         NOT NULL,
    "resend_domain_id" TEXT,
    "status"           TEXT         NOT NULL DEFAULT 'pending',
    "dns_records"      JSONB,
    "region"           TEXT         NOT NULL DEFAULT 'us-east-1',
    "verified_at"      TIMESTAMP(3),
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domains_prophone_id_domain_key" ON "domains"("prophone_id", "domain");

-- CreateIndex
CREATE INDEX "domains_prophone_id_idx" ON "domains"("prophone_id");
