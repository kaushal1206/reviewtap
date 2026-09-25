# REVIEWTAP — Phase 2 Architecture Readiness Report

**Date:** September 20, 2026  
**Author:** Senior Software Architect, Security Engineer, Database Architect & QA Lead  
**Document Version:** 2.0.0  
**Status:** Audit Complete — Ready for Review & Batch Execution  

---

## 1. Executive Summary & Audit Overview

ReviewTap has successfully completed Phase 1 (Foundation & Business Review Flow). The core review redirect loop (`QR/NFC -> /r/:slug -> HTTP 302 -> Google Review Page`) is fully functioning with sub-millisecond redirect capability, asynchronous scan telemetry, and seeded accounts.

This audit evaluates the codebase against the authoritative **ReviewTap Coding Standard** (`docs/standards/codingStandard.md`) and designs the structural evolution required for **Phase 2: Business Management & Analytics**.

---

## 2. Current Architecture & Folder Structure

```
ReviewTap/
├── docs/
│   └── standards/codingStandard.md
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL models (User, RefreshToken, Business, TapSource, ScanEvent)
│   │   └── seed.ts                # Seeder for Super Admin & Demo Business
│   ├── src/
│   │   ├── config/ (db.ts, env.ts)
│   │   ├── constants/ (index.ts)
│   │   ├── controllers/ (auth, business, redirect)
│   │   ├── middlewares/ (auth, error, validate)
│   │   ├── routes/ (auth, business, redirect)
│   │   ├── services/ (qr.service.ts)
│   │   ├── types/ (express.d.ts)
│   │   ├── utils/ (hash, jwt, slug, userAgent)
│   │   ├── app.ts
│   │   └── server.ts
└── frontend/
    ├── src/
    │   ├── api/ (client.ts)
    │   ├── components/ (common/Button, Modal, Navbar; business/BusinessCard, CreateBusinessModal; qr/QRCodeViewer)
    │   ├── context/ (AuthContext.tsx)
    │   ├── pages/ (auth/Login, Register; dashboard/DashboardPage; public/PublicReviewPage)
    │   ├── types/ (index.ts)
    │   ├── App.tsx
    │   ├── index.css
    │   └── main.tsx
```

---

## 3. Findings from Architectural Audit

| Area | Current Phase 1 State | Coding Standard Requirement | Required Phase 2 Evolution |
| :--- | :--- | :--- | :--- |
| **Backend Layering** | Controllers directly interact with Prisma client. | Router → Middleware → Controller → Service → Repository → Prisma. | Extract data access into `repositories/` and core logic into `services/`. |
| **Data Isolation** | Ownership checked in controllers via `where: { id }`. | Strict multi-tenant data scoping at repository/service level. | Standardize tenant scoping in all queries; guarantee no cross-tenant leakage. |
| **Business Status** | Binary `isActive: Boolean`. | Three-state status (`ACTIVE`, `INACTIVE`, `ARCHIVED`) + `deletedAt` soft delete. | Add `BusinessStatus` enum and `deletedAt` field while preserving `isActive` for backward compatibility. |
| **Business Metadata**| Minimal fields (name, slug, url, phone, address). | Social & contact expansion (website, whatsapp, instagram). | Add optional fields to schema and update forms. |
| **Analytics Engine** | Basic `_count.scanEvents` on business model. | True database-side aggregation (daily, source breakdown, time ranges). | Implement `AnalyticsRepository` and `AnalyticsService` utilizing SQL/Prisma `groupBy` and count aggregations. |
| **Event Explorer** | No dedicated query/table view. | Filtered, searchable, paginated event log. | Build `GET /api/events` with pagination, date filtering, and safe metadata projection. |
| **Frontend Patterns**| Direct Axios calls inside pages/components. | Page → Component → Hook → API Service → Backend API. | Create modular `services/` and `hooks/` on frontend; integrate `react-hook-form` + `zod`. |
| **API Errors** | `{ success: false, message: ... }` | `{ success: false, error: { code, message } }` | Standardize error envelope with backward-compatible format. |

---

## 4. Database Schema Migration Plan (Forward-Only)

In strict accordance with Rule 15 of the Coding Standard, **no destructive operations, resets, or drops** will occur.

### 4.1 Proposed Schema Changes

```prisma
enum BusinessStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}

model Business {
  // Existing fields retained...
  status           BusinessStatus @default(ACTIVE)
  website          String?
  whatsapp         String?
  instagram        String?
  deletedAt        DateTime?      // Safe soft-delete timestamp

  // New indexes for fast filtered lookups
  @@index([ownerId, status])
  @@index([status])
  @@index([deletedAt])
}

model ScanEvent {
  // Existing fields retained...

  // New composite indexes for instant aggregation performance
  @@index([businessId, sourceType, createdAt])
  @@index([sourceType, createdAt])
  @@index([createdAt])
}
```

### 4.2 Data Integrity & Migration Safety
1. Existing businesses default to `status: ACTIVE`.
2. Existing `isActive: Boolean` remains populated (`isActive = (status === 'ACTIVE')`).
3. Historical `scan_events` remain untouched.
4. Schema update applied via `prisma db push` / forward migration without data loss.

---

## 5. Potential Regression Risks & Mitigations

