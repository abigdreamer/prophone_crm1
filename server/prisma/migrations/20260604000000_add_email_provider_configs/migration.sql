CREATE TABLE IF NOT EXISTS "email_provider_configs" (
    "id"                 TEXT NOT NULL,
    "provider_name"      TEXT NOT NULL,
    "api_key_encrypted"  TEXT NOT NULL,
    "default_from_email" TEXT NOT NULL DEFAULT '',
    "default_from_name"  TEXT NOT NULL DEFAULT '',
    "is_active"          BOOLEAN NOT NULL DEFAULT false,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_provider_configs_provider_name_key"
    ON "email_provider_configs"("provider_name");
