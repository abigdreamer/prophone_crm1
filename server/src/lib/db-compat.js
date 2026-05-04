// Helpers that paper over SQLite vs PostgreSQL differences.
// SQLite: no mode:'insensitive', no skipDuplicates, no Json type.
// PostgreSQL: all of the above are supported natively.

const isSQLite = process.env.DATABASE_URL?.startsWith('file:');

/**
 * Case-insensitive equality filter for a Prisma where clause.
 * Usage:  where: { email: ieq(email) }
 */
export function ieq(value) {
  return isSQLite
    ? value.toLowerCase()
    : { equals: value, mode: 'insensitive' };
}

/**
 * Case-insensitive contains filter for a Prisma where clause.
 * Usage:  where: { name: icontains(search) }
 */
export function icontains(value) {
  return isSQLite
    ? { contains: value }
    : { contains: value, mode: 'insensitive' };
}

/**
 * Spread into createMany to skip duplicate rows where supported.
 * Usage:  prisma.model.createMany({ data, ...skipDups })
 */
export const skipDups = isSQLite ? {} : { skipDuplicates: true };
