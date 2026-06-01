import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { BUILT_IN_SORTS, seedSortsForClient } from '../src/lib/seedDefaults.js';

const prisma = new PrismaClient();

async function main() {
  const force = process.argv.includes('--force');

  if (force) {
    console.log('⚡ --force: clearing existing built-in sort options…');
    await prisma.customSortOption.deleteMany({ where: { isBuiltIn: true } });
    console.log('   cleared. Re-seeding…');
  }

  const clients = await prisma.client.findMany({ select: { id: true } });
  const POOLS = [null, ...clients.map(c => c.id)];

  let totalAdded = 0, totalSkipped = 0;
  for (const clientId of POOLS) {
    const { added, skipped } = await seedSortsForClient(clientId, prisma);
    totalAdded    += added;
    totalSkipped  += skipped;
  }

  console.log(`✓ Sort seed complete — ${totalAdded} added, ${totalSkipped} already existed (${POOLS.length} pools × ${BUILT_IN_SORTS.length} sorts)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
