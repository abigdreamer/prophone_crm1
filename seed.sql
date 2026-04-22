  -- ─── ProPhone CRM — Seed Data ─────────────────────────────────────────────────
  -- Run this AFTER schema.sql in Supabase SQL Editor

  -- ── Users ──────────────────────────────────────────────────────────────────────
  insert into users (id, name, email, role, avatar, color, password) values
    ('u1', 'Mike Johnson',  'mike@geniusai.biz',  'Admin',   'MJ', '#6366f1', 'demo'),
    ('u2', 'Sarah Lee',     'sarah@geniusai.biz', 'Manager', 'SL', '#22c55e', 'demo'),
    ('u3', 'James Davis',   'james@geniusai.biz', 'Rep',     'JD', '#f59e0b', 'demo'),
    ('u4', 'Amy Wilson',    'amy@geniusai.biz',   'Rep',     'AW', '#38bdf8', 'demo');

  -- ── Clients ────────────────────────────────────────────────────────────────────
  insert into clients (id, name, domain, color, industry, plan, mrr) values
    ('foxtow',          'FoxTow',          'foxtow.com',          '#fb923c', 'Towing SaaS',       'Enterprise', 4800),
    ('sanpabloauto',    'San Pablo Auto',  'sanpabloauto.com',    '#38bdf8', 'Auto Repair',        'Pro',         890),
    ('caliens',         'Caliens',         'caliens.com',          '#c084fc', 'Roadside Services',  'Pro',        1200),
    ('certifiedtow',    'CertifiedTow',    'certifiedtow.com',     '#4ade80', 'Towing',             'Starter',     320),
    ('roadsidewingman', 'Roadside Wingman','roadsidewingman.com',  '#fbbf24', 'VA Dispatch',        'Enterprise', 2600);

  -- ── Prospect Contacts ──────────────────────────────────────────────────────────
  insert into contacts (
    pool, client_id, first_name, last_name, email, phone, company, title,
    city, trucks, lifecycle_stage, lead_score, status, source,
    contract_value, account_size, owned_by, added_by, last_activity_at
  ) values
    ('prospect', null, 'John',  'Smith',   'john@towpro.com',     '(510) 555-1001', 'TowPro LLC',       'Owner',         'Oakland, CA',      5,  'new',            15, 'active', 'Website Form',  0,    '1-5',   'Mike Johnson', 'Mike Johnson', now() - interval '2 days'),
    ('prospect', null, 'Maria', 'Garcia',  'maria@fastway.com',   '(415) 555-2002', 'FastWay Towing',   'Operations Mgr','San Francisco, CA', 8,  'contacted',      35, 'active', 'Cold Outreach', 0,    '6-15',  'Sarah Lee',    'Sarah Lee',    now() - interval '5 days'),
    ('prospect', null, 'Dave',  'Lee',     'dave@bayauto.com',    '(925) 555-3003', 'Bay Area Auto',    'CEO',           'Concord, CA',      12, 'engaged',        58, 'active', 'Referral',      0,    '6-15',  'James Davis',  'James Davis',  now() - interval '3 days'),
    ('prospect', null, 'Tom',   'Brown',   'tom@hwyrescue.com',   '(510) 555-4004', 'Hwy Rescue Inc',   'Owner',         'Fremont, CA',      20, 'demo_scheduled', 72, 'active', 'Google Ad',     3500, '16-50', 'Mike Johnson', 'Mike Johnson', now() - interval '1 day'),
    ('prospect', null, 'Lisa',  'Chen',    'lisa@cityfleet.com',  '(408) 555-5005', 'City Fleet Svcs',  'Fleet Manager', 'San Jose, CA',     35, 'proposal_sent',  85, 'active', 'Conference',    8500, '16-50', 'Sarah Lee',    'Sarah Lee',    now() - interval '4 hours'),
    ('prospect', null, 'Chris', 'Walker',  'chris@pacific.com',   '(650) 555-6006', 'Pacific Tow',      'Owner',         'Daly City, CA',    6,  'customer',       95, 'active', 'Website Form',  4800, '6-15',  'Amy Wilson',   'Amy Wilson',   now() - interval '6 hours'),
    ('prospect', null, 'Nadia', 'Patel',   'nadia@elite.com',     '(510) 555-7007', 'Elite Drive',      'Director',      'Oakland, CA',      3,  'lost',           20, 'active', 'Cold Email',    0,    '1-5',   'James Davis',  'James Davis',  now() - interval '10 days'),
    ('prospect', null, 'Brian', 'Torres',  'brian@caltow.com',    '(707) 555-8008', 'Cal Tow Services', 'Manager',       'Sacramento, CA',   15, 'negotiating',    80, 'active', 'Google Ad',     5200, '16-50', 'Mike Johnson', 'Mike Johnson', now() - interval '2 days'),
    ('prospect', null, 'Amy',   'Nguyen',  'amy@roadpros.com',    '(916) 555-9009', 'Road Pros LLC',    'Owner',         'Fresno, CA',        4, 'demo_done',      65, 'active', 'Referral',      2500, '1-5',   'Sarah Lee',    'Sarah Lee',    now() - interval '3 days'),
    ('prospect', null, 'Kevin', 'Martinez','kevin@xpress.com',    '(209) 555-0010', 'Xpress Towing',    'CEO',           'Stockton, CA',      9, 'contacted',      30, 'active', 'LinkedIn',      0,    '6-15',  'Amy Wilson',   'Amy Wilson',   now() - interval '7 days');

  -- ── Activities for Prospect Contacts ──────────────────────────────────────────

  -- John Smith (new)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'form_submitted', 'Submitted demo request via website widget', 'Mike Johnson', now() - interval '2 days'
  from contacts where email = 'john@towpro.com' and pool = 'prospect';

  -- Maria Garcia (contacted)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'form_submitted', 'Filled out contact form on pricing page', 'Sarah Lee', now() - interval '8 days'
  from contacts where email = 'maria@fastway.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'email_sent', 'Sequence: Welcome email sent', 'Sarah Lee', now() - interval '7 days'
  from contacts where email = 'maria@fastway.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'call_made', 'Cold call — left voicemail', 'Sarah Lee', now() - interval '6 days'
  from contacts where email = 'maria@fastway.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'New → Contacted', 'Sarah Lee', now() - interval '5 days'
  from contacts where email = 'maria@fastway.com' and pool = 'prospect';

  -- Dave Lee (engaged)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'email_sent', 'Sequence: Welcome email', 'James Davis', now() - interval '12 days'
  from contacts where email = 'dave@bayauto.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'email_opened', 'Opened welcome email — 2m read time', 'James Davis', now() - interval '11 days'
  from contacts where email = 'dave@bayauto.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'call_answered', 'Spoke 12 min — very interested in Enterprise plan', 'James Davis', now() - interval '6 days'
  from contacts where email = 'dave@bayauto.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'Contacted → Engaged', 'James Davis', now() - interval '3 days'
  from contacts where email = 'dave@bayauto.com' and pool = 'prospect';

  -- Tom Brown (demo_scheduled)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'call_answered', 'Qualified: 20 trucks, budget $3500/mo', 'Mike Johnson', now() - interval '5 days'
  from contacts where email = 'tom@hwyrescue.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'demo_scheduled', 'Demo booked via Calendly — Thursday 2pm', 'Mike Johnson', now() - interval '3 days'
  from contacts where email = 'tom@hwyrescue.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'sms_sent', 'SMS reminder sent: demo confirmed for Thursday', 'Mike Johnson', now() - interval '1 day'
  from contacts where email = 'tom@hwyrescue.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'Engaged → Demo Scheduled', 'Mike Johnson', now() - interval '1 day'
  from contacts where email = 'tom@hwyrescue.com' and pool = 'prospect';

  -- Lisa Chen (proposal_sent)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'demo_held', 'Zoom demo 45min — impressed with dispatch feature', 'Sarah Lee', now() - interval '10 days'
  from contacts where email = 'lisa@cityfleet.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'email_replied', 'Reply: When can we start? Need pricing for 35 trucks', 'Sarah Lee', now() - interval '8 days'
  from contacts where email = 'lisa@cityfleet.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'proposal_sent', 'Enterprise plan proposal sent — $8,500/mo for 35 trucks', 'Sarah Lee', now() - interval '4 hours'
  from contacts where email = 'lisa@cityfleet.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'Demo Done → Proposal Sent', 'Sarah Lee', now() - interval '4 hours'
  from contacts where email = 'lisa@cityfleet.com' and pool = 'prospect';

  -- Chris Walker (customer)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'demo_held', 'Demo complete — loved the reporting dashboard', 'Amy Wilson', now() - interval '14 days'
  from contacts where email = 'chris@pacific.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'call_answered', 'Negotiated: agreed on $4,800/mo for 6 trucks', 'Amy Wilson', now() - interval '10 days'
  from contacts where email = 'chris@pacific.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'contract_signed', 'DocuSign complete — Enterprise plan $4,800/mo', 'Amy Wilson', now() - interval '6 hours'
  from contacts where email = 'chris@pacific.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'Negotiating → Customer ✓', 'Amy Wilson', now() - interval '6 hours'
  from contacts where email = 'chris@pacific.com' and pool = 'prospect';

  -- Nadia Patel (lost)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'email_sent', 'Initial cold outreach email', 'James Davis', now() - interval '18 days'
  from contacts where email = 'nadia@elite.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'call_made', 'No answer — left voicemail x2', 'James Davis', now() - interval '14 days'
  from contacts where email = 'nadia@elite.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'New → Lost — went with competitor', 'James Davis', now() - interval '10 days'
  from contacts where email = 'nadia@elite.com' and pool = 'prospect';

  -- Brian Torres (negotiating)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'demo_held', 'Product demo complete — 60 min, very engaged', 'Mike Johnson', now() - interval '12 days'
  from contacts where email = 'brian@caltow.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'proposal_sent', 'Proposal: Pro plan $5,200/mo for 15 trucks', 'Mike Johnson', now() - interval '7 days'
  from contacts where email = 'brian@caltow.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'email_replied', 'Reply: Can we get a 10% discount for annual?', 'Mike Johnson', now() - interval '4 days'
  from contacts where email = 'brian@caltow.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'Proposal Sent → Negotiating', 'Mike Johnson', now() - interval '2 days'
  from contacts where email = 'brian@caltow.com' and pool = 'prospect';

  -- Amy Nguyen (demo_done)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'demo_held', 'Demo call: 30 min — liked the GPS tracking feature', 'Sarah Lee', now() - interval '5 days'
  from contacts where email = 'amy@roadpros.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'note_added', 'Pain point: current software crashes often. Budget: $2500/mo', 'Sarah Lee', now() - interval '3 days'
  from contacts where email = 'amy@roadpros.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'Demo Scheduled → Demo Done', 'Sarah Lee', now() - interval '3 days'
  from contacts where email = 'amy@roadpros.com' and pool = 'prospect';

  -- Kevin Martinez (contacted)
  insert into activities (contact_id, type, note, by, ts)
  select id, 'email_sent', 'LinkedIn connection + intro email', 'Amy Wilson', now() - interval '9 days'
  from contacts where email = 'kevin@xpress.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'email_opened', 'Opened email — clicked pricing link', 'Amy Wilson', now() - interval '8 days'
  from contacts where email = 'kevin@xpress.com' and pool = 'prospect';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'New → Contacted', 'Amy Wilson', now() - interval '7 days'
  from contacts where email = 'kevin@xpress.com' and pool = 'prospect';

  -- ── FoxTow Client Contacts ─────────────────────────────────────────────────────
  insert into contacts (
    pool, client_id, first_name, last_name, email, phone, company, title,
    city, trucks, lifecycle_stage, lead_score, status, source,
    contract_value, account_size, owned_by, added_by, last_activity_at
  ) values
    ('client', 'foxtow', 'Brandon', 'Fox',    'brandon@foxtow.com', '(510) 555-8001', 'FoxTow',          'CEO',        'Oakland, CA', 45, 'customer',      95, 'active', 'Direct',   4800, '16-50', 'Mike Johnson', 'Mike Johnson', now() - interval '1 day'),
    ('client', 'foxtow', 'Jenny',   'Torres', 'jenny@foxtow.com',   '(510) 555-8002', 'FoxTow',          'Ops Manager','Oakland, CA', 45, 'customer',      90, 'active', 'Direct',   0,    '16-50', 'Sarah Lee',    'Sarah Lee',    now() - interval '3 days'),
    ('client', 'foxtow', 'Ray',     'Kim',    'ray@baytow.com',     '(415) 555-8003', 'Bay Tow Express', 'Owner',      'SF, CA',       8, 'contacted',     40, 'active', 'Referral', 0,    '6-15',  'Mike Johnson', 'Mike Johnson', now() - interval '2 days');

  -- Activities for FoxTow
  insert into activities (contact_id, type, note, by, ts)
  select id, 'contract_signed', 'FoxTow Enterprise contract renewal — Year 2', 'Mike Johnson', now() - interval '1 day'
  from contacts where email = 'brandon@foxtow.com' and pool = 'client';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'note_added', 'Onboarding complete — all 45 trucks connected to dispatch', 'Sarah Lee', now() - interval '3 days'
  from contacts where email = 'jenny@foxtow.com' and pool = 'client';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'call_answered', 'Intro call — referred by Brandon, interested in Pro plan', 'Mike Johnson', now() - interval '2 days'
  from contacts where email = 'ray@baytow.com' and pool = 'client';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'stage_changed', 'New → Contacted', 'Mike Johnson', now() - interval '2 days'
  from contacts where email = 'ray@baytow.com' and pool = 'client';

  -- ── San Pablo Auto Client Contacts ────────────────────────────────────────────
  insert into contacts (
    pool, client_id, first_name, last_name, email, phone, company, title,
    city, trucks, lifecycle_stage, lead_score, status, source,
    contract_value, account_size, owned_by, added_by, last_activity_at
  ) values
    ('client', 'sanpabloauto', 'Marco', 'Reyes',  'marco@sanpabloauto.com', '(510) 555-9001', 'San Pablo Auto', 'Owner',   'San Pablo, CA', 3, 'customer', 88, 'active', 'Direct', 890, '1-5', 'James Davis', 'James Davis', now() - interval '2 days'),
    ('client', 'sanpabloauto', 'Tina',  'Morales', 'tina@spfleet.com',       '(510) 555-9002', 'SP Fleet Mgmt',  'Manager', 'Richmond, CA',  5, 'engaged',  50, 'active', 'Referral', 0, '1-5', 'James Davis', 'James Davis', now() - interval '4 days');

  insert into activities (contact_id, type, note, by, ts)
  select id, 'note_added', 'Renewal due next quarter — very happy with service', 'James Davis', now() - interval '2 days'
  from contacts where email = 'marco@sanpabloauto.com' and pool = 'client';

  insert into activities (contact_id, type, note, by, ts)
  select id, 'call_answered', 'Referred by Marco — 5 trucks, needs dispatch solution', 'James Davis', now() - interval '4 days'
  from contacts where email = 'tina@spfleet.com' and pool = 'client';
