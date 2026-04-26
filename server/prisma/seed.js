import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const COMPANY_ID = 'GENIUSAI';

const SUPER_ADMIN = {
  email:    process.env.SEED_SUPER_ADMIN_EMAIL    || 'mike@geniusai.biz',
  password: process.env.SEED_SUPER_ADMIN_PASSWORD || '123456',
  name:     process.env.SEED_SUPER_ADMIN_NAME     || 'Super Admin',
};

const ADMIN = {
  email:    'admin@geniusai.biz',
  password: '123456',
  name:     'GeniusAI Admin',
};

const MANAGER = {
  email:    'manager@geniusai.biz',
  password: '123456',
  name:     'GeniusAI Manager',
};

async function upsertUser({ email, password, name, role, prophone_id }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  · ${role} already exists: ${email} — skipping.`);
    return existing;
  }
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      prophone_id,
      email,
      password: hashed,
      name,
      role,
      avatar: name.split(' ').map(w => w[0]).join('').toUpperCase(),
      color:  '#6366f1',
    },
  });
  console.log(`  ✓ ${role} created: ${email}  (password: ${password})`);
  return user;
}

async function main() {
  console.log('--- Seeding database ---');

  // 1. Company: GeniusAI
  const existingCompany = await prisma.company_profile.findUnique({ where: { prophone_id: COMPANY_ID } });
  if (existingCompany) {
    console.log(`  · Company already exists: ${COMPANY_ID} — skipping.`);
  } else {
    await prisma.company_profile.create({
      data: {
        prophone_id: COMPANY_ID,
        name:        'GeniusAI',
        website:     'https://geniusai.biz',
        industry:    'Technology',
        plan:        'starter',
        city:        '',
        address:     '',
        phone:       '',
        notes:       '',
        metadata:    {},
      },
    });
    console.log(`  ✓ Company created: GeniusAI (id: ${COMPANY_ID})`);
  }

  // 2. Super Admin (global, no company)
  await upsertUser({ ...SUPER_ADMIN, role: 'super_admin', prophone_id: null });

  // 3. Admin for GeniusAI
  await upsertUser({ ...ADMIN, role: 'admin', prophone_id: COMPANY_ID });

  // 4. Manager for GeniusAI
  await upsertUser({ ...MANAGER, role: 'manager', prophone_id: COMPANY_ID });

  console.log('');
  console.log('Default login credentials:');
  console.log(`  Super Admin : ${SUPER_ADMIN.email}  /  ${SUPER_ADMIN.password}`);
  console.log(`  Admin       : ${ADMIN.email}   /  ${ADMIN.password}`);
  console.log(`  Manager     : ${MANAGER.email} /  ${MANAGER.password}`);
  console.log('--- Done ---');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
