import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const isSQLite = process.env.DATABASE_URL?.startsWith('file:');

const prisma = new PrismaClient();

const ago = (days = 0, hours = 0) =>
  new Date(Date.now() - (days * 86400 + hours * 3600) * 1000);

async function main() {
  const hashed = await bcrypt.hash('demo', 10);

  // ─── Users ──────────────────────────────────────────────────────────────────
  await prisma.user.createMany({
    ...(isSQLite ? {} : { skipDuplicates: true }),
    data: [
      { id: 'u1', name: 'Mike Johnson',  email: 'mike@geniusai.biz',  role: 'Admin',   avatar: 'MJ', color: '#6366f1', password: hashed },
      { id: 'u2', name: 'Sarah Lee',     email: 'sarah@geniusai.biz', role: 'Manager', avatar: 'SL', color: '#22c55e', password: hashed },
      { id: 'u3', name: 'James Davis',   email: 'james@geniusai.biz', role: 'Rep',     avatar: 'JD', color: '#f59e0b', password: hashed },
      { id: 'u4', name: 'Amy Wilson',    email: 'amy@geniusai.biz',   role: 'Rep',     avatar: 'AW', color: '#38bdf8', password: hashed },
    ],
  });

  // ─── Clients ────────────────────────────────────────────────────────────────
  await prisma.client.createMany({
    ...(isSQLite ? {} : { skipDuplicates: true }),
    data: [
      { id: 'foxtow',          name: 'FoxTow',           domain: 'foxtow.com',           color: '#fb923c', industry: 'Towing SaaS',       plan: 'Enterprise', mrr: 4800 },
      { id: 'sanpabloauto',    name: 'San Pablo Auto',   domain: 'sanpabloauto.com',     color: '#38bdf8', industry: 'Auto Repair',        plan: 'Pro',        mrr: 890  },
      { id: 'caliens',         name: 'Caliens',          domain: 'caliens.com',           color: '#c084fc', industry: 'Roadside Services',  plan: 'Pro',        mrr: 1200 },
      { id: 'certifiedtow',    name: 'CertifiedTow',     domain: 'certifiedtow.com',     color: '#4ade80', industry: 'Towing',             plan: 'Starter',    mrr: 320  },
      { id: 'roadsidewingman', name: 'Roadside Wingman', domain: 'roadsidewingman.com',  color: '#fbbf24', industry: 'VA Dispatch',        plan: 'Enterprise', mrr: 2600 },
    ],
  });

  // ─── Prospect contacts ───────────────────────────────────────────────────────
  const [john, maria, dave, tom, lisa] = await Promise.all([
    prisma.contact.create({ data: {
      pool: 'prospect', firstName: 'John',  lastName: 'Smith',   email: 'john@towpro.com',      phone: '(510) 555-1001',
      company: 'TowPro LLC',       title: 'Owner',          city: 'Oakland, CA',       trucks: 5,
      lifecycleStage: 'new',             leadScore: 15,  status: 'active', source: 'Website Form',
      contractValue: 0,    accountSize: '1-5',   ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(2),
    }}),
    prisma.contact.create({ data: {
      pool: 'prospect', firstName: 'Maria', lastName: 'Garcia',  email: 'maria@fastway.com',    phone: '(415) 555-2002',
      company: 'FastWay Towing',   title: 'Operations Mgr', city: 'San Francisco, CA', trucks: 8,
      lifecycleStage: 'contacted',       leadScore: 35,  status: 'active', source: 'Cold Outreach',
      contractValue: 0,    accountSize: '6-15',  ownedBy: 'Sarah Lee',    addedBy: 'Sarah Lee',    lastActivityAt: ago(5),
    }}),
    prisma.contact.create({ data: {
      pool: 'prospect', firstName: 'Dave',  lastName: 'Lee',     email: 'dave@bayauto.com',     phone: '(925) 555-3003',
      company: 'Bay Area Auto',    title: 'CEO',            city: 'Concord, CA',       trucks: 12,
      lifecycleStage: 'engaged',         leadScore: 58,  status: 'active', source: 'Referral',
      contractValue: 0,    accountSize: '6-15',  ownedBy: 'James Davis',  addedBy: 'James Davis',  lastActivityAt: ago(3),
    }}),
    prisma.contact.create({ data: {
      pool: 'prospect', firstName: 'Tom',   lastName: 'Brown',   email: 'tom@hwyrescue.com',    phone: '(510) 555-4004',
      company: 'Hwy Rescue Inc',   title: 'Owner',          city: 'Fremont, CA',       trucks: 20,
      lifecycleStage: 'demo_scheduled',  leadScore: 72,  status: 'active', source: 'Google Ad',
      contractValue: 3500, accountSize: '16-50', ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(1),
    }}),
    prisma.contact.create({ data: {
      pool: 'prospect', firstName: 'Lisa',  lastName: 'Chen',    email: 'lisa@cityfleet.com',   phone: '(408) 555-5005',
      company: 'City Fleet Svcs',  title: 'Fleet Manager',  city: 'San Jose, CA',      trucks: 35,
      lifecycleStage: 'proposal_sent',   leadScore: 85,  status: 'active', source: 'Conference',
      contractValue: 8500, accountSize: '16-50', ownedBy: 'Sarah Lee',    addedBy: 'Sarah Lee',    lastActivityAt: ago(0, 4),
    }}),
  ]);

  // ─── FoxTow client contacts ──────────────────────────────────────────────────
  // Spread across all pipeline stages so every filter tab has results
  const [brandon, jenny, ray, scott, nina, victor, priya, derek, carol, elena] =
    await Promise.all([
      // Customer ×3
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Brandon', lastName: 'Fox',      email: 'brandon@foxtow.com',   phone: '(510) 555-8001',
        company: 'FoxTow', title: 'CEO',            city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'customer',       leadScore: 95, status: 'active', source: 'Direct',
        contractValue: 4800, accountSize: '16-50',  ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(1),
      }}),
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Jenny',   lastName: 'Torres',   email: 'jenny@foxtow.com',     phone: '(510) 555-8002',
        company: 'FoxTow', title: 'Ops Manager',    city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'customer',       leadScore: 90, status: 'active', source: 'Direct',
        contractValue: 1200, accountSize: '16-50',  ownedBy: 'Sarah Lee',    addedBy: 'Sarah Lee',    lastActivityAt: ago(3),
      }}),
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Priya',   lastName: 'Shah',     email: 'priya@foxtow.com',     phone: '(510) 555-8007',
        company: 'FoxTow', title: 'Tech Lead',      city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'customer',       leadScore: 91, status: 'active', source: 'Direct',
        contractValue: 600,  accountSize: '16-50',  ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(1),
      }}),
      // Hot — negotiating ×1
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Victor',  lastName: 'Mendez',   email: 'victor@foxtow.com',    phone: '(510) 555-8006',
        company: 'FoxTow', title: 'Driver Lead',    city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'negotiating',    leadScore: 80, status: 'active', source: 'Direct',
        contractValue: 3200, accountSize: '16-50',  ownedBy: 'James Davis',  addedBy: 'James Davis',  lastActivityAt: ago(2),
      }}),
      // Warm — proposal_sent ×1, demo_done ×1
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Nina',    lastName: 'Castillo', email: 'nina@foxtow.com',      phone: '(510) 555-8005',
        company: 'FoxTow', title: 'Billing',        city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'proposal_sent',  leadScore: 77, status: 'active', source: 'Direct',
        contractValue: 2400, accountSize: '16-50',  ownedBy: 'Sarah Lee',    addedBy: 'Sarah Lee',    lastActivityAt: ago(4),
      }}),
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Elena',   lastName: 'Brooks',   email: 'elena@foxtow.com',     phone: '(510) 555-8010',
        company: 'FoxTow', title: 'Account Exec',   city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'demo_done',      leadScore: 68, status: 'active', source: 'Direct',
        contractValue: 0,    accountSize: '16-50',  ownedBy: 'James Davis',  addedBy: 'James Davis',  lastActivityAt: ago(0, 2),
      }}),
      // Leads — contacted ×1, engaged ×1
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Derek',   lastName: 'Wu',       email: 'derek@foxtow.com',     phone: '(510) 555-8008',
        company: 'FoxTow', title: 'Sales Rep',      city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'contacted',      leadScore: 38, status: 'active', source: 'Direct',
        contractValue: 0,    accountSize: '16-50',  ownedBy: 'Amy Wilson',   addedBy: 'Amy Wilson',   lastActivityAt: ago(6),
      }}),
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Ray',     lastName: 'Kim',      email: 'ray@foxtow.com',       phone: '(415) 555-8003',
        company: 'FoxTow', title: 'Dispatcher',     city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'engaged',        leadScore: 55, status: 'active', source: 'Direct',
        contractValue: 0,    accountSize: '16-50',  ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(5),
      }}),
      // Prospect — new ×1
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Carol',   lastName: 'Nguyen',   email: 'carol@foxtow.com',     phone: '(510) 555-8009',
        company: 'FoxTow', title: 'Support',        city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'new',            leadScore: 20, status: 'active', source: 'Direct',
        contractValue: 0,    accountSize: '16-50',  ownedBy: 'Sarah Lee',    addedBy: 'Sarah Lee',    lastActivityAt: ago(9),
      }}),
      // Lost ×1
      prisma.contact.create({ data: {
        pool: 'client', clientId: 'foxtow',
        firstName: 'Scott',   lastName: 'Harper',   email: 'scott@foxtow.com',     phone: '(510) 555-8004',
        company: 'FoxTow', title: 'Fleet Manager',  city: 'Oakland, CA',  trucks: 45,
        lifecycleStage: 'lost',           leadScore: 15, status: 'active', source: 'Direct',
        contractValue: 0,    accountSize: '16-50',  ownedBy: 'Amy Wilson',   addedBy: 'Amy Wilson',   lastActivityAt: ago(14),
      }}),
    ]);

  // ─── Activities ──────────────────────────────────────────────────────────────
  await prisma.activity.createMany({
    data: [
      // Prospects
      { entityType: 'contact', entityId: john.id,    type: 'form_submitted', note: 'Submitted demo request via website widget',   by: 'Mike Johnson', createdAt: ago(2) },
      { entityType: 'contact', entityId: maria.id,   type: 'form_submitted', note: 'Filled out contact form on pricing page',     by: 'Sarah Lee',    createdAt: ago(8) },
      { entityType: 'contact', entityId: maria.id,   type: 'email_sent',     note: 'Sequence: Welcome email sent',                by: 'Sarah Lee',    createdAt: ago(7) },
      { entityType: 'contact', entityId: maria.id,   type: 'call_made',      note: 'Cold call — left voicemail',                  by: 'Sarah Lee',    createdAt: ago(6) },
      { entityType: 'contact', entityId: maria.id,   type: 'stage_changed',  note: 'New → Contacted',                             by: 'Sarah Lee',    createdAt: ago(5) },
      { entityType: 'contact', entityId: dave.id,    type: 'call_made',      note: 'Intro call — discussed fleet pain points',    by: 'James Davis',  createdAt: ago(4) },
      { entityType: 'contact', entityId: dave.id,    type: 'stage_changed',  note: 'Contacted → Engaged',                         by: 'James Davis',  createdAt: ago(3) },
      { entityType: 'contact', entityId: tom.id,     type: 'demo_scheduled', note: 'Demo booked for next Tuesday at 2pm',         by: 'Mike Johnson', createdAt: ago(2) },
      { entityType: 'contact', entityId: lisa.id,    type: 'email_sent',     note: 'Proposal sent — $8,500/yr Enterprise plan',  by: 'Sarah Lee',    createdAt: ago(1) },
      // FoxTow contacts
      { entityType: 'contact', entityId: brandon.id, type: 'stage_changed',  note: 'Onboarded as customer',                       by: 'Mike Johnson', createdAt: ago(30) },
      { entityType: 'contact', entityId: brandon.id, type: 'call_made',      note: 'Quarterly check-in call',                     by: 'Mike Johnson', createdAt: ago(7)  },
      { entityType: 'contact', entityId: jenny.id,   type: 'email_sent',     note: 'Sent onboarding guide and training links',    by: 'Sarah Lee',    createdAt: ago(28) },
      { entityType: 'contact', entityId: jenny.id,   type: 'note_added',     note: 'Prefers Slack for communication',             by: 'Sarah Lee',    createdAt: ago(10) },
      { entityType: 'contact', entityId: ray.id,     type: 'call_made',      note: 'Support call — dispatcher training session',  by: 'Mike Johnson', createdAt: ago(5)  },
      { entityType: 'contact', entityId: priya.id,   type: 'email_sent',     note: 'API integration docs sent',                   by: 'Mike Johnson', createdAt: ago(3)  },
    ],
  });

  console.log('✓ Seed complete — users: 4, clients: 5, prospects: 5, foxtow contacts: 10 (mixed stages)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