1. **Redirect Latency (`/r/:slug`)**:
   - *Risk*: Checking `status === 'ACTIVE'` and `deletedAt === null` must not slow down redirection.
   - *Mitigation*: The unique index on `slug` remains unchanged; status check is performed in memory or single compound query; telemetry remains non-blocking via `setImmediate`.
2. **Slug Stability**:
   - *Risk*: Editing a business might unintentionally modify the slug, breaking printed QR codes or programmed NFC cards.
   - *Mitigation*: Slugs are immutable during standard profile edits. Slug changes require an explicit, restricted admin flow.
3. **Multi-Tenant Leakage**:
   - *Risk*: A merchant could view another merchant's analytics or events.
   - *Mitigation*: Service-level authorization guard ensures `ownerId` filtering is enforced on all merchant queries.

---

## 6. Phase 2 Deliverables & File Manifest

### 6.1 Backend New & Modified Files
- `[NEW] backend/src/repositories/business.repository.ts` — Data access layer for businesses.
- `[NEW] backend/src/repositories/analytics.repository.ts` — High-performance database aggregations.
- `[NEW] backend/src/repositories/event.repository.ts` — Paginated scan event queries with filters.
- `[NEW] backend/src/services/business.service.ts` — Ownership validation, slug preservation, business CRUD.
- `[NEW] backend/src/services/analytics.service.ts` — Metric calculations, source distribution, trends.
- `[NEW] backend/src/services/event.service.ts` — Sanitized event exploration service.
- `[NEW] backend/src/controllers/analytics.controller.ts` — Controller for overview, business analytics, trends.
- `[NEW] backend/src/controllers/event.controller.ts` — Controller for `/api/events`.
- `[NEW] backend/src/routes/analytics.routes.ts` — Route bindings for `/api/analytics/*`.
- `[NEW] backend/src/routes/event.routes.ts` — Route bindings for `/api/events`.
- `[MODIFY] backend/src/controllers/business.controller.ts` — Refactored to delegate to `business.service.ts`.
- `[MODIFY] backend/src/controllers/redirect.controller.ts` — Updated to check `business.status === 'ACTIVE'` and `deletedAt === null`.
- `[MODIFY] backend/src/routes/business.routes.ts` — Adds status change endpoint `PATCH /api/businesses/:id/status`.
- `[MODIFY] backend/src/middlewares/error.middleware.ts` — Standardized error envelope `{ success: false, error: { code, message } }`.
- `[MODIFY] backend/src/app.ts` — Mounts `/api/analytics` and `/api/events`.
- `[NEW] backend/src/tests/phase2.test.ts` — Comprehensive automated tests for business CRUD, status, ownership authorization, analytics, and event pagination.

### 6.2 Frontend New & Modified Files
- `[NEW] frontend/src/services/business.service.ts` — API client service for businesses.
- `[NEW] frontend/src/services/analytics.service.ts` — API client service for analytics.
- `[NEW] frontend/src/services/event.service.ts` — API client service for events.
- `[NEW] frontend/src/hooks/useBusinesses.ts` — Custom hook for business list and operations.
- `[NEW] frontend/src/hooks/useAnalytics.ts` — Custom hook for analytics metrics and charts.
- `[NEW] frontend/src/hooks/useEvents.ts` — Custom hook for event explorer.
- `[NEW] frontend/src/components/business/EditBusinessModal.tsx` — Modal with React Hook Form + Zod for editing business details.
- `[NEW] frontend/src/components/business/StatusBadge.tsx` — Status badge (Active, Inactive, Archived) and status change dropdown.
- `[NEW] frontend/src/pages/dashboard/BusinessListPage.tsx` — Route: `/dashboard/businesses`.
- `[NEW] frontend/src/pages/dashboard/BusinessDetailPage.tsx` — Route: `/dashboard/businesses/:id`.
- `[NEW] frontend/src/pages/dashboard/AnalyticsPage.tsx` — Route: `/dashboard/analytics`.
- `[NEW] frontend/src/pages/dashboard/EventExplorerPage.tsx` — Route: `/dashboard/events`.
- `[MODIFY] frontend/src/pages/dashboard/DashboardPage.tsx` — Upgraded with Phase 2 KPI cards, QR vs NFC breakdown, and recent activity.
- `[MODIFY] frontend/src/components/common/Navbar.tsx` — Navigation links for Dashboard, Businesses, Analytics, and Events.
- `[MODIFY] frontend/src/App.tsx` — Routes for the new pages.

---

## 7. Phase 2 Verification Checklist
- [x] Architecture audit completed.
- [ ] Packages installed (`react-hook-form`, `@hookform/resolvers`).
- [ ] Database schema synchronized forward-only without data loss.
- [ ] Backend layered architecture (`repository -> service -> controller -> route`) implemented.
- [ ] Strict multi-tenant authorization verified (Cross-tenant requests return 403).
- [ ] Business management, detail, and editing verified.
- [ ] Safe status transitions (`ACTIVE`, `INACTIVE`, `ARCHIVED`) verified.
- [ ] Analytics aggregation queries verified against real database events.
- [ ] Event Explorer verified with search, filters, and pagination.
- [ ] Phase 1 regression verification (QR & NFC redirects continue to execute sub-millisecond 302).
- [ ] Automated test suite execution (`npm test`).
- [ ] TypeScript compilation (`tsc --noEmit` & `vite build`).
- [ ] Final Phase 2 completion report generated.
