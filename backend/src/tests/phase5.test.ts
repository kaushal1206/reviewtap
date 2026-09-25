import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('🧪 STARTING REVIEWTAP PHASE 5 AUTOMATED TEST SUITE');
  console.log('   Payments, Invoicing, Billing History & Idempotency');
  console.log('====================================================\n');

  let adminToken = '';
  let ownerToken = '';
  let secondOwnerToken = '';
  let ownerBusinessId = '';
  let secondOwnerBusinessId = '';

  // 1. Authenticate & Setup Tenants
  console.log('👉 1. Establishing Multi-Tenant Test Environment...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@reviewtap.io', password: 'Admin@123456' }),
  });
  const adminLoginData = (await adminLoginRes.json()) as any;
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  adminToken = adminLoginData.data.accessToken;

  // Register Dedicated Primary Owner for Phase 5 Test Run
  const ownerEmail = `phase5_owner_${Date.now()}@test.com`;
  const ownerRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password: 'Password@123',
      fullName: 'Marcus Vance Phase 5',
      role: 'BUSINESS_OWNER',
    }),
  });
  const ownerRegData = (await ownerRegRes.json()) as any;
  assert.strictEqual(ownerRegRes.status, 201, 'Owner registration failed');
  ownerToken = ownerRegData.data.accessToken;

  // Create Primary Business for Owner
  const ownerCreateBizRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: `Artisan Roastery ${Date.now()}`,
      googleReviewUrl: 'https://g.page/r/phase5-p1/review',
      slug: `artisan-p5-${Date.now()}`,
    }),
  });
  const ownerCreateBizData = (await ownerCreateBizRes.json()) as any;
  assert.strictEqual(ownerCreateBizRes.status, 201, 'Owner business creation failed');
  ownerBusinessId = ownerCreateBizData.data.business.id;

  // Register Second Tenant
  const secondEmail = `phase5_tenant_${Date.now()}@test.com`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: secondEmail,
      password: 'Password@123',
      fullName: 'Tenant Two Phase 5',
      role: 'BUSINESS_OWNER',
    }),
  });
  const registerData = (await registerRes.json()) as any;
  assert.strictEqual(registerRes.status, 201);
  secondOwnerToken = registerData.data.accessToken;

  const createBizRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      name: `Second Roastery ${Date.now()}`,
      googleReviewUrl: 'https://g.page/r/phase5-test/review',
      slug: `phase5-second-${Date.now()}`,
    }),
  });
  const createBizData = (await createBizRes.json()) as any;
  secondOwnerBusinessId = createBizData.data.business.id;

  console.log('   ✅ Multi-tenant test accounts & businesses established.');

  // 2. Authoritative Payment Order Creation
  console.log('\n👉 2. Testing Server-Authoritative Payment Order Creation (POST /api/billing/orders)...');

  // Negative test: Client cannot order for business they do not own
  const crossTenantOrderRes = await fetch(`${BASE_URL}/api/billing/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      businessId: ownerBusinessId, // Attempting to charge another merchant's business
      planCode: 'PRO',
    }),
  });
  assert.strictEqual(crossTenantOrderRes.status, 403, 'Cross-tenant order must be blocked with 403 Forbidden');
  console.log('   ✅ Multi-tenant boundary enforced: Cross-tenant order creation rejected with 403.');

  // Valid Order Creation for Owner Business -> PRO Plan
  const createOrderRes = await fetch(`${BASE_URL}/api/billing/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      businessId: ownerBusinessId,
      planCode: 'PRO',
      // Notice: Client does NOT send amount. Amount is server authoritative.
    }),
  });
  const createOrderData = (await createOrderRes.json()) as any;
  assert.strictEqual(createOrderRes.status, 201, 'Order creation failed');
  assert.strictEqual(createOrderData.success, true);
  const order = createOrderData.data.order;
  assert.ok(order.orderReference.startsWith('RT-ORD-'), 'Must generate RT-ORD- reference');
  assert.strictEqual(order.amount, 3900, 'PRO tier price must strictly be 3900 cents ($39.00)');
  assert.strictEqual(order.currency, 'USD');
  assert.strictEqual(order.status, 'PENDING');
  assert.ok(order.checkoutSignature, 'Checkout signature must be provided');
  console.log(`   ✅ Authoritative Payment Order created: ${order.orderReference} ($39.00 USD, Status: PENDING).`);

  // 3. Payment Verification & Atomic Subscription Activation
  console.log('\n👉 3. Testing Payment Verification & Subscription Activation (POST /api/billing/verify)...');

  // Negative test: Invalid signature must be rejected
  const invalidSigRes = await fetch(`${BASE_URL}/api/billing/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      orderReference: order.orderReference,
      signature: 'tampered_fake_signature_xyz',
    }),
  });
  assert.strictEqual(invalidSigRes.status, 400, 'Invalid signature must be rejected');
  console.log('   ✅ Cryptographic verification: Tampered signature rejected with 400.');

  // Positive test: Valid proof / signature
  const verifyRes = await fetch(`${BASE_URL}/api/billing/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      orderReference: order.orderReference,
      signature: order.checkoutSignature,
      gatewayPaymentId: 'pay_sim_success_7789',
    }),
  });
  const verifyData = (await verifyRes.json()) as any;
  assert.strictEqual(verifyRes.status, 200, 'Payment verification failed');
  assert.strictEqual(verifyData.success, true);
  assert.strictEqual(verifyData.data.order.status, 'COMPLETED');
  assert.strictEqual(verifyData.data.subscription.plan.code, 'PRO');
  assert.strictEqual(verifyData.data.subscription.status, 'ACTIVE');
  assert.ok(verifyData.data.invoice, 'Invoice must be returned');
  assert.ok(verifyData.data.invoice.invoiceNumber.startsWith('RT-INV-'), 'Invoice number format valid');
  assert.strictEqual(verifyData.data.invoice.amount, 3900);
  assert.strictEqual(verifyData.data.invoice.status, 'PAID');
  console.log(`   ✅ Payment verified! Subscription upgraded to PRO. Invoice issued: ${verifyData.data.invoice.invoiceNumber}.`);

  // Idempotency test: Re-verifying completed order returns idempotent success
  const duplicateVerifyRes = await fetch(`${BASE_URL}/api/billing/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      orderReference: order.orderReference,
      signature: order.checkoutSignature,
    }),
  });
  const duplicateVerifyData = (await duplicateVerifyRes.json()) as any;
  assert.strictEqual(duplicateVerifyRes.status, 200);
  assert.strictEqual(duplicateVerifyData.data.idempotent, true, 'Re-verifying must return idempotent status');
  console.log('   ✅ Idempotent verification guard verified: Re-submitting returns idempotent state.');

  // 4. Invoicing & Billing History Retrieval
  console.log('\n👉 4. Testing Invoicing & Billing History (GET /api/billing/invoices)...');

  // Owner listing invoices
  const invoicesRes = await fetch(`${BASE_URL}/api/billing/invoices?businessId=${ownerBusinessId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const invoicesData = (await invoicesRes.json()) as any;
  assert.strictEqual(invoicesRes.status, 200);
  assert.ok(Array.isArray(invoicesData.data.invoices));
  assert.ok(invoicesData.data.invoices.length >= 1);
  const firstInvoice = invoicesData.data.invoices[0];
  assert.strictEqual(firstInvoice.amount, 3900);
  assert.strictEqual(firstInvoice.planCode, 'PRO');
  assert.strictEqual(firstInvoice.status, 'PAID');
  console.log(`   ✅ Billing History retrieved: ${invoicesData.data.invoices.length} invoices found.`);

  // Negative test: Cross-tenant invoice access
  const crossInvoicesRes = await fetch(`${BASE_URL}/api/billing/invoices?businessId=${ownerBusinessId}`, {
    headers: { Authorization: `Bearer ${secondOwnerToken}` },
  });
  assert.strictEqual(crossInvoicesRes.status, 403, 'Cross-tenant invoice access must return 403');
  console.log('   ✅ Multi-tenant isolation verified: Cross-tenant invoice access blocked.');

  // Single Invoice Lookup
  const singleInvRes = await fetch(`${BASE_URL}/api/billing/invoices/${firstInvoice.id}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const singleInvData = (await singleInvRes.json()) as any;
  assert.strictEqual(singleInvRes.status, 200);
  assert.strictEqual(singleInvData.data.invoice.id, firstInvoice.id);
  console.log(`   ✅ Single invoice details retrieved: ${singleInvData.data.invoice.invoiceNumber}.`);

  // 5. Downgrade Safety (Rule 20)
  console.log('\n👉 5. Testing Downgrade Safety & Invariant Preservation...');
  // Provision an NFC card under PRO tier
  const provisionNfcRes = await fetch(`${BASE_URL}/api/nfc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      label: 'Phase 5 Test Stand NFC',
      businessId: ownerBusinessId,
      activateImmediately: true,
    }),
  });
  const provisionNfcData = (await provisionNfcRes.json()) as any;
  assert.strictEqual(provisionNfcRes.status, 201);
  const cardPublicId = provisionNfcData.data.card.publicId;

  // Downgrade to STARTER
  const downgradeOrderRes = await fetch(`${BASE_URL}/api/billing/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      businessId: ownerBusinessId,
      planCode: 'STARTER',
    }),
  });
  const downgradeOrderData = (await downgradeOrderRes.json()) as any;
  assert.strictEqual(downgradeOrderRes.status, 201);
  const downgradeOrder = downgradeOrderData.data.order;
  assert.strictEqual(downgradeOrder.amount, 1500, 'Starter plan price must be 1500 cents ($15.00)');

  // Verify payment for downgrade
  const verifyDowngradeRes = await fetch(`${BASE_URL}/api/billing/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      orderReference: downgradeOrder.orderReference,
      signature: downgradeOrder.checkoutSignature,
    }),
  });
  assert.strictEqual(verifyDowngradeRes.status, 200);

  // INVARIANT CHECK: Existing NFC card MUST remain ACTIVE and redirect successfully!
  const nfcRedirectRes = await fetch(`${BASE_URL}/r/nfc/${cardPublicId}`, {
    redirect: 'manual',
  });
  assert.strictEqual(nfcRedirectRes.status, 302, 'NFC card redirect must remain 302 after downgrade');
  console.log('   ✅ Downgrade Safety Verified: Existing NFC card remains active and redirects seamlessly.');

  // 6. Webhook Idempotency & Duplicate Protection
  console.log('\n👉 6. Testing Webhook Receiver & Idempotency Protection (POST /api/billing/webhook)...');

  // Create an order for tenant 2 to test webhook payment processing
  const t2OrderRes = await fetch(`${BASE_URL}/api/billing/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      businessId: secondOwnerBusinessId,
      planCode: 'STARTER',
    }),
  });
  const t2OrderData = (await t2OrderRes.json()) as any;
  const t2OrderRef = t2OrderData.data.order.orderReference;

  const eventId = `evt_test_${Date.now()}`;
  const webhookPayload = {
    provider: 'STRIPE',
    eventId,
    eventType: 'order.paid',
    payload: {
      orderReference: t2OrderRef,
      paymentId: 'wh_pay_ext_999',
    },
  };

  // First webhook delivery
  const whRes1 = await fetch(`${BASE_URL}/api/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });
  const whData1 = (await whRes1.json()) as any;
  assert.strictEqual(whRes1.status, 200);
  assert.strictEqual(whData1.data.success, true);
  assert.strictEqual(whData1.data.duplicate, false);
  console.log(`   ✅ Webhook event '${eventId}' processed successfully.`);

  // Second delivery of identical event (Idempotency Test)
  const whRes2 = await fetch(`${BASE_URL}/api/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });
  const whData2 = (await whRes2.json()) as any;
  assert.strictEqual(whRes2.status, 200);
  assert.strictEqual(whData2.data.duplicate, true, 'Duplicate webhook event must be detected');
  console.log('   ✅ Idempotency guard verified: Duplicate webhook event safely ignored without duplicate execution.');

  console.log('\n====================================================');
  console.log('🎉 ALL REVIEWTAP PHASE 5 AUTOMATED INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

runPhase5Tests().catch((err) => {
  console.error('❌ Phase 5 Test Suite Failed:', err);
  process.exit(1);
});
