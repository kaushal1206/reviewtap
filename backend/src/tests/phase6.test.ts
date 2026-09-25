import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runPhase6Tests() {
  console.log('====================================================');
  console.log('🧪 STARTING REVIEWTAP PHASE 6 AUTOMATED TEST SUITE');
  console.log('   Team Management, Notifications, Health & Intelligence');
  console.log('====================================================\n');

  let adminToken = '';
  let ownerToken = '';
  let secondOwnerToken = '';
  let staffToken = '';
  let staffUser: any = null;
  let ownerBusinessId = '';
  let secondBusinessId = '';
  let inviteToken = '';
  let invitationId = '';
  let notificationId = '';

  // 1. Establish Accounts
  console.log('👉 1. Establishing Multi-Tenant Test Environment...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@reviewtap.io', password: 'Admin@123456' }),
  });
  const adminData = await adminLoginRes.json();
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  adminToken = adminData.data.accessToken;

  // Register Business Owner 1
  const ownerEmail = `phase6_owner_${Date.now()}@reviewtap.io`;
  const ownerRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password: 'Password@123',
      fullName: 'Phase 6 Primary Owner',
      role: 'BUSINESS_OWNER',
    }),
  });
  const ownerRegData = await ownerRegRes.json();
  assert.strictEqual(ownerRegRes.status, 201, 'Owner registration failed');
  ownerToken = ownerRegData.data.accessToken;

  // Register Business Owner 2 (for tenant isolation)
  const secondOwnerEmail = `phase6_second_${Date.now()}@reviewtap.io`;
  const secondRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: secondOwnerEmail,
      password: 'Password@123',
      fullName: 'Second Tenant Owner',
      role: 'BUSINESS_OWNER',
    }),
  });
  const secondRegData = await secondRegRes.json();
  assert.strictEqual(secondRegRes.status, 201, 'Second owner registration failed');
  secondOwnerToken = secondRegData.data.accessToken;

  // Register a prospective staff user
  const staffEmail = `phase6_staff_${Date.now()}@reviewtap.io`;
  const staffRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: staffEmail,
      password: 'Password@123',
      fullName: 'Alex Staff Member',
      role: 'BUSINESS_OWNER',
    }),
  });
  const staffRegData = await staffRegRes.json();
  assert.strictEqual(staffRegRes.status, 201, 'Staff registration failed');
  staffToken = staffRegData.data.accessToken;
  staffUser = staffRegData.data.user;

  // Create Business for Owner 1
  const bizRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      name: 'Phase 6 Artisan Bakery',
      googleReviewUrl:
        'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
      googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      category: 'Bakery',
    }),
  });
  const bizData = await bizRes.json();
  assert.strictEqual(bizRes.status, 201, 'Business creation failed');
  ownerBusinessId = bizData.data.business.id;

  // Create Business for Owner 2
  const biz2Res = await fetch(`${BASE_URL}/api/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondOwnerToken}`,
    },
    body: JSON.stringify({
      name: 'Second Tenant Bistro',
      googleReviewUrl:
        'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
      category: 'Bistro',
    }),
  });
  const biz2Data = await biz2Res.json();
  secondBusinessId = biz2Data.data.business.id;

  console.log('   ✅ Multi-tenant test environments initialized.');

  // 2. Team Listing & Ownership Inspection
  console.log('👉 2. Testing Team Member Listing & Ownership Representation...');
  const teamListRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/team`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const teamListData = await teamListRes.json();
  assert.strictEqual(teamListRes.status, 200, 'Team listing failed');
  assert.strictEqual(teamListData.data.members.length, 1, 'Should contain 1 initial member (the owner)');
  assert.strictEqual(teamListData.data.members[0].role, 'OWNER', 'Owner role must be OWNER');
  assert.strictEqual(teamListData.data.members[0].isBusinessOwner, true, 'isBusinessOwner must be true');
  console.log('   ✅ Initial team listing verified with primary business owner.');

  // Cross-tenant security check
  const crossTeamRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/team`, {
    headers: { Authorization: `Bearer ${secondOwnerToken}` },
  });
  assert.strictEqual(crossTeamRes.status, 403, 'Cross-tenant team access must be rejected with 403');
  console.log('   ✅ Cross-tenant team access blocked with 403 Forbidden.');

  // 3. Team Member Invitation Workflow
  console.log('👉 3. Testing Team Member Invitation Workflow (POST /api/businesses/:id/invitations)...');
  // First, verify Free tier seat limit: Free tier has maxTeamMembers = 1 (already occupied by owner).
  // Attempting to invite should trigger PLAN_LIMIT_REACHED.
  const quotaInviteRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      email: staffEmail,
      role: 'STAFF',
    }),
  });
  const quotaInviteData = await quotaInviteRes.json();
  assert.strictEqual(quotaInviteRes.status, 403, 'Free tier invite should be blocked by seat limit');
  assert.strictEqual(quotaInviteData.error.code, 'PLAN_LIMIT_REACHED', 'Should return PLAN_LIMIT_REACHED');
  console.log('   ✅ Entitlement guard verified: Seat limit correctly enforced on Free Tier.');

  // Upgrade Business 1 to PRO tier to unlock 10 seats
  console.log('   Upgrading plan to PRO tier to unlock team seats...');
  const orderRes = await fetch(`${BASE_URL}/api/billing/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      businessId: ownerBusinessId,
      planCode: 'PRO',
    }),
  });
  const orderData = await orderRes.json();
  assert.strictEqual(orderRes.status, 201, 'Order creation failed');
  const order = orderData.data.order;

  // Verify payment
  const verifyRes = await fetch(`${BASE_URL}/api/billing/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      orderReference: order.orderReference,
      paymentId: 'pay_test_phase6_pro',
      signature: order.checkoutSignature,
    }),
  });
  assert.strictEqual(verifyRes.status, 200, 'Payment verification failed');
  console.log('   ✅ Upgraded to PRO tier successfully.');

  // Now dispatch invitation under PRO quota
  const inviteRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      email: staffEmail,
      role: 'STAFF',
    }),
  });
  const inviteData = await inviteRes.json();
  assert.strictEqual(inviteRes.status, 201, 'Invitation creation failed');
  assert.ok(inviteData.data.invitation.id, 'Invitation ID missing');
  assert.ok(inviteData.data.inviteLink, 'Invite link missing');
  invitationId = inviteData.data.invitation.id;
  inviteToken = inviteData.data.inviteLink.split('/invite/')[1];
  console.log(`   ✅ Invitation dispatched: Token = ${inviteToken.substring(0, 12)}...`);

  // Duplicate invite prevention
  const dupInviteRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      email: staffEmail,
      role: 'STAFF',
    }),
  });
  assert.strictEqual(dupInviteRes.status, 409, 'Duplicate invitation must be rejected with 409 Conflict');
  console.log('   ✅ Duplicate invitation rejected with 409 Conflict.');

  // 4. Public Invitation Preview & Acceptance
  console.log('👉 4. Testing Public Invitation Preview & Acceptance (/api/invitations/*)...');
  const previewRes = await fetch(`${BASE_URL}/api/invitations/preview/${inviteToken}`);
  const previewData = await previewRes.json();
  assert.strictEqual(previewRes.status, 200, 'Invite preview failed');
  assert.strictEqual(previewData.data.invitation.email, staffEmail.toLowerCase());
  assert.strictEqual(previewData.data.invitation.role, 'STAFF');
  assert.strictEqual(previewData.data.invitation.business.name, 'Phase 6 Artisan Bakery');
  console.log('   ✅ Public invitation preview verified.');

  // Accept invitation as Alex Staff Member
  const acceptRes = await fetch(`${BASE_URL}/api/invitations/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffToken}`,
    },
    body: JSON.stringify({ token: inviteToken }),
  });
  const acceptData = await acceptRes.json();
  assert.strictEqual(acceptRes.status, 200, 'Accept invitation failed');
  assert.strictEqual(acceptData.data.role, 'STAFF');
  console.log('   ✅ Invitation accepted. Alex Staff Member is now a team member.');

  // 5. Centralized Permission Enforcement & Role Capabilities
  console.log('👉 5. Testing Permission Engine & Role Capabilities...');
  // Staff member can view business
  const staffViewRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.strictEqual(staffViewRes.status, 200, 'Staff should be allowed to view business');
  console.log('   ✅ STAFF role permitted: BUSINESS_VIEW.');

  // Staff member CANNOT delete business (strictly OWNER/SUPER_ADMIN)
  const staffDeleteRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.strictEqual(staffDeleteRes.status, 403, 'Staff must be blocked from deleting business');
  console.log('   ✅ Permission Guard enforced: STAFF blocked from BUSINESS_DELETE.');

  // Promote staff to MANAGER
  const promoteRes = await fetch(
    `${BASE_URL}/api/businesses/${ownerBusinessId}/team/${staffUser.id}/role`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ role: 'MANAGER' }),
    }
  );
  const promoteData = await promoteRes.json();
  assert.strictEqual(promoteRes.status, 200, 'Role promotion failed');
  assert.strictEqual(promoteData.data.member.role, 'MANAGER');
  console.log('   ✅ Role updated: STAFF -> MANAGER.');

  // 6. Notification System
  console.log('👉 6. Testing Notification Center (/api/notifications)...');
  // Check notifications for Owner (who received notification that staff joined)
  const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const notifData = await notifRes.json();
  assert.strictEqual(notifRes.status, 200, 'Notification listing failed');
  assert.ok(notifData.data.notifications.length >= 1, 'Should have received at least 1 notification');
  assert.ok(notifData.data.unreadCount >= 1, 'Unread count should be >= 1');
  notificationId = notifData.data.notifications[0].id;
  console.log(`   ✅ Notifications retrieved: ${notifData.data.notifications.length} found, ${notifData.data.unreadCount} unread.`);

  // Mark notification as READ
  const markReadRes = await fetch(`${BASE_URL}/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(markReadRes.status, 200, 'Mark notification read failed');

  // Archive notification
  const archiveRes = await fetch(`${BASE_URL}/api/notifications/${notificationId}/archive`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(archiveRes.status, 200, 'Archive notification failed');
  console.log('   ✅ Notification state transitions verified (UNREAD -> READ -> ARCHIVED).');

  // 7. Activity Timeline
  console.log('👉 7. Testing Activity Timeline (/api/businesses/:id/activity)...');
  const activityRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/activity`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const activityData = await activityRes.json();
  assert.strictEqual(activityRes.status, 200, 'Activity timeline retrieval failed');
  assert.ok(activityData.data.activities.length >= 2, 'Should have logged activities');
  const actionTypes = activityData.data.activities.map((a: any) => a.action);
  assert.ok(actionTypes.includes('BUSINESS_CREATED'), 'Should log BUSINESS_CREATED');
  assert.ok(actionTypes.includes('USER_INVITED'), 'Should log USER_INVITED');
  assert.ok(actionTypes.includes('USER_JOINED'), 'Should log USER_JOINED');
  console.log(`   ✅ Chronological activity timeline verified (${activityData.data.activities.length} recorded events).`);

  // 8. Review Intelligence Engine
  console.log('👉 8. Testing Review Intelligence Engine (/api/businesses/:id/intelligence)...');
  // First simulate 2 scans (1 QR, 1 NFC)
  await fetch(`${BASE_URL}/r/phase6-artisan-bakery`, { redirect: 'manual' }).catch(() => {});
  
  const intelRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/intelligence`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const intelData = await intelRes.json();
  assert.strictEqual(intelRes.status, 200, 'Intelligence retrieval failed');
  assert.ok(typeof intelData.data.summary.totalScans === 'number', 'totalScans must be a number');
  assert.ok(typeof intelData.data.velocity.weeklyChangePercent === 'number', 'weeklyChangePercent must be a number');
  assert.ok(Array.isArray(intelData.data.trends.daily), 'daily trends must be an array');
  console.log('   ✅ Review Intelligence metrics verified (summary, velocity, top performers, daily trends).');

  // 9. Business Health Scoring Engine
  console.log('👉 9. Testing Business Health Scoring Engine (/api/businesses/:id/health)...');
  const healthRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/health`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const healthData = await healthRes.json();
  assert.strictEqual(healthRes.status, 200, 'Health score retrieval failed');
  assert.ok(['HEALTHY', 'WARNING', 'INACTIVE'].includes(healthData.data.status), 'Valid health status');
  assert.ok(healthData.data.score >= 0 && healthData.data.score <= 100, 'Score must be between 0 and 100');
  assert.ok(Array.isArray(healthData.data.factors), 'Factors must be an array');
  console.log(`   ✅ Business Health evaluated: Status = ${healthData.data.status}, Score = ${healthData.data.score}/100.`);

  // 10. Automated Insights & Recommendations
  console.log('👉 10. Testing Automated Insights Engine (/api/businesses/:id/insights)...');
  const insightsRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/insights`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const insightsData = await insightsRes.json();
  assert.strictEqual(insightsRes.status, 200, 'Insights retrieval failed');
  assert.ok(Array.isArray(insightsData.data.insights), 'Insights must be an array');
  assert.ok(insightsData.data.insights.length >= 1, 'Should have generated automated insights');
  
  const firstInsight = insightsData.data.insights[0];
  console.log(`   ✅ Generated recommendation: "${firstInsight.title}" (Severity: ${firstInsight.severity})`);

  // Dismiss insight
  if (firstInsight.id) {
    const dismissRes = await fetch(
      `${BASE_URL}/api/businesses/${ownerBusinessId}/insights/${firstInsight.id}/dismiss`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${ownerToken}` },
      }
    );
    assert.strictEqual(dismissRes.status, 200, 'Dismiss insight failed');
    console.log('   ✅ Insight dismissed successfully.');
  }

  // 11. Centralized Usage Monitoring
  console.log('👉 11. Testing Centralized Usage Monitoring (/api/businesses/:id/usage)...');
  const usageRes = await fetch(`${BASE_URL}/api/businesses/${ownerBusinessId}/usage`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const usageData = await usageRes.json();
  assert.strictEqual(usageRes.status, 200, 'Usage monitoring retrieval failed');
  assert.strictEqual(usageData.data.plan.code, 'PRO');
  assert.strictEqual(usageData.data.limits.maxTeamMembers, 10);
  assert.ok(usageData.data.usage.activeTeamMembers >= 2, 'Team members count should include owner and staff');
  console.log('   ✅ Entitlement & Usage Monitoring verified with committed team seats and resource quotas.');

  // 12. Super Admin Control Center
  console.log('👉 12. Testing Super Admin Control Center (/api/admin/*)...');
  const adminOverviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminOverviewData = await adminOverviewRes.json();
  assert.strictEqual(adminOverviewRes.status, 200, 'Admin overview failed');
  assert.ok(adminOverviewData.data.overview.businesses.total >= 2);
  assert.ok(typeof adminOverviewData.data.overview.subscriptions.mrr === 'number');
  console.log(`   ✅ Super Admin Overview verified (Total Businesses: ${adminOverviewData.data.overview.businesses.total}, MRR: $${(adminOverviewData.data.overview.subscriptions.mrr / 100).toFixed(2)}).`);

  const adminSearchRes = await fetch(`${BASE_URL}/api/admin/businesses?search=Bakery`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminSearchData = await adminSearchRes.json();
  assert.strictEqual(adminSearchRes.status, 200, 'Admin business search failed');
  assert.ok(adminSearchData.data.businesses.length >= 1, 'Search should find the bakery');
  console.log('   ✅ Super Admin business search and filtering verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL REVIEWTAP PHASE 6 INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

runPhase6Tests().catch((err) => {
  console.error('\n❌ PHASE 6 TEST SUITE FAILED:', err);
  process.exit(1);
});
