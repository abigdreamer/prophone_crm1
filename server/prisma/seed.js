import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ago = (days = 0, hours = 0) =>
  new Date(Date.now() - (days * 86400 + hours * 3600) * 1000);

async function main() {
  const hashed = await bcrypt.hash('demo', 10);

  await prisma.user.createMany({
    skipDuplicates: true,
    data: [
      { id: 'u1', name: 'Mike Johnson', email: 'mike@geniusai.biz', role: 'Admin', avatar: 'MJ', color: '#6366f1', password: hashed },
      { id: 'u2', name: 'Sarah Lee', email: 'sarah@geniusai.biz', role: 'Manager', avatar: 'SL', color: '#22c55e', password: hashed },
      { id: 'u3', name: 'James Davis', email: 'james@geniusai.biz', role: 'Rep', avatar: 'JD', color: '#f59e0b', password: hashed },
      { id: 'u4', name: 'Amy Wilson', email: 'amy@geniusai.biz', role: 'Rep', avatar: 'AW', color: '#38bdf8', password: hashed },
    ],
  });

  await prisma.client.createMany({
    data: [
      { id: 'foxtow', name: 'FoxTow', domain: 'foxtow.com', color: '#fb923c', industry: 'Towing SaaS', plan: 'Enterprise', mrr: 4800 },
      { id: 'sanpabloauto', name: 'San Pablo Auto', domain: 'sanpabloauto.com', color: '#38bdf8', industry: 'Auto Repair', plan: 'Pro', mrr: 890 },
      { id: 'caliens', name: 'Caliens', domain: 'caliens.com', color: '#c084fc', industry: 'Roadside Services', plan: 'Pro', mrr: 1200 },
      { id: 'certifiedtow', name: 'CertifiedTow', domain: 'certifiedtow.com', color: '#4ade80', industry: 'Towing', plan: 'Starter', mrr: 320 },
      { id: 'roadsidewingman', name: 'Roadside Wingman', domain: 'roadsidewingman.com', color: '#fbbf24', industry: 'VA Dispatch', plan: 'Enterprise', mrr: 2600 },
    ],
  });

  const [john, maria, dave, tom, lisa, chris, nadia, brian, amyn, kevin] =
    await Promise.all([
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'John', lastName: 'Smith', email: 'john@towpro.com', phone: '(510) 555-1001', company: 'TowPro LLC', title: 'Owner', city: 'Oakland, CA', trucks: 5, lifecycleStage: 'new', leadScore: 15, status: 'active', source: 'Website Form', contractValue: 0, accountSize: '1-5', ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(2) } }),
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'Maria', lastName: 'Garcia', email: 'maria@fastway.com', phone: '(415) 555-2002', company: 'FastWay Towing', title: 'Operations Mgr', city: 'San Francisco, CA', trucks: 8, lifecycleStage: 'contacted', leadScore: 35, status: 'active', source: 'Cold Outreach', contractValue: 0, accountSize: '6-15', ownedBy: 'Sarah Lee', addedBy: 'Sarah Lee', lastActivityAt: ago(5) } }),
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'Dave', lastName: 'Lee', email: 'dave@bayauto.com', phone: '(925) 555-3003', company: 'Bay Area Auto', title: 'CEO', city: 'Concord, CA', trucks: 12, lifecycleStage: 'engaged', leadScore: 58, status: 'active', source: 'Referral', contractValue: 0, accountSize: '6-15', ownedBy: 'James Davis', addedBy: 'James Davis', lastActivityAt: ago(3) } }),
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'Tom', lastName: 'Brown', email: 'tom@hwyrescue.com', phone: '(510) 555-4004', company: 'Hwy Rescue Inc', title: 'Owner', city: 'Fremont, CA', trucks: 20, lifecycleStage: 'demo_scheduled', leadScore: 72, status: 'active', source: 'Google Ad', contractValue: 3500, accountSize: '16-50', ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(1) } }),
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'Lisa', lastName: 'Chen', email: 'lisa@cityfleet.com', phone: '(408) 555-5005', company: 'City Fleet Svcs', title: 'Fleet Manager', city: 'San Jose, CA', trucks: 35, lifecycleStage: 'proposal_sent', leadScore: 85, status: 'active', source: 'Conference', contractValue: 8500, accountSize: '16-50', ownedBy: 'Sarah Lee', addedBy: 'Sarah Lee', lastActivityAt: ago(0, 4) } }),
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'Chris', lastName: 'Walker', email: 'chris@pacific.com', phone: '(650) 555-6006', company: 'Pacific Tow', title: 'Owner', city: 'Daly City, CA', trucks: 6, lifecycleStage: 'customer', leadScore: 95, status: 'active', source: 'Website Form', contractValue: 4800, accountSize: '6-15', ownedBy: 'Amy Wilson', addedBy: 'Amy Wilson', lastActivityAt: ago(0, 6) } }),
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'Nadia', lastName: 'Patel', email: 'nadia@elite.com', phone: '(510) 555-7007', company: 'Elite Drive', title: 'Director', city: 'Oakland, CA', trucks: 3, lifecycleStage: 'lost', leadScore: 20, status: 'active', source: 'Cold Email', contractValue: 0, accountSize: '1-5', ownedBy: 'James Davis', addedBy: 'James Davis', lastActivityAt: ago(10) } }),
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'Brian', lastName: 'Torres', email: 'brian@caltow.com', phone: '(707) 555-8008', company: 'Cal Tow Services', title: 'Manager', city: 'Sacramento, CA', trucks: 15, lifecycleStage: 'negotiating', leadScore: 80, status: 'active', source: 'Google Ad', contractValue: 5200, accountSize: '16-50', ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(2) } }),
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'Amy', lastName: 'Nguyen', email: 'amy@roadpros.com', phone: '(916) 555-9009', company: 'Road Pros LLC', title: 'Owner', city: 'Fresno, CA', trucks: 4, lifecycleStage: 'demo_done', leadScore: 65, status: 'active', source: 'Referral', contractValue: 2500, accountSize: '1-5', ownedBy: 'Sarah Lee', addedBy: 'Sarah Lee', lastActivityAt: ago(3) } }),
      prisma.contact.create({ data: { pool: 'prospect', firstName: 'Kevin', lastName: 'Martinez', email: 'kevin@xpress.com', phone: '(209) 555-0010', company: 'Xpress Towing', title: 'CEO', city: 'Stockton, CA', trucks: 9, lifecycleStage: 'contacted', leadScore: 30, status: 'active', source: 'LinkedIn', contractValue: 0, accountSize: '6-15', ownedBy: 'Amy Wilson', addedBy: 'Amy Wilson', lastActivityAt: ago(7) } }),
    ]);

  const [brandon, jenny, ray, marco, tina] = await Promise.all([
    prisma.contact.create({ data: { pool: 'client', clientId: 'foxtow', firstName: 'Brandon', lastName: 'Fox', email: 'brandon@foxtow.com', phone: '(510) 555-8001', company: 'FoxTow', title: 'CEO', city: 'Oakland, CA', trucks: 45, lifecycleStage: 'customer', leadScore: 95, status: 'active', source: 'Direct', contractValue: 4800, accountSize: '16-50', ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(1) } }),
    prisma.contact.create({ data: { pool: 'client', clientId: 'foxtow', firstName: 'Jenny', lastName: 'Torres', email: 'jenny@foxtow.com', phone: '(510) 555-8002', company: 'FoxTow', title: 'Ops Manager', city: 'Oakland, CA', trucks: 45, lifecycleStage: 'customer', leadScore: 90, status: 'active', source: 'Direct', contractValue: 0, accountSize: '16-50', ownedBy: 'Sarah Lee', addedBy: 'Sarah Lee', lastActivityAt: ago(3) } }),
    prisma.contact.create({ data: { pool: 'client', clientId: 'foxtow', firstName: 'Ray', lastName: 'Kim', email: 'ray@baytow.com', phone: '(415) 555-8003', company: 'Bay Tow Express', title: 'Owner', city: 'SF, CA', trucks: 8, lifecycleStage: 'contacted', leadScore: 40, status: 'active', source: 'Referral', contractValue: 0, accountSize: '6-15', ownedBy: 'Mike Johnson', addedBy: 'Mike Johnson', lastActivityAt: ago(2) } }),
    prisma.contact.create({ data: { pool: 'client', clientId: 'sanpabloauto', firstName: 'Marco', lastName: 'Reyes', email: 'marco@sanpabloauto.com', phone: '(510) 555-9001', company: 'San Pablo Auto', title: 'Owner', city: 'San Pablo, CA', trucks: 3, lifecycleStage: 'customer', leadScore: 88, status: 'active', source: 'Direct', contractValue: 890, accountSize: '1-5', ownedBy: 'James Davis', addedBy: 'James Davis', lastActivityAt: ago(2) } }),
    prisma.contact.create({ data: { pool: 'client', clientId: 'sanpabloauto', firstName: 'Tina', lastName: 'Morales', email: 'tina@spfleet.com', phone: '(510) 555-9002', company: 'SP Fleet Mgmt', title: 'Manager', city: 'Richmond, CA', trucks: 5, lifecycleStage: 'engaged', leadScore: 50, status: 'active', source: 'Referral', contractValue: 0, accountSize: '1-5', ownedBy: 'James Davis', addedBy: 'James Davis', lastActivityAt: ago(4) } }),
  ]);

  await prisma.activity.createMany({
    data: [
      { contactId: john.id, type: 'form_submitted', note: 'Submitted demo request via website widget', by: 'Mike Johnson', ts: ago(2) },
      { contactId: maria.id, type: 'form_submitted', note: 'Filled out contact form on pricing page', by: 'Sarah Lee', ts: ago(8) },
      { contactId: maria.id, type: 'email_sent', note: 'Sequence: Welcome email sent', by: 'Sarah Lee', ts: ago(7) },
      { contactId: maria.id, type: 'call_made', note: 'Cold call — left voicemail', by: 'Sarah Lee', ts: ago(6) },
      { contactId: maria.id, type: 'stage_changed', note: 'New → Contacted', by: 'Sarah Lee', ts: ago(5) },
    ],
  });

  console.log('✓ Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());