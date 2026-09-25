import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_PLANS = [
  {
    code: 'FREE',
    name: 'Free Tier',
    description: 'Essential Google review collection for single-location starters.',
    price: 0,
    currency: 'USD',
    billingInterval: 'MONTHLY' as const,
    isActive: true,
    isDefault: true,
    maxBusinesses: 1,
    maxQrSources: 1,
    maxNfcCards: 1,
    maxMonthlyEvents: 500,
    maxTeamMembers: 1,
    analyticsRetentionDays: 14,
    customBranding: false,
    exportAnalytics: false,
    prioritySupport: false,
  },
  {
    code: 'STARTER',
    name: 'Starter',
    description: 'For growing shops and cafes expanding their review footprint.',
    price: 1500, // $15.00/mo
    currency: 'USD',
    billingInterval: 'MONTHLY' as const,
    isActive: true,
    isDefault: false,
    maxBusinesses: 3,
    maxQrSources: 3,
    maxNfcCards: 5,
    maxMonthlyEvents: 5000,
    maxTeamMembers: 3,
    analyticsRetentionDays: 30,
    customBranding: false,
    exportAnalytics: true,
    prioritySupport: false,
  },
  {
    code: 'PRO',
    name: 'Pro Growth',
    description: 'High volume multi-table & multi-counter review management with custom branding.',
    price: 3900, // $39.00/mo
    currency: 'USD',
    billingInterval: 'MONTHLY' as const,
    isActive: true,
    isDefault: false,
    maxBusinesses: 10,
    maxQrSources: 10,
    maxNfcCards: 20,
    maxMonthlyEvents: 25000,
    maxTeamMembers: 10,
    analyticsRetentionDays: 90,
    customBranding: true,
    exportAnalytics: true,
    prioritySupport: false,
  },
  {
    code: 'BUSINESS',
    name: 'Business Enterprise',
    description: 'Franchise scaling, unlimited stands, custom branding, and priority SLA.',
    price: 9900, // $99.00/mo
    currency: 'USD',
    billingInterval: 'MONTHLY' as const,
    isActive: true,
    isDefault: false,
    maxBusinesses: 50,
    maxQrSources: 50,
    maxNfcCards: 100,
    maxMonthlyEvents: 100000,
    maxTeamMembers: 50,
    analyticsRetentionDays: 365,
    customBranding: true,
    exportAnalytics: true,
    prioritySupport: true,
  },
];

async function seedPlans() {
  console.log('📦 Upserting default SaaS subscription plans...');

  const createdPlans = [];
  for (const planData of DEFAULT_PLANS) {
    const plan = await prisma.plan.upsert({
      where: { code: planData.code },
      update: {
        name: planData.name,
        description: planData.description,
        price: planData.price,
        currency: planData.currency,
        billingInterval: planData.billingInterval,
        isActive: planData.isActive,
        isDefault: planData.isDefault,
        maxBusinesses: planData.maxBusinesses,
        maxQrSources: planData.maxQrSources,
        maxNfcCards: planData.maxNfcCards,
        maxMonthlyEvents: planData.maxMonthlyEvents,
        maxTeamMembers: planData.maxTeamMembers,
        analyticsRetentionDays: planData.analyticsRetentionDays,
        customBranding: planData.customBranding,
        exportAnalytics: planData.exportAnalytics,
        prioritySupport: planData.prioritySupport,
      },
      create: planData,
    });
    createdPlans.push(plan);
    console.log(`   ✅ Plan: ${plan.name} (${plan.code}) - $${(plan.price / 100).toFixed(2)}/${plan.billingInterval.toLowerCase()}`);
  }

  // Find default FREE plan
  const freePlan = createdPlans.find((p) => p.code === 'FREE') || createdPlans[0];

  // Backfill existing businesses without a subscription
  const businessesWithoutSub = await prisma.business.findMany({
    where: {
      subscription: null,
    },
  });

  console.log(`\n🔍 Checking for businesses without subscriptions (${businessesWithoutSub.length} found)...`);

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const b of businessesWithoutSub) {
    await prisma.subscription.create({
      data: {
        businessId: b.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: thirtyDaysLater,
      },
    });
    console.log(`   ✅ Auto-assigned Free Subscription to: ${b.name} (${b.id})`);
  }

  console.log('\n🎉 Plan seeding and subscription backfill completed successfully!');
}

seedPlans()
  .catch((err) => {
    console.error('❌ Failed to seed plans:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
