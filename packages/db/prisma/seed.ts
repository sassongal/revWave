import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create dev user
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@revwave.local' },
    update: {},
    create: {
      email: 'dev@revwave.local',
      name: 'Dev User',
      provider: 'google',
      providerId: 'google-dev-123',
    },
  });

  console.log('Created dev user:', devUser.email);

  // Create dev tenant
  const devTenant = await prisma.tenant.upsert({
    where: { slug: 'dev-tenant' },
    update: {},
    create: {
      name: 'Dev Tenant',
      slug: 'dev-tenant',
      timezone: 'America/New_York',
    },
  });

  console.log('Created dev tenant:', devTenant.name);

  // Create membership
  const membership = await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: devUser.id,
        tenantId: devTenant.id,
      },
    },
    update: {},
    create: {
      userId: devUser.id,
      tenantId: devTenant.id,
      role: 'owner',
    },
  });

  console.log('Created membership:', membership.id);
  console.log('✅ Seed data created successfully');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
