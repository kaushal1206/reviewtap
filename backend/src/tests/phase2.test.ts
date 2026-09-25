import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🧪 STARTING REVIEWTAP PHASE 2 AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let adminToken = '';
  let ownerToken = '';
  let ownerBusinessId = '';
  let ownerBusinessSlug = '';
  let secondOwnerToken = '';

  // 1. Authenticate Super Admin & Merchant Owner
  console.log('👉 1. Testing Authentication & Token Issuance...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@reviewtap.io', password: 'Admin@123456' }),
  });
  const adminLoginData = await adminLoginRes.json();
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  assert.strictEqual(adminLoginData.data.user.role, 'SUPER_ADMIN', 'Role must be SUPER_ADMIN');
  adminToken = adminLoginData.data.accessToken;
  console.log('   ✅ Super Admin authenticated successfully.');

  const ownerEmail = `phase2_owner_${Date.now()}@tenant.com`;
  const ownerRegisterRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password: 'Password@123',
      fullName: 'Phase 2 Test Owner',
      role: 'BUSINESS_OWNER',
    }),
  });
  const ownerRegisterData = await ownerRegisterRes.json();
  assert.strictEqual(ownerRegisterRes.status, 201, 'Owner registration failed');
  assert.strictEqual(ownerRegisterData.data.user.role, 'BUSINESS_OWNER', 'Role must be BUSINESS_OWNER');
  ownerToken = ownerRegisterData.data.accessToken;
  console.log('   ✅ Business Owner registered & authenticated successfully.');

  // Create a second business owner to verify multi-tenant isolation
  const secondEmail = `owner2_${Date.now()}@tenant.com`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: secondEmail,
      password: 'Password@123',
      fullName: 'Second Tenant Owner',
      role: 'BUSINESS_OWNER',
    }),
  });
  const registerData = await registerRes.json();
  assert.strictEqual(registerRes.status, 201, 'Second tenant registration failed');
  secondOwnerToken = registerData.data.accessToken;
  console.log('   ✅ Registered Second Tenant for Multi-Tenant Testing.');

  // 2. Business Creation & Slug Stability
  console.log('\n👉 2. Testing Business Creation with Contact & Social Fields...');
  const createRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: 'Phase2 Artisan Cafe',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
      category: 'Cafe & Specialty Coffee',
      phone: '+1 (512) 555-0199',
      address: '100 Congress Ave, Austin, TX',
      website: 'https://artisancafe.com',
      whatsapp: '+15125550199',
      instagram: '@artisancafe',
    }),
  });
  const createData = await createRes.json();
  assert.strictEqual(createRes.status, 201, 'Business creation failed');
  const createdBiz = createData.data.business;
  ownerBusinessId = createdBiz.id;
  ownerBusinessSlug = createdBiz.slug;
  assert.strictEqual(createdBiz.status, 'ACTIVE', 'Initial status must be ACTIVE');
  assert.strictEqual(createdBiz.website, 'https://artisancafe.com');
  assert.strictEqual(createdBiz.instagram, '@artisancafe');
  console.log(`   ✅ Business Created: ${createdBiz.name} (Slug: ${ownerBusinessSlug}, Status: ${createdBiz.status})`);

  // 3. Multi-Tenant Authorization Enforcement
  console.log('\n👉 3. Testing Strict Multi-Tenant Data Isolation...');
  // Second owner attempts to access first owner's business details
  const unauthorizedGetRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}`, {
    headers: { Authorization: `Bearer ${secondOwnerToken}` },
  });
  assert.strictEqual(unauthorizedGetRes.status, 403, 'Cross-tenant GET must return 403 Forbidden');
  console.log('   ✅ Cross-tenant GET blocked with 403 Forbidden.');

  // Second owner attempts to edit first owner's business
  const unauthorizedPatchRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({ name: 'Hacked Name' }),
  });
  assert.strictEqual(unauthorizedPatchRes.status, 403, 'Cross-tenant PATCH must return 403 Forbidden');
  console.log('   ✅ Cross-tenant PATCH blocked with 403 Forbidden.');

  // Super Admin can access the business
  const adminGetRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminGetRes.status, 200, 'Super Admin must be able to view all businesses');
  console.log('   ✅ Super Admin permitted cross-tenant access.');

  // 4. Business Updates & Slug Stability
  console.log('\n👉 4. Testing Business Updates & Slug Stability (Rule 10)...');
  const updateRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: 'Phase2 Artisan Cafe & Bakery',
      phone: '+1 (512) 555-0999',
    }),
  });
  const updateData = await updateRes.json();
  assert.strictEqual(updateRes.status, 200, 'Business update failed');
  assert.strictEqual(updateData.data.business.name, 'Phase2 Artisan Cafe & Bakery');
  assert.strictEqual(updateData.data.business.slug, ownerBusinessSlug, 'Slug MUST remain stable during edit');
  console.log('   ✅ Business updated successfully. Slug preserved intact.');

  // 5. Safe Status Transitions & Redirect Guard (Rule 13 & 16)
  console.log('\n👉 5. Testing Status Transitions & Redirect Availability...');
  // Change status to INACTIVE
  const statusRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'INACTIVE' }),
  });
  const statusData = await statusRes.json();
  assert.strictEqual(statusRes.status, 200, 'Status update failed');
  assert.strictEqual(statusData.data.business.status, 'INACTIVE');
  console.log('   ✅ Status updated to INACTIVE.');

  // Attempt redirect on INACTIVE business -> must not 302 redirect
  const inactiveRedirectRes = await fetch(`${BASE_URL}/r/${ownerBusinessSlug}`, {
    redirect: 'manual',
  });
  assert.strictEqual(inactiveRedirectRes.status, 404, 'Inactive business redirect must return 404/Inactive page');
  console.log('   ✅ Inactive business redirect properly blocked.');

  // Reactivate business
  await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  console.log('   ✅ Status restored to ACTIVE.');

  // 6. QR & NFC Redirect Flows + Asynchronous Telemetry
  console.log('\n👉 6. Testing QR & NFC Redirect Flows + Asynchronous Telemetry...');
  // QR Scan
  const qrRedirectRes = await fetch(`${BASE_URL}/r/${ownerBusinessSlug}?src=QR`, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148' },
  });
  assert.strictEqual(qrRedirectRes.status, 302, 'QR Redirect must return 302 Found');
  assert.strictEqual(qrRedirectRes.headers.get('location'), createdBiz.googleReviewUrl);
  console.log('   ✅ QR Redirect: HTTP 302 -> Google Review Destination.');

  // NFC Tap
  const nfcRedirectRes = await fetch(`${BASE_URL}/r/${ownerBusinessSlug}?src=NFC`, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile' },
  });
  assert.strictEqual(nfcRedirectRes.status, 302, 'NFC Redirect must return 302 Found');
  assert.strictEqual(nfcRedirectRes.headers.get('location'), createdBiz.googleReviewUrl);
  console.log('   ✅ NFC Redirect: HTTP 302 -> Google Review Destination.');

  // Wait 500ms for async telemetry write
  await new Promise((r) => setTimeout(r, 500));

  // 7. Analytics Aggregations (Rule 25)
  console.log('\n👉 7. Testing Database-Side Analytics Aggregations...');
  const analyticsRes = await fetch(`${BASE_URL}/api/analytics/overview?businessId=${ownerBusinessId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const analyticsData = await analyticsRes.json();
  assert.strictEqual(analyticsRes.status, 200, 'Analytics fetch failed');
  const { kpis, distribution, trends } = analyticsData.data;

  assert.ok(kpis.totalEvents >= 2, 'Total events must include at least the 2 test events');
  assert.ok(kpis.qrEvents >= 1, 'QR events must be at least 1');
  assert.ok(kpis.nfcEvents >= 1, 'NFC events must be at least 1');
  assert.ok(distribution.total >= 2, 'Source distribution total must be >= 2');
  assert.ok(trends.length > 0, 'Trends array must contain daily points');
  console.log(`   ✅ Analytics KPIs: Total Events = ${kpis.totalEvents} (QR: ${kpis.qrEvents}, NFC: ${kpis.nfcEvents})`);
  console.log(`   ✅ Distribution: QR = ${distribution.qrPercentage}%, NFC = ${distribution.nfcPercentage}%`);

  // 8. Event Explorer Pagination & Filtering
  console.log('\n👉 8. Testing Event Explorer Filtering & Pagination...');
  const eventsRes = await fetch(`${BASE_URL}/api/events?businessId=${ownerBusinessId}&page=1&limit=10`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const eventsData = await eventsRes.json();
  assert.strictEqual(eventsRes.status, 200, 'Events query failed');
  assert.ok(eventsData.data.events.length >= 2, 'Must return at least 2 events');
  assert.strictEqual(eventsData.data.pagination.page, 1);
  assert.strictEqual(eventsData.data.events[0].business.id, ownerBusinessId);

  // Test source filter
  const nfcEventsRes = await fetch(`${BASE_URL}/api/events?businessId=${ownerBusinessId}&sourceType=NFC`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const nfcEventsData = await nfcEventsRes.json();
  assert.strictEqual(nfcEventsRes.status, 200);
  assert.ok(nfcEventsData.data.events.every((e: any) => e.sourceType === 'NFC'), 'All filtered events must be NFC');
  console.log(`   ✅ Event Explorer: Paginated ${eventsData.data.events.length} events, NFC filtering verified.`);

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 2 AUTOMATED INTEGRATION TESTS PASSED!');
  console.log('====================================================');
}

runPhase2Tests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
