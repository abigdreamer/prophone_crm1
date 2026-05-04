import { PrismaClient } from '@prisma/client';

const baseClient = new PrismaClient();

// SQLite stores tags as a JSON string instead of a native array.
// Serialize on write and deserialize on read transparently.
const prisma = process.env.DATABASE_URL?.startsWith('file:')
  ? baseClient.$extends({
      query: {
        contact: {
          async $allOperations({ args, query }) {
            if (args.data && Array.isArray(args.data.tags)) {
              args.data.tags = JSON.stringify(args.data.tags);
            }
            const result = await query(args);
            const parse = (c) => {
              if (c && typeof c.tags === 'string') {
                try { c.tags = JSON.parse(c.tags); } catch { c.tags = []; }
              }
              return c;
            };
            if (Array.isArray(result)) return result.map(parse);
            return parse(result);
          },
        },
      },
    })
  : baseClient;

export default prisma;
