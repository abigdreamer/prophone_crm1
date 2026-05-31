import prisma from '../lib/prisma.js';
import { calculateLeadScore } from '../lib/leadScore.js';

const CHUNK = 500;
let updated = 0;
let cursor = undefined;

console.log('Recalculating lead scores...');

for (;;) {
  const batch = await prisma.contact.findMany({
    take: CHUNK,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: 'asc' },
    select: {
      id: true,
      firstName: true, lastName: true, email: true, phone: true,
      company: true, source: true, title: true, website: true, address: true,
      lifecycleStage: true, status: true, isCanceled: true, lastActivityAt: true,
    },
  });

  if (!batch.length) break;

  await Promise.all(
    batch.map(c =>
      prisma.contact.update({
        where: { id: c.id },
        data:  { leadScore: calculateLeadScore(c) },
      })
    )
  );

  updated += batch.length;
  cursor = batch[batch.length - 1].id;
  process.stdout.write(`\r  updated ${updated} contacts...`);
}

console.log(`\nDone — ${updated} contacts recalculated.`);
await prisma.$disconnect();
