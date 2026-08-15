/**
 * Dump the waitlist collected during the pre-launch phase to CSV.
 *
 *   pnpm run waitlist:export > waitlist.csv
 *
 * The /api/waitlist endpoint and the WaitlistEntry table are kept after launch;
 * this is the only thing that reads them.
 */
import { prismaClientGlobal } from '../infra/prisma';

async function main() {
  const entries = await prismaClientGlobal.waitlistEntry.findMany({
    orderBy: { createdAt: 'asc' },
  });

  process.stdout.write('email,createdAt\n');
  for (const entry of entries) {
    process.stdout.write(`${entry.email},${entry.createdAt.toISOString()}\n`);
  }

  console.error(`[waitlist] ${entries.length} entries exported`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prismaClientGlobal.$disconnect());
