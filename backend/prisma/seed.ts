import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ReviewTap database...');

  // Clean existing seed data if any
  await prisma.scanEvent.deleteMany({});
  await prisma.tapSource.deleteMany({});
  await prisma.business.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  const adminPasswordHash = await bcrypt.hash('Admin@123456', 12);
  const ownerPasswordHash = await bcrypt.hash('Owner@123456', 12);

  // 1. Create Super Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@reviewtap.io',
      fullName: 'ReviewTap Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`Created Super Admin: ${admin.email}`);

  // 2. Create Business Owner
  const owner = await prisma.user.create({
    data: {
      email: 'owner@artisanroasters.com',
      fullName: 'Marcus Vance',
      passwordHash: ownerPasswordHash,
      role: 'BUSINESS_OWNER',
    },
  });
  console.log(`Created Business Owner: ${owner.email}`);

  // 3. Create Demo Business
  const business = await prisma.business.create({
    data: {
      name: 'Artisan Coffee Roasters',
      slug: 'artisan-coffee-roasters',
      // Real Google Review write URL format
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
      googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      category: 'Cafe & Specialty Coffee',
      phone: '+1 (512) 555-0199',
      address: '404 Congress Ave, Austin, TX 78701',
      ownerId: owner.id,
      brandingSettings: {
        primaryColor: '#4f46e5',
        accentColor: '#6366f1',
        showDirectRedirect: true,
      },
      tapSources: {
        create: [
          {
            shortCode: 'artisan-coffee-roasters',
            type: 'QR_CODE',
            label: 'Countertop QR Stand #1',
          },
          {
            shortCode: 'artisan-nfc-card-01',
            type: 'NFC_CARD',
            label: 'Checkout NFC Card #1',
            nfcTagUid: '04:A2:8B:1F:3C:6E:80',
          },
        ],
      },
    },
    include: {
      tapSources: true,
    },
  });

  console.log(`Created Demo Business: ${business.name} (slug: ${business.slug})`);
  console.log(`Created ${business.tapSources.length} TapSources (QR + NFC)`);
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
