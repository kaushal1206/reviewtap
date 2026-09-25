import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runMasterE2ETests() {
  console.log('========================================================================');
  console.log('🏆 REVIEWTAP MASTER E2E VERIFICATION SUITE (PHASES 1 TO 6)');
  console.log('   Complete Customer Journeys, Multi-Tenant Security & Edge Cases');
  console.log('========================================================================\n');

  // ============================================================================
  // 1. SETUP TWO INDEPENDENT TENANTS WITH UNIQUE DESTINATIONS
  // ============================================================================
  console.log('👉 STEP 1: Setting up Two Distinct Business Tenants...');
  const tenantAEmail = `e2e_tenant_a_${Date.now()}@reviewtap.io`;
  const tenantBEmail = `e2e_tenant_b_${Date.now()}@reviewtap.io`;
  const tenantAReviewUrl = 'https://search.google.com/local/writereview?placeid=ChIJApexDental_TenantA_Unique';
  const tenantBReviewUrl = 'https://search.google.com/local/writereview?placeid=ChIJBeaconHarbor_TenantB_Unique';

  // Register Tenant A
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: tenantAEmail,
      password: 'TenantA@Password123',
      fullName: 'Dr. Alice Apex',
      role: 'BUSINESS_OWNER',
    }),
  });
  const regAData = (await regARes.json()) as any;
  assert.strictEqual(regARes.status, 201, 'Tenant A registration failed');
  const tokenA = regAData.data.accessToken;

  // Register Tenant B
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: tenantBEmail,
      password: 'TenantB@Password123',
      fullName: 'Bob Beacon',
      role: 'BUSINESS_OWNER',
    }),
  });
  const regBData = (await regBRes.json()) as any;
  assert.strictEqual(regBRes.status, 201, 'Tenant B registration failed');
  const tokenB = regBData.data.accessToken;

  // Create Business for Tenant A
  const bizARes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: 'Apex Dental Care',
      googleReviewUrl: tenantAReviewUrl,
      googlePlaceId: 'ChIJApexDental_TenantA_Unique',
      category: 'Healthcare',
      phone: '+1 555-0101',
    }),
  });
  const bizAData = (await bizARes.json()) as any;
  assert.strictEqual(bizARes.status, 201);
  const businessAId = bizAData.data.business.id;
  const businessASlug = bizAData.data.business.slug;

  // Create Business for Tenant B
  const bizBRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      name: 'Beacon Harbor Hotel',
      googleReviewUrl: tenantBReviewUrl,
      googlePlaceId: 'ChIJBeaconHarbor_TenantB_Unique',
      category: 'Hospitality',
      phone: '+1 555-0202',
    }),
  });
  const bizBData = (await bizBRes.json()) as any;
  assert.strictEqual(bizBRes.status, 201);
  const businessBId = bizBData.data.business.id;
  const businessBSlug = bizBData.data.business.slug;

  console.log(`   ✅ Tenant A: "${bizAData.data.business.name}" (Slug: ${businessASlug})`);
  console.log(`      Destination: ${tenantAReviewUrl}`);
  console.log(`   ✅ Tenant B: "${bizBData.data.business.name}" (Slug: ${businessBSlug})`);
  console.log(`      Destination: ${tenantBReviewUrl}`);

  // ============================================================================
  // 2. PATH A — QR CODE CUSTOMER JOURNEY
  // ============================================================================
  console.log('\n👉 STEP 2: Verifying Path A — QR Customer Acquisition Journey...');
  
  // 2.1 Fetch Tenant A QR code image
  const qrRes = await fetch(`${BASE_URL}/api/businesses/${businessAId}/qr?format=svg`);
  assert.strictEqual(qrRes.status, 200, 'QR endpoint must return 200');
  const qrSvg = await qrRes.text();
  assert.ok(qrSvg.includes('<svg'), 'QR asset must contain valid SVG payload');
  console.log('   ✅ QR code generated successfully for Tenant A.');

  // 2.2 Customer scans QR code -> accesses ReviewTap short redirect: /r/:slug
  const qrRedirectRes = await fetch(`${BASE_URL}/r/${businessASlug}`, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  });
  assert.strictEqual(qrRedirectRes.status, 302, 'QR redirect must return HTTP 302 Found');
  const qrLocation = qrRedirectRes.headers.get('location');
  assert.strictEqual(qrLocation, tenantAReviewUrl, 'QR Location header must match Tenant A Google Review URL');
  console.log(`   ✅ QR Scan: HTTP 302 -> Destination resolved: ${qrLocation}`);

  // ============================================================================
  // 3. PATH B — NFC HARDWARE TAP CUSTOMER JOURNEY
  // ============================================================================
  console.log('\n👉 STEP 3: Verifying Path B — NFC Hardware Tap Journey...');

  // 3.1 Provision an active NFC Card for Tenant A
  const nfcCreateRes = await fetch(`${BASE_URL}/api/nfc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      businessId: businessAId,
      label: 'Front Counter NFC Card',
      activateImmediately: true,
      nfcTagUid: `04:E2:E2:${Date.now().toString().slice(-6)}`,
    }),
  });
  const nfcCreateData = (await nfcCreateRes.json()) as any;
  assert.strictEqual(nfcCreateRes.status, 201, 'NFC card creation must return 201');
  const cardA = nfcCreateData.data.card;
  const nfcPublicId = cardA.publicId;
  const nfcPublicUrl = nfcCreateData.data.nfcUrl;
  assert.ok(nfcPublicId.startsWith('RT-NFC-'), 'NFC Public ID must follow RT-NFC- prefix');
  assert.ok(nfcPublicUrl.includes(`/r/nfc/${nfcPublicId}`), 'NFC URL must route to /r/nfc/:publicId');
  console.log(`   ✅ NFC Card Provisioned: Public ID = ${nfcPublicId}`);
  console.log(`      Public NFC Tag Target URL = ${nfcPublicUrl}`);

  // 3.2 Simulate NFC Phone Tap: Customer device reads tag and accesses /r/nfc/:publicId
  const nfcTapRes = await fetch(`${BASE_URL}/r/nfc/${nfcPublicId}`, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 NFC-Tap',
    },
  });
  assert.strictEqual(nfcTapRes.status, 302, 'NFC Tap redirect must return HTTP 302');
  const nfcLocation = nfcTapRes.headers.get('location');
  assert.strictEqual(nfcLocation, tenantAReviewUrl, 'NFC Location header must match Tenant A Google Review URL');
  console.log(`   ✅ NFC Tap: HTTP 302 -> Destination resolved: ${nfcLocation}`);

  // 3.3 Verify BOTH paths reached the EXACT same destination for Tenant A
  assert.strictEqual(qrLocation, nfcLocation, 'QR and NFC must redirect to the identical business destination');
  console.log('   ✅ Verified Invariant: Both QR and NFC reach the same configured Google Review URL.');

  // ============================================================================
  // 4. DESTINATION DISCRIMINATION (NO GLOBAL HARCODED URL)
  // ============================================================================
  console.log('\n👉 STEP 4: Verifying Tenant Destination Discrimination...');
  
  // Test Tenant B redirect
  const tenantBRedirectRes = await fetch(`${BASE_URL}/r/${businessBSlug}`, {
    redirect: 'manual',
  });
  assert.strictEqual(tenantBRedirectRes.status, 302);
  const tenantBLocation = tenantBRedirectRes.headers.get('location');
  assert.strictEqual(tenantBLocation, tenantBReviewUrl, 'Tenant B must redirect to Tenant B review URL');
  assert.notStrictEqual(tenantBLocation, tenantAReviewUrl, 'Tenant B destination must NOT equal Tenant A');
  console.log(`   ✅ Tenant B redirected independently to: ${tenantBLocation}`);
  console.log('   ✅ Multi-tenant destination isolation verified.');

  // ============================================================================
  // 5. ASYNC TELEMETRY & ATTRIBUTION VERIFICATION
  // ============================================================================
  console.log('\n👉 STEP 5: Verifying Asynchronous Telemetry & Event Logging...');
  // Wait for setImmediate to commit to PostgreSQL
  await new Promise((resolve) => setTimeout(resolve, 600));

  const eventsRes = await fetch(`${BASE_URL}/api/events?businessId=${businessAId}&limit=10`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const eventsData = (await eventsRes.json()) as any;
  assert.strictEqual(eventsRes.status, 200);
  const events = eventsData.data.events;
  assert.ok(events.length >= 2, 'Must have at least 2 events (1 QR and 1 NFC)');
  
  const qrEvent = events.find((e: any) => e.sourceType === 'QR');
  const nfcEvent = events.find((e: any) => e.sourceType === 'NFC');
  assert.ok(qrEvent, 'QR scan event must be recorded');
  assert.ok(nfcEvent, 'NFC tap event must be recorded');
  assert.strictEqual(nfcEvent.nfcCardId, cardA.id, 'NFC event must reference card id');
  console.log(`   ✅ Telemetry verified: ${events.length} event(s) recorded with precise QR/NFC attribution.`);

  // ============================================================================
  // 6. NFC HARDWARE LIFECYCLE & INACTIVE BEHAVIOR
  // ============================================================================
  console.log('\n👉 STEP 6: Verifying Inactive, Unassigned & Nonexistent Card Behavior...');

  // 6.1 Deactivate Tenant A card
  await fetch(`${BASE_URL}/api/nfc/${cardA.id}/deactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const deactivatedRes = await fetch(`${BASE_URL}/r/nfc/${nfcPublicId}`, { redirect: 'manual' });
  assert.strictEqual(deactivatedRes.status, 404, 'Deactivated card must return 404 and block redirect');
  const deactivatedHtml = await deactivatedRes.text();
  assert.ok(deactivatedHtml.includes('Card Not Active') || deactivatedHtml.includes('INACTIVE'));
  console.log('   ✅ Deactivated card safely returns HTTP 404 without redirecting to Google.');

  // 6.2 Reactivate card
  await fetch(`${BASE_URL}/api/nfc/${cardA.id}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const reactivatedRes = await fetch(`${BASE_URL}/r/nfc/${nfcPublicId}`, { redirect: 'manual' });
  assert.strictEqual(reactivatedRes.status, 302, 'Reactivated card must resume HTTP 302 redirection');
  console.log('   ✅ Reactivated card resumes immediate HTTP 302 redirection.');

  // 6.3 Nonexistent public card ID
  const badCardRes = await fetch(`${BASE_URL}/r/nfc/RT-NFC-NONEXISTENT`, { redirect: 'manual' });
  assert.strictEqual(badCardRes.status, 404, 'Nonexistent card must return HTTP 404');
  console.log('   ✅ Nonexistent card ID safely returns HTTP 404.');

  // ============================================================================
  // 7. MULTI-TENANT BOUNDARY & AUTHORIZATION ENFORCEMENT
  // ============================================================================
  console.log('\n👉 STEP 7: Verifying Strict Multi-Tenant Security Boundaries...');

  // 7.1 Cross-tenant NFC access
  const crossNfcRes = await fetch(`${BASE_URL}/api/nfc/${cardA.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(crossNfcRes.status, 403, 'Cross-tenant card access must return 403 Forbidden');
  console.log('   ✅ Cross-tenant NFC card inspection blocked with HTTP 403.');

  // 7.2 Cross-tenant Business modification
  const crossBizPatchRes = await fetch(`${BASE_URL}/api/businesses/${businessAId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ name: 'Hacked Business Name' }),
  });
  assert.strictEqual(crossBizPatchRes.status, 403, 'Cross-tenant business update must return 403');
  console.log('   ✅ Cross-tenant business modification blocked with HTTP 403.');

  // 7.3 Cross-tenant Team listing
  const crossTeamRes = await fetch(`${BASE_URL}/api/businesses/${businessAId}/team`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(crossTeamRes.status, 403, 'Cross-tenant team access must return 403');
  console.log('   ✅ Cross-tenant team member directory blocked with HTTP 403.');

  // 7.4 Cross-tenant Analytics
  const crossAnalyticsRes = await fetch(`${BASE_URL}/api/analytics/overview?businessId=${businessAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(crossAnalyticsRes.status, 403, 'Cross-tenant analytics access must return 403');
  console.log('   ✅ Cross-tenant analytics metrics blocked with HTTP 403.');

  // 7.5 Cross-tenant Invoices
  const crossInvoicesRes = await fetch(`${BASE_URL}/api/billing/invoices?businessId=${businessAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(crossInvoicesRes.status, 403, 'Cross-tenant invoice access must return 403');
  console.log('   ✅ Cross-tenant billing invoices blocked with HTTP 403.');

  // ============================================================================
  // 8. CRYPTOGRAPHIC VERIFICATION & IDEMPOTENT WEBHOOK HANDLING
  // ============================================================================
  console.log('\n👉 STEP 8: Verifying Cryptographic Verification & Webhook Idempotency...');

  // 8.1 Create payment order for Tenant A
  const orderRes = await fetch(`${BASE_URL}/api/billing/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      businessId: businessAId,
      planCode: 'PRO',
    }),
  });
  const orderData = (await orderRes.json()) as any;
  assert.strictEqual(orderRes.status, 201);
  const paymentOrder = orderData.data.order;
  assert.strictEqual(paymentOrder.amount, 3900, 'Server-authoritative price must be $39.00 (3900 cents)');
  console.log(`   ✅ Server-authoritative PaymentOrder created: ${paymentOrder.orderReference} ($${(paymentOrder.amount/100).toFixed(2)})`);

  // 8.2 Verify signature tampering rejection
  const tamperedVerifyRes = await fetch(`${BASE_URL}/api/billing/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      orderReference: paymentOrder.orderReference,
      paymentId: 'pay_test_tampered',
      signature: 'bad_forged_cryptographic_signature_hash',
    }),
  });
  assert.strictEqual(tamperedVerifyRes.status, 400, 'Tampered signature must return HTTP 400');
  console.log('   ✅ Forged cryptographic payment signature rejected with HTTP 400.');

  // 8.3 Simulate Idempotent Webhook
  const webhookEventId = `evt_master_e2e_${Date.now()}`;
  const webhookPayload = {
    provider: 'STRIPE',
    eventId: webhookEventId,
    eventType: 'order.paid',
    payload: {
      orderReference: paymentOrder.orderReference,
      paymentId: 'pay_master_e2e_wh',
    },
  };

  const webhookRes1 = await fetch(`${BASE_URL}/api/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });
  const webhookData1 = (await webhookRes1.json()) as any;
  assert.strictEqual(webhookRes1.status, 200, 'First webhook delivery must succeed');
  assert.strictEqual(webhookData1.data.duplicate, false);
  console.log('   ✅ Webhook event processed successfully.');

  const webhookRes2 = await fetch(`${BASE_URL}/api/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });
  assert.strictEqual(webhookRes2.status, 200, 'Duplicate webhook must return 200 without double processing');
  const webhookData2 = (await webhookRes2.json()) as any;
  assert.strictEqual(webhookData2.data.duplicate, true, 'Duplicate webhook event must be detected');
  console.log('   ✅ Idempotency Guard verified: Replay webhook cleanly ignored.');

  console.log('\n========================================================================');
  console.log('🎉 REVIEWTAP MASTER E2E AUDIT & VERIFICATION COMPLETED WITH 100% SUCCESS!');
  console.log('========================================================================\n');
}

runMasterE2ETests().catch((err) => {
  console.error('\n❌ Master E2E Test Failed:', err);
  process.exit(1);
});
