-- ─── ProPhone CRM — Database Schema (Supabase / SQL-only subset) ─────────────
--
-- WHEN TO USE THIS FILE
--   • Fresh Supabase project: run this in SQL Editor, then run seed.sql from this folder.
--   • Local or production DB managed by the Node server: use Prisma instead
--     (`server/prisma/schema.prisma` + `npx prisma migrate deploy`). Do NOT run this
--     file there — it only creates 4 tables, uses different ID types than Prisma, and
--     `drop table contacts` will fail if tables like `campaign_recipients` exist (FKs).
--
-- DIFF VS PRISMA MIGRATION (server/prisma/migrations/…)
--   • IDs: here = uuid + gen_random_uuid(); Prisma = text (no DB default on ids; app/SQL supplies values).
--   • Timestamps: here = timestamptz; Prisma = timestamp(3) without time zone.
--   • Missing here (present in Prisma): contact_groups, domains, email_templates,
--     interactive_sessions, campaigns, campaign_recipients, campaign_recipient_events;
--     contacts.contact_group_id.
--   • tags default: '{}' is fine for text[]; Prisma uses ARRAY[]::text[].
--
-- Steps (Supabase only):
--   1. Dashboard → SQL Editor → New Query → paste & run this file
--   2. Run seed.sql
--
-- RLS: statements at bottom disable RLS on these four tables for anon/service use.

-- Drop existing (child tables first)
drop table if exists activities;
drop table if exists contacts;
drop table if exists clients;
drop table if exists users;

-- ── Users (CRM team members) ───────────────────────────────────────────────────
create table users (
  id         text        primary key,
  name       text        not null,
  email      text unique not null,
  role       text        not null default 'Rep',
  avatar     text        not null default '',
  color      text        not null default '#6366f1',
  password   text        not null default 'demo',
  created_at timestamptz not null default now()
);

-- ── Client Accounts ────────────────────────────────────────────────────────────
create table clients (
  id         text primary key,
  name       text not null,
  domain     text not null default '',
  color      text not null default '#6366f1',
  industry   text not null default '',
  plan       text not null default 'Starter',
  mrr        integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── Contacts ───────────────────────────────────────────────────────────────────
create table contacts (
  id               uuid        primary key default gen_random_uuid(),
  pool             text        not null default 'prospect',
  client_id        text        references clients(id),
  first_name       text        not null,
  last_name        text        not null default '',
  email            text        not null default '',
  phone            text        not null default '',
  company          text        not null default '',
  title            text        not null default '',
  website          text        not null default '',
  city             text        not null default '',
  trucks           integer     not null default 0,
  lifecycle_stage  text        not null default 'new',
  lead_score       integer     not null default 0,
  status           text        not null default 'active',
  source           text        not null default '',
  campaign         text        not null default '',
  emails_sent      integer     not null default 0,
  emails_opened    integer     not null default 0,
  emails_clicked   integer     not null default 0,
  calls_made       integer     not null default 0,
  calls_answered   integer     not null default 0,
  last_activity_at timestamptz not null default now(),
  contract_value   integer     not null default 0,
  account_size     text        not null default '1-5',
  tags             text[]      not null default '{}',
  notes            text        not null default '',
  owned_by         text        not null default '',
  added_by         text        not null default '',
  created_at       timestamptz not null default now()
);

-- ── Activities ─────────────────────────────────────────────────────────────────
create table activities (
  id         uuid        primary key default gen_random_uuid(),
  contact_id uuid        not null references contacts(id) on delete cascade,
  type       text        not null,
  note       text        not null default '',
  by         text        not null default '',
  ts         timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
create index contacts_pool_client_idx on contacts(pool, client_id);
create index contacts_stage_idx       on contacts(lifecycle_stage);
create index contacts_activity_idx    on contacts(last_activity_at desc);
create index activities_contact_idx   on activities(contact_id);
create index activities_ts_idx        on activities(ts desc);

-- ── Disable RLS (required for anon key access without policies) ────────────────
alter table users      disable row level security;
alter table clients    disable row level security;
alter table contacts   disable row level security;
alter table activities disable row level security;
