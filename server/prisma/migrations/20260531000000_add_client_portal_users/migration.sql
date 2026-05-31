-- CreateTable: client_users
-- Adds a new ClientUser model for multi-tenant client portal authentication.
-- Each row represents a portal login credential for a specific client company.
-- Clients log in with username+password and can only see their own company data.

CREATE TABLE "client_users" (
    "id"         TEXT NOT NULL,
    "client_id"  TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "email"      TEXT,
    "username"   TEXT NOT NULL,
    "password"   TEXT NOT NULL,
    "role"       TEXT NOT NULL DEFAULT 'viewer',
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_users_username_key" ON "client_users"("username");

-- CreateIndex
CREATE INDEX "client_users_client_id_idx" ON "client_users"("client_id");

-- AddForeignKey
ALTER TABLE "client_users"
    ADD CONSTRAINT "client_users_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
