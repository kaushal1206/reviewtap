import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('🧪 STARTING REVIEWTAP PHASE 4 AUTOMATED TEST SUITE');
  console.log('   Subscription, Plans, Usage Limits & SaaS Billing');
  console.log('====================================================\n');

  let adminToken = '';
  let ownerToken = '';
  let secondOwnerToken = '';
  let ownerBusinessId = '';
  let secondOwnerBusinessId = '';

  // 1. Authenticate Super Admin & Merchant Owner
  console.log('👉 1. Testing Authentication & Multi-Tenant Setup...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@reviewtap.io', password: 'Admin@123456' }),
  });
  const adminLoginData = (await adminLoginRes.json()) as any;
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  adminToken = adminLoginData.data.accessToken;

  const ownerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@artisanroasters.com', password: 'Owner@123456' }),
  });
  const ownerLoginData = (await ownerLoginRes.json()) as any;
  assert.strictEqual(ownerLoginRes.status, 200, 'Owner login failed');
  ownerToken = ownerLoginData.data.accessToken;

  // Register Second Tenant for Multi-Tenant Boundary Tests
  const secondEmail = `phase4_tenant_${Date.now()}@test.com`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: secondEmail,
      password: 'Password@123',
      fullName: 'Phase 4 Tenant Two',
      role: 'BUSINESS_OWNER',
    }),
  });
  const registerData = (await registerRes.json()) as any;
  assert.strictEqual(registerRes.status, 201, 'Second tenant registration failed');
  secondOwnerToken = registerData.data.accessToken;

  console.log('   ✅ Multi-tenant test accounts established.');

  // 2. Public Plan Catalog Retrieval
  console.log('\n👉 2. Verifying Plan Catalog Retrieval (Public & Authenticated)...');
  const plansRes = await fetch(`${BASE_URL}/api/subscription/plans`);
  const plansData = (await plansRes.json()) as any;
  assert.strictEqual(plansRes.status, 200, 'Failed to fetch plan catalog');
  assert.ok(Array.isArray(plansData.data.plans), 'Plans must be an array');
  assert.strictEqual(plansData.data.plans.length, 4, 'Must have exactly 4 seeded plans (FREE, STARTER, PRO, BUSINESS)');

  const freePlan = plansData.data.plans.find((p: any) => p.code === 'FREE');
  const proPlan = plansData.data.plans.find((p: any) => p.code === 'PRO');
  assert.ok(freePlan, 'FREE plan must exist in catalog');
  assert.ok(proPlan, 'PRO plan must exist in catalog');
  assert.strictEqual(freePlan.maxNfcCards, 1, 'FREE plan must allow 1 NFC card');
  assert.strictEqual(freePlan.price, 0, 'FREE plan price must be 0');
  console.log('   ✅ Plan catalog verified with FREE, STARTER, PRO, BUSINESS tiers.');

  // 3. Subscription Auto-Provisioning on Business Creation
  console.log('\n👉 3. Testing Business Creation with Automatic Free Subscription Assignment...');
  const createBizRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      name: `Phase 4 Roastery ${Date.now()}`,
      googleReviewUrl: 'https://g.page/r/phase4-test/review',
      slug: `phase4-biz-${Date.now()}`,
    }),
  });
  const createBizData = (await createBizRes.json()) as any;
  assert.strictEqual(createBizRes.status, 201, 'Business creation failed');
  secondOwnerBusinessId = createBizData.data.business.id;

  // Retrieve the newly created business subscription
  const subRes = await fetch(`${BASE_URL}/api/subscription?businessId=${secondOwnerBusinessId}`, {
    headers: { Authorization: `Bearer ${secondOwnerToken}` },
  });
  const subData = (await subRes.json()) as any;
  assert.strictEqual(subRes.status, 200, 'Failed to retrieve subscription for new business');
  assert.strictEqual(subData.data.subscription.plan.code, 'FREE', 'New business must have FREE plan assigned');
  assert.strictEqual(subData.data.subscription.status, 'ACTIVE', 'Subscription status must be ACTIVE');
  assert.strictEqual(subData.data.subscription.businessId, secondOwnerBusinessId);
  assert.ok(subData.data.usage, 'Usage details must be returned');
  assert.strictEqual(subData.data.usage.activeNfcCards, 0, 'Initial NFC card usage must be 0');
  console.log(`   ✅ Business auto-provisioned with ACTIVE FREE plan: ${subData.data.subscription.id}`);

  // 4. Entitlement Enforcement — Free Tier NFC Card Quota Breach
  console.log('\n👉 4. Testing Entitlement Enforcement & Quota Guards on Free Tier...');
  // Card 1: Within limit (0 -> 1)
  const card1Res = await fetch(`${BASE_URL}/api/nfc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      label: 'Free Tier Card 1',
      businessId: secondOwnerBusinessId,
      activateImmediately: true,
    }),
  });
  const card1Data = (await card1Res.json()) as any;
  assert.strictEqual(card1Res.status, 201, 'Card 1 creation within limit failed');
  const card1 = card1Data.data.card;
  console.log(`   ✅ First NFC card successfully created within quota: ${card1.publicId}`);

  // Card 2: Exceeds Free Tier limit (1 >= 1) -> Must fail with 403 PLAN_LIMIT_REACHED
  const card2Res = await fetch(`${BASE_URL}/api/nfc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      label: 'Free Tier Card 2 (Exceeds Limit)',
      businessId: secondOwnerBusinessId,
    }),
  });
  const card2Data = (await card2Res.json()) as any;
  assert.strictEqual(card2Res.status, 403, 'Exceeding quota must return 403 Forbidden');
  assert.strictEqual(card2Data.error.code, 'PLAN_LIMIT_REACHED', 'Error code must be PLAN_LIMIT_REACHED');
  assert.strictEqual(card2Data.error.details.resource, 'NFC_CARD', 'Details must identify NFC_CARD');
  assert.strictEqual(card2Data.error.details.current, 1, 'Current usage must report 1');
  assert.strictEqual(card2Data.error.details.limit, 1, 'Limit must report 1');
  console.log('   ✅ Quota breach correctly rejected with HTTP 403 PLAN_LIMIT_REACHED.');

  // 5. Plan Upgrade Workflow
  console.log('\n👉 5. Testing Plan Upgrade Workflow (FREE -> PRO)...');
  const upgradeRes = await fetch(`${BASE_URL}/api/subscription/change-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      businessId: secondOwnerBusinessId,
      planCode: 'PRO',
    }),
  });
  const upgradeData = (await upgradeRes.json()) as any;
  assert.strictEqual(upgradeRes.status, 200, 'Plan upgrade failed');
  assert.strictEqual(upgradeData.data.subscription.plan.code, 'PRO', 'Subscription plan must now be PRO');
  assert.strictEqual(upgradeData.data.subscription.plan.maxNfcCards, 20, 'PRO tier maxNfcCards must be 20');
  console.log('   ✅ Plan upgraded to PRO tier successfully.');

  // Now create the second NFC card (must succeed now that limit is 10)
  const card2RetryRes = await fetch(`${BASE_URL}/api/nfc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      label: 'Second Card (After PRO Upgrade)',
      businessId: secondOwnerBusinessId,
    }),
  });
  const card2RetryData = (await card2RetryRes.json()) as any;
  assert.strictEqual(card2RetryRes.status, 201, 'Card creation must succeed after PRO upgrade');
  console.log(`   ✅ Second NFC card created successfully under PRO quota: ${card2RetryData.data.card.publicId}`);

  // 6. Multi-Tenant Isolation & Authorization Protection
  console.log('\n👉 6. Testing Multi-Tenant Subscription Isolation...');
  // Tenant A attempts to access Tenant B's subscription
  const unauthorizedSubRes = await fetch(`${BASE_URL}/api/subscription?businessId=${secondOwnerBusinessId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(unauthorizedSubRes.status, 403, 'Cross-tenant subscription access must return 403 Forbidden');

  // Tenant A attempts to change Tenant B's subscription
  const unauthorizedChangeRes = await fetch(`${BASE_URL}/api/subscription/change-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      businessId: secondOwnerBusinessId,
      planCode: 'BUSINESS',
    }),
  });
  assert.strictEqual(unauthorizedChangeRes.status, 403, 'Cross-tenant plan change must return 403 Forbidden');
  console.log('   ✅ Multi-tenant isolation verified: Cross-tenant operations blocked.');

  // 7. Subscription Cancellation & Reactivation Lifecycle
  console.log('\n👉 7. Testing Cancellation & Reactivation State Machine...');
  const cancelRes = await fetch(`${BASE_URL}/api/subscription/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      businessId: secondOwnerBusinessId,
    }),
  });
  const cancelData = (await cancelRes.json()) as any;
  assert.strictEqual(cancelRes.status, 200, 'Cancellation request failed');
  assert.strictEqual(cancelData.data.subscription.cancelAtPeriodEnd, true, 'cancelAtPeriodEnd must be true');
  assert.strictEqual(cancelData.data.subscription.status, 'ACTIVE', 'Status remains ACTIVE until end of period');
  console.log('   ✅ Subscription marked cancelAtPeriodEnd=true (non-destructive grace period).');

  const reactivateRes = await fetch(`${BASE_URL}/api/subscription/reactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      businessId: secondOwnerBusinessId,
    }),
  });
  const reactivateData = (await reactivateRes.json()) as any;
  assert.strictEqual(reactivateRes.status, 200, 'Reactivation request failed');
  assert.strictEqual(reactivateData.data.subscription.cancelAtPeriodEnd, false, 'cancelAtPeriodEnd must be cleared');
  console.log('   ✅ Subscription reactivated successfully (cancelAtPeriodEnd=false).');

  // 8. Super Admin Plan Catalog Management
  console.log('\n👉 8. Testing Super Admin Plan Catalog Management...');
  // Regular merchant cannot access admin plans
  const merchantAdminRes = await fetch(`${BASE_URL}/api/admin/plans`, {
    headers: { Authorization: `Bearer ${secondOwnerToken}` },
  });
  assert.strictEqual(merchantAdminRes.status, 403, 'Regular merchant must receive 403 on admin plans route');

  // Super Admin retrieves plans
  const adminPlansRes = await fetch(`${BASE_URL}/api/admin/plans`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminPlansData = (await adminPlansRes.json()) as any;
  assert.strictEqual(adminPlansRes.status, 200, 'Super Admin failed to fetch plans');
  assert.ok(adminPlansData.data.plans.length >= 4, 'Admin must see all catalog plans');

  // Super Admin updates a plan
  const planToUpdate = adminPlansData.data.plans.find((p: any) => p.code === 'STARTER');
  const updatePlanRes = await fetch(`${BASE_URL}/api/admin/plans/${planToUpdate.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      description: 'Updated Starter Plan with enhanced features',
    }),
  });
  const updatePlanData = (await updatePlanRes.json()) as any;
  assert.strictEqual(updatePlanRes.status, 200, 'Super Admin plan update failed');
  assert.strictEqual(updatePlanData.data.plan.description, 'Updated Starter Plan with enhanced features');
  console.log('   ✅ Super Admin plan catalog update verified.');

  // 9. Invariant Verification — Core Redirect Engine Remains Unbroken
  console.log('\n👉 9. Verifying Invariant: Core Redirect Engine Remains Fast & Unblocked...');
  // Check QR slug redirect
  const qrRedirectRes = await fetch(`${BASE_URL}/r/phase4-biz-${Date.now()}`, {
    redirect: 'manual',
  });
  // Since this slug was created above, let's verify redirect on the second tenant business slug
  const tenantBizRes = await fetch(`${BASE_URL}/api/businesses/${secondOwnerBusinessId}`, {
    headers: { Authorization: `Bearer ${secondOwnerToken}` },
  });
  const tenantBizData = (await tenantBizRes.json()) as any;
  const actualSlug = tenantBizData.data.business.slug;

  const actualQrRes = await fetch(`${BASE_URL}/r/${actualSlug}`, {
    redirect: 'manual',
  });
  assert.strictEqual(actualQrRes.status, 302, 'QR redirect must return 302 Found');
  assert.ok(actualQrRes.headers.get('location'), 'Redirect must have Location header');

  // Check NFC card redirect
  const nfcRedirectRes = await fetch(`${BASE_URL}/r/nfc/${card1.publicId}`, {
    redirect: 'manual',
  });
  assert.strictEqual(nfcRedirectRes.status, 302, 'NFC redirect must return 302 Found');
  assert.ok(nfcRedirectRes.headers.get('location'), 'NFC redirect must have Location header');
  console.log('   ✅ Core redirect engine verified: 302 redirects unaffected by subscription gating.');

  console.log('\n====================================================');
  console.log('🎉 ALL REVIEWTAP PHASE 4 INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

runPhase4Tests().catch((err) => {
  console.error('\n❌ PHASE 4 TEST SUITE FAILED:', err);
  process.exit(1);
});
