# REVIEWTAP — PHASE 4 ARCHITECTURE READINESS AUDIT
**Subscription, Plans, Usage Limits & SaaS Billing Foundation**

**Audit Date:** 2026-09-21  
**Authoritative Standard:** [docs/standards/codingStandard.md](../standards/codingStandard.md)  
**Status:** AUDIT COMPLETE — READY FOR IMPLEMENTATION  

---

## 1. Executive Summary

Phase 4 establishes the commercial foundation of the ReviewTap SaaS platform: configurable subscription plans, multi-tenant subscription lifecycles, database-backed usage tracking, centralized capability/limit enforcement, and billing-ready domain modeling.

This audit evaluates the codebase across Phase 1 (Foundation & Auth), Phase 2 (Business & QR Management), and Phase 3 (NFC Hardware Lifecycle), verifying how subscription and billing concepts will integrate seamlessly without breaking existing functionality, redirect throughput, or data integrity.

---

## 2. Codebase & Subsystem Inspection

### 2.1 Authentication & Authorization (`users`, `refresh_tokens`)
- **Current Model:** `User` has `id`, `email`, `fullName`, `passwordHash`, `role` (`SUPER_ADMIN` | `BUSINESS_OWNER`), `isActive`.
- **JWT Middleware:** `authenticateToken` extracts user identity (`req.user = { id, email, role }`).
- **Role Enforcement:** `requireRole` protects administrative endpoints (`SUPER_ADMIN`).
- **Phase 4 Alignment:**
  - `SUPER_ADMIN` will manage system plans (`GET/POST/PATCH /api/admin/plans`) and inspect global subscriptions.
  - `BUSINESS_OWNER` can view their own subscriptions, plans, and real-time usage metrics. Cross-tenant subscription inspection or tampering is strictly blocked at the service and repository layers.

### 2.2 Business Domain (`businesses`)
- **Current Model:** `Business` belongs to `User` (`ownerId`). Has `id`, `name`, `slug`, `googleReviewUrl`, `status`, `brandingSettings`.
- **Current CRUD:** `BusinessService.createBusiness` creates the business and its initial default `TapSource` (QR code).
- **Phase 4 Alignment:**
  - `Business` will have a 1-to-1 relation with `Subscription` (`subscription Subscription?`).
  - When a new business is created, it will be automatically provisioned with a default `FREE` subscription with a 30-day rolling period.
  - For existing businesses created in earlier phases, the subscription resolver will implement lazy self-healing: if no subscription exists, an active `FREE` subscription is automatically created, preventing breaking changes or null dereferencing.

### 2.3 QR & TapSource Domain (`tap_sources`)
- **Current Model:** `TapSource` has `businessId`, `shortCode`, `type` (`QR_CODE`, `COUNTERTOP_STAND`, etc.), `isActive`.
- **Phase 4 Alignment:**
  - Creation of additional QR / countertop stands will be gated by the business's active plan `maxQrSources` limit.
  - Existing QR redirects (`/r/:slug`) will remain 100% unaffected. The redirect engine must NEVER be blocked or degraded by billing checks.

### 2.4 NFC Fleet Domain (`nfc_cards`)
- **Current Model:** `NfcCard` has `publicId`, `label`, `status` (`UNASSIGNED`, `ASSIGNED`, `ACTIVE`, `INACTIVE`, `RETIRED`), `businessId`, `batchNumber`.
- **Phase 4 Alignment:**
  - When creating an assigned card or assigning an unassigned card to a business, `NfcService` will check the business's active plan `maxNfcCards` limit.
  - If the limit is reached, a structured error `PLAN_LIMIT_REACHED` is returned with current usage and max allowed.
  - Existing NFC redirects (`/r/nfc/:publicId`) remain 100% active and fast. Downgrading a plan will not delete or deactivate existing cards (Downgrade Safety, Section 20); it only blocks provisioning or assigning new ones.

### 2.5 Analytics & Telemetry Domain (`scan_events`)
- **Current Model:** Single authoritative event store: `ScanEvent` (`businessId`, `tapSourceId`, `nfcCardId`, `sourceType`, `createdAt`, `ipHash`, `deviceType`, `os`, `browser`).
- **Phase 4 Alignment:**
  - Usage tracking will calculate monthly scan/tap volume directly from `ScanEvent` using indexed queries (`COUNT` with `businessId` and `createdAt` between `currentPeriodStart` and `currentPeriodEnd`).
  - No redundant `billing_events` table will be created, adhering to Section 11 and Section 23 of the prompt.
  - Analytics time-range queries (`getTrends`) will respect `analyticsRetentionDays` based on the active plan.

---

## 3. Plan & Subscription Data Architecture

### 3.1 Proposed Prisma Schema

