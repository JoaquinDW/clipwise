/**
 * Prisma Seed Script
 * Creates a test user and company for development
 *
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create test company
  console.log('Creating test company...');
  const company = await prisma.company.upsert({
    where: { id: 'test-company-id' },
    update: {},
    create: {
      id: 'test-company-id',
      name: 'Test Company',
      minutesUsed: 0,
    },
  });
  console.log(`✅ Company created: ${company.name} (${company.id})\n`);

  // Create test user
  console.log('Creating test user...');
  const user = await prisma.user.upsert({
    where: { email: 'test@momentreel.com' },
    update: {
      companyId: company.id,
    },
    create: {
      id: 'test-user-id',
      email: 'test@momentreel.com',
      name: 'Test User',
      emailVerified: new Date(),
      companyId: company.id,
    },
  });
  console.log(`✅ User created: ${user.name} (${user.email})\n`);

  console.log('═══════════════════════════════════════');
  console.log('✅ Seed completed!\n');
  console.log('Test Credentials:');
  console.log('  Email: test@momentreel.com');
  console.log('  User ID: test-user-id');
  console.log('  Company ID: test-company-id');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
