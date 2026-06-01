import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { BUILT_IN_FILTERS, seedFiltersForClient } from '../src/lib/seedDefaults.js';

const prisma = new PrismaClient();

async function main() {
  const force = process.argv.includes('--force');

  if (force) {
    console.log('⚡ --force: clearing existing built-in filter options…');
    await prisma.customFilterOption.deleteMany({ where: { isBuiltIn: true } });
    console.log('   cleared. Re-seeding…');
  }

  const clients = await prisma.client.findMany({ select: { id: true } });
  const POOLS = [null, ...clients.map(c => c.id)];

  let totalAdded = 0, totalSkipped = 0;
  for (const clientId of POOLS) {
    const { added, skipped } = await seedFiltersForClient(clientId, prisma);
    totalAdded    += added;
    totalSkipped  += skipped;
  }

  console.log(`✓ Filter seed complete — ${totalAdded} added, ${totalSkipped} already existed (${POOLS.length} pools × ${BUILT_IN_FILTERS.length} filters)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