```prisma
enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  EXPIRED
}

enum BillingInterval {
  MONTHLY
  YEARLY
}

model Plan {
  id                     String          @id @default(uuid())
  code                   String          @unique // e.g. FREE, STARTER, PRO, BUSINESS
  name                   String          // Display Name: e.g. "Free Tier", "Pro Growth"
  description            String?
  price                  Int             @default(0) // Price in cents (e.g. 0, 1900 for $19.00)
  currency               String          @default("USD")
  billingInterval        BillingInterval @default(MONTHLY)
  isActive               Boolean         @default(true)
  isDefault              Boolean         @default(false) // Marks the default plan for new businesses
  
  // Configurable Plan Limits & Capabilities
  maxBusinesses          Int             @default(1)
  maxQrSources           Int             @default(1)
  maxNfcCards            Int             @default(1)
  maxMonthlyEvents       Int             @default(500)
  analyticsRetentionDays Int             @default(14)
  customBranding         Boolean         @default(false)
  exportAnalytics        Boolean         @default(false)
  prioritySupport        Boolean         @default(false)
  
  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt

  subscriptions          Subscription[]

  @@index([code])
  @@index([isActive])
  @@map("plans")
}

model Subscription {
  id                     String             @id @default(uuid())
  businessId             String             @unique
  planId                 String
  status                 SubscriptionStatus @default(ACTIVE)
  currentPeriodStart     DateTime           @default(now())
  currentPeriodEnd       DateTime
  cancelAtPeriodEnd      Boolean            @default(false)
  canceledAt             DateTime?
  
  // Future Gateway Placeholders (Billing-Ready, non-simulated)
  gatewayCustomerId      String?
  gatewaySubscriptionId  String?
  
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt

  business               Business           @relation(fields: [businessId], references: [id], onDelete: Cascade)
  plan                   Plan               @relation(fields: [planId], references: [id], onDelete: Restrict)

  @@index([businessId])
  @@index([planId])
  @@index([status])
  @@index([currentPeriodEnd])
  @@map("subscriptions")
}
```

---

## 4. Centralized Entitlement & Limit Engine

To prevent scattering `if (plan === 'PRO')` across controllers, a dedicated `EntitlementService` will be introduced:

```text
EntitlementService
 ├── getBusinessSubscription(businessId)
 ├── getBusinessUsage(businessId)
 ├── checkResourceLimit(businessId, 'NFC_CARD' | 'QR_SOURCE')
 ├── checkOwnerBusinessLimit(ownerId)
 ├── checkFeatureAccess(businessId, 'CUSTOM_BRANDING' | 'EXPORT_ANALYTICS')
 └── getEntitlementSummary(businessId)
```

### 4.1 Structured Limit Error Format
When a plan limit is reached:
```json
{
  "success": false,
  "error": {
    "code": "PLAN_LIMIT_REACHED",
    "message": "Your current plan has reached its NFC card limit (1/1). Please upgrade your subscription to add more cards.",
    "details": {
      "resource": "NFC_CARD",
      "current": 1,
      "limit": 1,
      "planCode": "FREE"
    }
  }
}
```

---

## 5. Non-Destructive Migration Strategy
1. The schema changes introduce **only additions**: two new models (`Plan`, `Subscription`), two new enums, and a 1-to-1 relation on `Business`.
2. Existing tables (`users`, `businesses`, `tap_sources`, `nfc_cards`, `scan_events`) remain completely intact.
3. Seed logic will idempotently upsert standard seed plans:
   - `FREE`: $0/mo, 1 business, 1 QR, 1 NFC card, 500 scans/mo, 14-day analytics.
   - `STARTER`: $15/mo, 3 businesses, 3 QRs, 5 NFC cards, 5,000 scans/mo, 30-day analytics, export analytics.
   - `PRO`: $39/mo, 10 businesses, 10 QRs, 20 NFC cards, 25,000 scans/mo, 90-day analytics, custom branding, export analytics.
   - `BUSINESS`: $99/mo, 50 businesses, 50 QRs, 100 NFC cards, 100,000 scans/mo, 365-day analytics, custom branding, export analytics, priority support.
4. An automated backfill script/seed will ensure all existing businesses receive an active `FREE` subscription.

---

## 6. Verification Plan & Test Strategy
- Automated backend integration tests in `backend/src/tests/phase4.test.ts`:
  1. Default subscription assignment on business creation.
  2. Plan listing (`GET /api/subscription/plans`).
  3. Subscription retrieval with live usage stats (`GET /api/subscription`).
  4. NFC limit enforcement (creating card beyond limit fails with `PLAN_LIMIT_REACHED`).
  5. Multi-tenant isolation (Owner B cannot view/change Owner A's subscription).
  6. Plan change workflow (upgrade/downgrade).
  7. Cancellation and reactivation state machine.
  8. Admin plan management (Super Admin create/edit/toggle plans).
  9. Invariant checks: Existing redirects (`/r/:slug` and `/r/nfc/:publicId`) continue to execute without interruption.
- Regression testing of Phase 1, Phase 2, and Phase 3 test suites.
- Full TypeScript compile (`tsc`) and Vite build verification.

---

## 7. Audit Sign-Off
Phase 4 architecture is cleanly delineated, completely non-destructive, and ready for implementation.
