-- Migration: update_contacts_schema
-- Removes the redundant lead_state column (lifecycleStage is the single source of truth)
-- and adds nine new business-profile fields to contacts.

-- Remove redundant column
ALTER TABLE "contacts" DROP COLUMN IF EXISTS "lead_state";

-- Add address fields
ALTER TABLE "contacts"
  ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "zip"   TEXT NOT NULL DEFAULT '';

-- Add business-profile fields
ALTER TABLE "contacts"
  ADD COLUMN IF NOT EXISTS "services_offered"       TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "motor_club_affiliations" TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "dispatcher_software"    TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "pain_points"            TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "est_annual_revenue"     TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "service_area_miles"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "years_in_business"      INTEGER NOT NULL DEFAULT 0;
