# ReviewTap — Phase 5 Gap Analysis

**Scope:** SaaS Monetization, Payment Orders, Verification, Invoicing, Billing History & Subscription Lifecycle  
**Source of Truth:** ReviewTap Codebase (`d:\ReviewTap`)  
**Standard:** docs/standards/codingStandard.md  

---

## Feature-by-Feature Gap Analysis

| Feature Area | Status | Existing Implementation | Identified Gap / Required Work | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **1. Plans Catalog** | **COMPLETED** | 4 production tiers (`FREE`, `STARTER`, `PRO`, `BUSINESS`) with complete quotas, pricing, and admin management endpoints (`/api/subscription/plans`, `/api/admin/plans`). | None. Ready to be used by the billing and checkout subsystem. | High (Completed) |
| **2. Subscription Lifecycle** | **PARTIAL** | Basic `Subscription` model with `ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELED`, `EXPIRED` enums. Auto-provisioning for new businesses works. | Subscriptions do not transition through payment orders or invoices. Lack immutable transition log. | Critical |
| **3. Payment Orders** | **MISSING** | No models, repositories, services, or APIs exist to create payment orders. | Must create `PaymentOrder` model with server-calculated amounts, status tracking, currency support, and unique reference codes. | Critical |
| **4. Payment Verification** | **MISSING** | No server-side payment verification logic or endpoints exist. | Server must verify payment signature/token, check order amount against target plan, update order status to `COMPLETED`, and activate/extend subscription. | Critical |
| **5. Webhook System** | **MISSING** | No webhook endpoints or event handlers exist. | Must create idempotent webhook receiver (`POST /api/billing/webhook`), signature validation, and `WebhookEvent` deduplication table. | Critical |
| **6. Billing History & Invoices** | **MISSING** | No invoice models or billing history tables exist in the database or frontend. | Must create `BillingInvoice` model, `GET /api/billing/invoices` endpoint, and responsive frontend billing history table with status badges and receipt downloads. | High |
| **7. Upgrade Flow** | **PARTIAL** | Frontend modal initiates `changePlan` directly without payment, calling the API which immediately changes the plan in DB. | Must be converted to an authoritative checkout flow: Select Plan -> Create Payment Order -> Verify Payment -> Activate Subscription. | Critical |
| **8. Downgrade Flow** | **PARTIAL** | Downgrading applies immediately without calculating prorations or recording a billing event. | Must enforce Downgrade Safety (Rule 20): preserve all existing NFC/QR assets, restrict new additions exceeding lower quota, and issue a non-destructive tier change invoice. | High |
| **9. Cancellation** | **COMPLETED** | `cancelAtPeriodEnd` flag is set cleanly via `POST /api/subscription/cancel`. Grace period preserved. | Needs billing history log entry to record the cancellation schedule. | Medium |
| **10. Reactivation** | **COMPLETED** | Reactivates canceled subscription via `POST /api/subscription/reactivate`. | Needs billing history log entry to record the renewal reactivation. | Medium |
| **11. Billing Dashboard** | **PARTIAL** | Current usage meters and plan comparison grid exist on `/dashboard/subscription`. | Missing dedicated Billing & Invoices section, Payment Method display, and Checkout Modal integration. | High |

---

## Detailed Summary of Required Work (Batch 3 Implementation Roadmap)

### A. Database (Additive & Forward-Only)
1. Add `PaymentOrderStatus` enum (`PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`).
2. Add `InvoiceStatus` enum (`PAID`, `PENDING`, `VOID`, `REFUNDED`).
3. Add `PaymentOrder` model with foreign keys to `Business` and `Plan`.
4. Add `BillingInvoice` model with foreign keys to `Business`, `Subscription`, and optional `PaymentOrder`.
5. Add `WebhookEvent` model for guaranteed idempotency and audit trail.
6. Push schema forward-only via `npm --prefix backend run prisma:push` and regenerate Prisma client.

### B. Backend Services & Controllers (Strict Layered Architecture)
1. `PaymentRepository` / `BillingRepository`:
   - Queries and mutations for `PaymentOrder`, `BillingInvoice`, and `WebhookEvent`.
2. `PaymentService`:
   - Authoritative amount calculation (cents). Never trust client input.
   - Creation of payment orders with cryptographically secure references.
   - Verification of payment completion with signature/token validation.
   - Subscription activation and invoice generation in a single atomic transaction.
3. `BillingService`:
   - Retrieval of user-scoped billing history and invoices.
   - Admin-level invoice queries.
4. `WebhookService`:
   - Idempotency guard: checks `WebhookEvent` table to prevent duplicate event execution.
   - Secure signature verification.
5. Controllers & Routes:
   - `billing.controller.ts` & `billing.routes.ts`:
     - `POST /api/billing/orders` (create payment order)
     - `POST /api/billing/verify` (verify payment & activate plan)
     - `GET /api/billing/invoices` (list business invoices)
     - `GET /api/billing/invoices/:id` (get invoice details)
     - `POST /api/billing/webhook` (idempotent webhook processor)

### C. Frontend Enhancements
1. Update `frontend/src/types/index.ts`:
   - Add types for `PaymentOrder`, `BillingInvoice`, `PaymentOrderStatus`, `InvoiceStatus`.
2. Update `frontend/src/services/billing.service.ts`:
   - API client for orders, verification, and invoices.
3. Enhance `frontend/src/pages/dashboard/SubscriptionPage.tsx`:
   - Add **Checkout & Payment Flow Modal**: Displays order summary, authoritative price, currency, security badges, and payment simulation/verification.
   - Add **Billing History Table**: Shows date, invoice #, plan, authoritative amount, status badge, and receipt actions.
   - Downgrade confirmation dialog with Downgrade Safety notice.
   - Responsive loading, success, and error states.

### D. Verification & Regression Testing
1. Create `backend/src/tests/phase5.test.ts`:
   - Test payment order creation with server-authoritative amount validation.
   - Test payment rejection on tampered amounts.
   - Test payment verification and atomic subscription activation.
   - Test billing invoice creation and retrieval.
   - Test webhook signature validation and duplicate event rejection (idempotency).
   - Test downgrade safety: verify existing NFC cards and QR codes remain 100% operational when downgrading.
2. Run full regression test suite:
   - Phase 2 tests (`phase2.test.ts`)
   - Phase 3 tests (`phase3.test.ts`)
   - Phase 4 tests (`phase4.test.ts`)
   - Phase 5 tests (`phase5.test.ts`)
3. Validate frontend build:
   - `npm --prefix frontend run build` (Typecheck + Vite production bundle).
