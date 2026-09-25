import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('🧪 STARTING REVIEWTAP PHASE 3 AUTOMATED TEST SUITE');
  console.log('   NFC Product Management & Card Lifecycle');
  console.log('====================================================\n');

  let adminToken = '';
  let ownerToken = '';
  let secondOwnerToken = '';
  let ownerBusinessId = '';
  let ownerGoogleReviewUrl = '';
  let secondOwnerBusinessId = '';

  // 1. Authenticate Super Admin & Merchant Owner
  console.log('👉 1. Testing Authentication & Token Issuance...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@reviewtap.io', password: 'Admin@123456' }),
  });
  const adminLoginData = (await adminLoginRes.json()) as any;
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  adminToken = adminLoginData.data.accessToken;

  const ownerEmail = `phase3_primary_${Date.now()}@tenant.com`;
  const ownerRegisterRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password: 'Password@123',
      fullName: 'Phase 3 Primary Owner',
      role: 'BUSINESS_OWNER',
    }),
  });
  const ownerRegisterData = (await ownerRegisterRes.json()) as any;
  assert.strictEqual(ownerRegisterRes.status, 201, 'Owner registration failed');
  ownerToken = ownerRegisterData.data.accessToken;

  // Create fresh business for primary owner
  const createOwnerBizRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: 'Phase 3 Artisans',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    }),
  });
  const ownerBizData = (await createOwnerBizRes.json()) as any;
  assert.strictEqual(createOwnerBizRes.status, 201);
  ownerBusinessId = ownerBizData.data.business.id;
  ownerGoogleReviewUrl = ownerBizData.data.business.googleReviewUrl;

  // Register Second Tenant
  const secondEmail = `phase3_owner2_${Date.now()}@tenant.com`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: secondEmail,
      password: 'Password@123',
      fullName: 'Tenant Two Owner',
      role: 'BUSINESS_OWNER',
    }),
  });
  const registerData = (await registerRes.json()) as any;
  assert.strictEqual(registerRes.status, 201, 'Second tenant registration failed');
  secondOwnerToken = registerData.data.accessToken;

  // Create a business for second owner
  const createSecondBizRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      name: 'Second Tenant Roastery',
      googleReviewUrl: 'https://g.page/r/second-tenant/review',
    }),
  });
  const secondBizData = (await createSecondBizRes.json()) as any;
  secondOwnerBusinessId = secondBizData.data.business.id;
  console.log('   ✅ Multi-tenant test accounts & businesses established.');

  // 2. Unassigned NFC Card Provisioning
  console.log('\n👉 2. Provisioning Unassigned Inventory NFC Card...');
  const createCardRes = await fetch(`${BASE_URL}/api/nfc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      label: 'Inventory Test Card',
      batchNumber: 'BATCH-2026-T1',
    }),
  });
  const createCardData = (await createCardRes.json()) as any;
  assert.strictEqual(createCardRes.status, 201, 'Card creation failed');
  const card = createCardData.data.card;
  assert.ok(card.id, 'Card must have ID');
  assert.match(card.publicId, /^RT-NFC-[A-F0-9]{6}$/, 'Public ID must follow RT-NFC-XXXXXX format');
  assert.strictEqual(card.status, 'UNASSIGNED', 'Status must default to UNASSIGNED when no business is provided');
  assert.strictEqual(card.businessId, null, 'Unassigned card must have null businessId');
  console.log(`   ✅ Provisioned unassigned card: ${card.publicId} (${card.id})`);

  // 3. Multi-Tenant Business Assignment
  console.log('\n👉 3. Testing Business Assignment & Tenant Boundary Enforcement...');
  // Tenant 2 trying to assign Tenant 1's business to a card
  const illegalAssignRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({ businessId: ownerBusinessId }),
  });
  assert.strictEqual(illegalAssignRes.status, 403, 'Cross-tenant assignment must be rejected with 403');
  console.log('   ✅ Cross-tenant assignment blocked with 403 Forbidden.');

  // Legal assignment by Owner
  const legalAssignRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ businessId: ownerBusinessId }),
  });
  const legalAssignData = (await legalAssignRes.json()) as any;
  assert.strictEqual(legalAssignRes.status, 200, 'Legal assignment failed');
  assert.strictEqual(legalAssignData.data.card.businessId, ownerBusinessId, 'Card businessId must match target business');
  assert.strictEqual(legalAssignData.data.card.status, 'ASSIGNED', 'Status must transition to ASSIGNED');
  console.log('   ✅ Card legally assigned to Owner Business.');

  // 4. Lifecycle Transitions & State Machine Invariants
  console.log('\n👉 4. Testing State Machine Transitions (ASSIGNED -> ACTIVE -> INACTIVE -> ACTIVE -> RETIRED)...');
  // Activate
  const activateRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const activateData = (await activateRes.json()) as any;
  assert.strictEqual(activateRes.status, 200, 'Card activation failed');
  assert.strictEqual(activateData.data.card.status, 'ACTIVE');
  assert.ok(activateData.data.card.activatedAt, 'activatedAt timestamp must be recorded');
  console.log('   ✅ Card transitioned to ACTIVE.');

  // Deactivate
  const deactivateRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/deactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const deactivateData = (await deactivateRes.json()) as any;
  assert.strictEqual(deactivateRes.status, 200, 'Card deactivation failed');
  assert.strictEqual(deactivateData.data.card.status, 'INACTIVE');
  console.log('   ✅ Card transitioned to INACTIVE.');

  // Reactivate
  const reactivateRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(reactivateRes.status, 200, 'Card reactivation failed');
  console.log('   ✅ Card reactivated to ACTIVE.');

  // 5. NFC Smart Redirect Engine (/r/nfc/:publicId)
  console.log('\n👉 5. Testing NFC Smart Redirect Engine (/r/nfc/:publicId)...');
  // Active Card Redirect
  const activeRedirectRes = await fetch(`${BASE_URL}/r/nfc/${card.publicId}`, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' },
  });
  assert.strictEqual(activeRedirectRes.status, 302, 'Active card must return HTTP 302');
  assert.strictEqual(activeRedirectRes.headers.get('location'), ownerGoogleReviewUrl, 'Redirect location must equal Google Review URL');
  console.log(`   ✅ /r/nfc/${card.publicId} successfully returned 302 -> ${ownerGoogleReviewUrl}`);

  // Test Inactive Card Blocking
  await fetch(`${BASE_URL}/api/nfc/${card.id}/deactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const inactiveRedirectRes = await fetch(`${BASE_URL}/r/nfc/${card.publicId}`, {
    redirect: 'manual',
  });
  assert.strictEqual(inactiveRedirectRes.status, 404, 'Inactive card must not redirect (must return 404 error page)');
  const inactiveHtml = await inactiveRedirectRes.text();
  assert.ok(inactiveHtml.includes('Card Not Active') || inactiveHtml.includes('Card Inactive'), 'Response body must contain inactive notice');
  console.log('   ✅ Inactive NFC card safely blocked from redirecting to Google.');

  // Reactivate card to test retiring
  await fetch(`${BASE_URL}/api/nfc/${card.id}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });

  // Retire Card
  const retireRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/retire`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const retireData = (await retireRes.json()) as any;
  assert.strictEqual(retireRes.status, 200, 'Retire card failed');
  assert.strictEqual(retireData.data.card.status, 'RETIRED');
  assert.ok(retireData.data.card.retiredAt, 'retiredAt timestamp must be recorded');
  console.log('   ✅ Card transitioned to RETIRED.');

  // Verify Invariant: Cannot reactivate a retired card
  const invalidReactivateRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(invalidReactivateRes.status, 400, 'Reactivating a retired card must fail with 400');
  console.log('   ✅ Invariant protected: Retired card cannot be reactivated.');

  // Verify Invariant: Cannot reassign a retired card
  const invalidReassignRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ businessId: ownerBusinessId }),
  });
  assert.strictEqual(invalidReassignRes.status, 400, 'Reassigning a retired card must fail with 400');
  console.log('   ✅ Invariant protected: Retired card cannot be reassigned.');

  // 6. Backup QR Code Endpoint Verification
  console.log('\n👉 6. Testing Backup QR Code Endpoints for NFC Cards...');
  const qrSvgRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/qr?format=svg`);
  assert.strictEqual(qrSvgRes.status, 200, 'QR SVG endpoint failed');
  assert.ok(qrSvgRes.headers.get('content-type')?.includes('image/svg+xml'), 'Content-Type must be SVG');
  const svgText = await qrSvgRes.text();
  assert.ok(svgText.includes('<svg'), 'Response must be valid SVG XML');
  console.log('   ✅ Backup QR SVG generation verified.');

  const qrPngRes = await fetch(`${BASE_URL}/api/nfc/${card.id}/qr?format=png`);
  assert.strictEqual(qrPngRes.status, 200, 'QR PNG endpoint failed');
  assert.ok(qrPngRes.headers.get('content-type')?.includes('image/png'), 'Content-Type must be image/png');
  console.log('   ✅ Backup QR PNG generation verified.');

  // 7. Unassigned Card Provisioning & Instant Activation Test
  console.log('\n👉 7. Testing Immediate Provisioning with Business Assignment...');
  const instantCardRes = await fetch(`${BASE_URL}/api/nfc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      label: 'Express Reception NFC Tag',
      businessId: ownerBusinessId,
      activateImmediately: true,
      nfcTagUid: `04:88:${Math.random().toString(16).slice(2, 4)}:${Math.random().toString(16).slice(2, 4)}:${Math.random().toString(16).slice(2, 4)}:${Math.random().toString(16).slice(2, 4)}`.toUpperCase(),
    }),
  });
  const instantCardData = (await instantCardRes.json()) as any;
  assert.strictEqual(instantCardRes.status, 201, 'Instant card provisioning failed');
  assert.strictEqual(instantCardData.data.card.status, 'ACTIVE', 'Card must be ACTIVE immediately');
  assert.strictEqual(instantCardData.data.card.businessId, ownerBusinessId);
  console.log(`   ✅ Provisioned directly in ACTIVE state: ${instantCardData.data.card.publicId}`);

  // Test instant tap redirection and telemetry recording
  const instantRedirectRes = await fetch(`${BASE_URL}/r/nfc/${instantCardData.data.card.publicId}`, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0' },
  });
  assert.strictEqual(instantRedirectRes.status, 302, 'Instant card redirect must be 302');
  console.log('   ✅ Instant card redirect succeeded.');

  // Wait 150ms for asynchronous telemetry event to persist
  await new Promise((r) => setTimeout(r, 200));

  // Inspect telemetry on card details endpoint
  const cardDetailRes = await fetch(`${BASE_URL}/api/nfc/${instantCardData.data.card.id}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const cardDetailData = (await cardDetailRes.json()) as any;
  assert.strictEqual(cardDetailRes.status, 200);
  assert.ok(cardDetailData.data.card.totalTaps >= 1, 'totalTaps must be at least 1');
  console.log(`   ✅ Async telemetry verified: totalTaps = ${cardDetailData.data.card.totalTaps}`);

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 3 INTEGRATION TESTS PASSED SUCCESSFULLY');
  console.log('====================================================\n');
}

runPhase3Tests().catch((err) => {
  console.error('\n❌ PHASE 3 TEST SUITE FAILED:', err);
  process.exit(1);
});
