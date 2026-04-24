import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL    = process.env.SEED_SUPER_ADMIN_EMAIL    || 'mike@geniusai.biz';
const PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || '123456';
const NAME     = process.env.SEED_SUPER_ADMIN_NAME     || 'Super Admin';

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: 'super_admin' } });

  if (existing) {
    console.log(`Super admin already exists: ${existing.email} — skipping.`);
    return;
  }

  const hashed = await bcrypt.hash(PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      prophone_id: null,   // super_admin is global, not tied to any company
      email:       EMAIL,
      password:    hashed,
      name:        NAME,
      role:        'super_admin',
      avatar:      NAME.split(' ').map(w => w[0]).join('').toUpperCase(),
      color:       '#6366f1',
    },
  });

  console.log(`✓ Super admin created: ${user.email}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Change this password immediately after first login.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
