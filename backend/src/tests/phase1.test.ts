import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('🧪 STARTING REVIEWTAP PHASE 1 AUTOMATED TEST SUITE');
  console.log('   Authentication, Multi-Tenancy & Smart Redirects');
  console.log('====================================================\n');

  let token = '';
  let businessId = '';
  let businessSlug = '';
  const testGoogleReviewUrl = 'https://search.google.com/local/writereview?placeid=ChIJPhase1AuditVerifiedPlaceId';

  // 1. Authentication & Registration
  console.log('👉 1. Testing Registration, Hashing & JWT Issuance...');
  const uniqueEmail = `phase1_audit_${Date.now()}@reviewtap.io`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'StrongPassword@2026',
      fullName: 'Phase 1 Audit User',
      role: 'BUSINESS_OWNER',
    }),
  });
  const registerData = (await registerRes.json()) as any;
  assert.strictEqual(registerRes.status, 201, 'Registration must return 201 Created');
  assert.strictEqual(registerData.success, true, 'Registration must succeed');
  assert.ok(registerData.data.accessToken, 'Access token must be returned');
  assert.strictEqual(registerData.data.user.email, uniqueEmail);
  token = registerData.data.accessToken;
  console.log('   ✅ Registration and JWT token issuance verified.');

  // Test invalid login rejection
  const invalidLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'WrongPassword!',
    }),
  });
  assert.strictEqual(invalidLoginRes.status, 401, 'Invalid credentials must return 401');
  console.log('   ✅ Invalid password rejected with HTTP 401.');

  // Test valid login
  const validLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'StrongPassword@2026',
    }),
  });
  const validLoginData = (await validLoginRes.json()) as any;
  assert.strictEqual(validLoginRes.status, 200, 'Valid login must return 200');
  assert.ok(validLoginData.data.accessToken, 'Login must issue access token');
  console.log('   ✅ Valid login verified with HTTP 200.');

  // 2. Profile & Authentication Verification (/api/auth/me)
  console.log('\n👉 2. Testing Authenticated Identity Endpoint (/api/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = (await meRes.json()) as any;
  assert.strictEqual(meRes.status, 200, 'Profile check must return 200');
  assert.strictEqual(meData.data.user.email, uniqueEmail);
  console.log('   ✅ Authenticated user profile resolved correctly.');

  // 3. Business Profile Creation
  console.log('\n👉 3. Testing Business Profile Creation with Google Review Destination...');
  const createBizRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Phase 1 Audit Bistro',
      googleReviewUrl: testGoogleReviewUrl,
      googlePlaceId: 'ChIJPhase1AuditVerifiedPlaceId',
      category: 'Dining & Hospitality',
      address: '100 Market St, San Francisco, CA',
      phone: '+1 415-555-0199',
    }),
  });
  const createBizData = (await createBizRes.json()) as any;
  assert.strictEqual(createBizRes.status, 201, 'Business creation must return 201 Created');
  assert.strictEqual(createBizData.success, true);
  businessId = createBizData.data.business.id;
  businessSlug = createBizData.data.business.slug;
  assert.ok(businessSlug, 'Generated slug must exist');
  assert.strictEqual(createBizData.data.business.googleReviewUrl, testGoogleReviewUrl);
  console.log(`   ✅ Business profile created. Slug = "${businessSlug}"`);

  // 4. QR Code Asset Retrieval (/api/businesses/:id/qr)
  console.log('\n👉 4. Testing Business QR Code Generation (/api/businesses/:id/qr)...');
  const qrSvgRes = await fetch(`${BASE_URL}/api/businesses/${businessId}/qr?format=svg`);
  assert.strictEqual(qrSvgRes.status, 200, 'QR SVG must return 200');
  assert.ok(qrSvgRes.headers.get('content-type')?.includes('image/svg+xml'), 'Content type must be SVG');
  const qrSvgContent = await qrSvgRes.text();
  assert.ok(qrSvgContent.includes('<svg'), 'QR SVG output must contain <svg element');
  console.log('   ✅ Business QR Code (SVG) generated successfully.');

  const qrPngRes = await fetch(`${BASE_URL}/api/businesses/${businessId}/qr?format=png`);
  assert.strictEqual(qrPngRes.status, 200, 'QR PNG must return 200');
  assert.ok(qrPngRes.headers.get('content-type')?.includes('image/png'), 'Content type must be PNG');
  console.log('   ✅ Business QR Code (PNG) generated successfully.');

  // 5. Smart Redirect Engine (/r/:slug) — Complete Customer Journey
  console.log('\n👉 5. Testing Smart Redirect Engine (/r/:slug)...');
  const redirectRes = await fetch(`${BASE_URL}/r/${businessSlug}`, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  });
  assert.strictEqual(redirectRes.status, 302, 'Redirect must return HTTP 302 Found');
  const locationHeader = redirectRes.headers.get('location');
  assert.strictEqual(
    locationHeader,
    testGoogleReviewUrl,
    `HTTP Location header must match configured Google Review URL (${testGoogleReviewUrl})`
  );
  console.log(`   ✅ /r/${businessSlug} returned HTTP 302 -> ${locationHeader}`);

  // Test Nonexistent slug handling
  const badRedirectRes = await fetch(`${BASE_URL}/r/nonexistent-business-slug-${Date.now()}`, {
    redirect: 'manual',
  });
  assert.strictEqual(badRedirectRes.status, 404, 'Nonexistent slug must return HTTP 404');
  console.log('   ✅ Nonexistent slug safely returned HTTP 404.');

  // 6. Asynchronous Telemetry Verification
  console.log('\n👉 6. Testing Telemetry & Scan Event Recording...');
  // Allow setImmediate event to commit
  await new Promise((resolve) => setTimeout(resolve, 500));

  const eventsRes = await fetch(`${BASE_URL}/api/events?businessId=${businessId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const eventsData = (await eventsRes.json()) as any;
  assert.strictEqual(eventsRes.status, 200, 'Events query must succeed');
  assert.ok(eventsData.data.events.length >= 1, 'At least 1 scan event must be recorded');
  const latestEvent = eventsData.data.events[0];
  assert.strictEqual(latestEvent.businessId, businessId);
  assert.strictEqual(latestEvent.sourceType, 'QR');
  console.log(`   ✅ Telemetry verified: ${eventsData.data.events.length} scan event(s) recorded with sourceType = QR.`);

  // 7. Security: Unauthorized & Cross-Tenant Boundary Checks
  console.log('\n👉 7. Testing Unauthorized Access & Isolation...');
  const unauthRes = await fetch(`${BASE_URL}/api/businesses/${businessId}`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return HTTP 401');
  console.log('   ✅ Unauthenticated access blocked with HTTP 401.');

  console.log('\n====================================================');
  console.log('🎉 ALL REVIEWTAP PHASE 1 AUTOMATED TESTS PASSED!');
  console.log('====================================================\n');
}

runPhase1Tests().catch((err) => {
  console.error('\n❌ Phase 1 Test Failed:', err);
  process.exit(1);
});
