# ReviewTap — Tap. Scan. Review.

> **Next-Generation QR & NFC Google Review SaaS Platform**  
> Turn in-person customer interactions into verified 5-star Google Reviews with branded NFC tap cards, tabletop QR stands, smart redirect telemetry, and automated customer success workflows.

---

## 🚀 Overview

**ReviewTap** is a high-performance B2B SaaS platform engineered to help businesses effortlessly collect Google Reviews at the point of sale, counter, table, or service desk.

Unlike static QR codes or unmanaged NFC tags, ReviewTap puts a centralized smart redirection and telemetry layer between the customer tap and the Google Review form:
* **Dynamic Redirection**: Update destination Google Review links, review forms, or fallback landing pages in real time without reprinting QR collateral or replacing physical NFC cards.
* **Instant 302 Performance**: Delivers sub-millisecond HTTP 302 redirection directly to Google Review URLs while recording anonymized device telemetry asynchronously in the background.
* **Hardware Lifecycle Management**: Complete provisioning, physical UID binding, activation/deactivation, and backup QR code generation for NFC cards.
* **Full-Scale SaaS Subscriptions**: Four plan tiers (`FREE`, `STARTER`, `PRO`, `BUSINESS`), server-authoritative payment orders, cryptographic verification, immutable invoicing, and idempotent webhooks.
* **Team & Customer Success Engine**: Role-based access (`OWNER`, `MANAGER`, `STAFF`), cryptographic staff invitations, platform notification center, review intelligence velocity metrics, and algorithmic business health scoring (0–100).

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite | Modern, rich-aesthetic single-page dashboard application |
| **Styling** | Tailwind CSS | Sleek dark-mode theme, glassmorphism, responsive grids |
| **Backend** | Node.js, Express, TypeScript | RESTful API, centralized permission engine, fast redirect routing |
| **Database** | PostgreSQL 18 | Relational data store with forward-only migrations |
| **ORM** | Prisma ORM | Type-safe database queries, schema management & relations |
| **Validation** | Zod | Runtime schema validation for all API inputs and webhooks |
| **Security** | JWT, bcryptjs, Helmet, CORS | Bearer tokens, HTTP-only refresh tokens, rate limiting |
| **QR Code** | `qrcode` | High-resolution SVG & PNG QR code rendering engine |
| **Testing** | Node.js Test Runner / TSX | Full-spectrum end-to-end integration test suites (Phases 1–6) |

---

## 🏗️ Architecture & Customer Journeys

```
[ Customer Phone / Device ]
        │
   ┌────┴────────────────────────┐
   │                             │
[ Camera Scans QR ]       [ Phone Taps NFC ]
   │                             │
   ▼                             ▼
GET /r/:slug             GET /r/nfc/:publicId
   │                             │
   └──────────────┬──────────────┘
                  ▼
    [ ReviewTap Smart Redirect Engine ]
    ├─ 1. Identify business & hardware record
    ├─ 2. Validate active status (inactive -> 404 notice)
    ├─ 3. Non-blocking async telemetry (ScanEvent)
    └─ 4. Immediate HTTP 302 Redirect
                  │
                  ▼
[ Destination: Business Google Review Page ]
```

---

## ✨ Core Features & Platform Modules

### 1. Dual Customer Acquisition Channels
* **Tabletop & Countertop QR Codes**: Printable high-resolution SVG/PNG assets encoding ReviewTap vanity URLs (`/r/:slug`).
* **NFC Hardware Tap Cards**: Physical tap points encoded with unique public identifiers (`/r/nfc/:publicId`), complete with fallback QR codes.

### 2. Multi-Tenant Business Management
* Multi-location support with independent Google Place IDs and direct review URLs.
* Safe, collision-resistant slug generation with slug stability preservation.
* Soft deletion preserving all historical scan events and analytics data.

### 3. Analytics & Event Explorer
* Real-time database aggregations (Total Scans, Review Redirects, QR vs. NFC share percentage, device and browser breakdowns).
* Live Event Explorer with multi-parameter filtering (by business, date range, source type) and pagination.

### 4. SaaS Plans, Entitlements & Metering
* **Tiered Subscription Catalog**:
  * **FREE**: 1 Business, 1 NFC Card, 1 QR Stand, 500 scans/mo, 1 Team Seat.
  * **STARTER**: 3 Businesses, 5 NFC Cards, 5 QR Stands, 2,500 scans/mo, 3 Team Seats ($15/mo).
  * **PRO**: 10 Businesses, 25 NFC Cards, 25 QR Stands, 15,000 scans/mo, 10 Team Seats, Custom Branding, CSV Export ($39/mo).
  * **BUSINESS**: Unlimited Businesses, 100 NFC Cards, 100 QR Stands, 100,000 scans/mo, 50 Team Seats, Priority Support ($99/mo).
* **Server-Side Quota Guards**: Real-time enforcement preventing resource over-allocation.
* **Downgrade Safety**: Downgrading or canceling plans never deletes existing cards, stands, or scan histories.

### 5. Monetization, Invoicing & Webhook Idempotency
* **Server-Authoritative Orders**: Prices are resolved server-side; client-supplied amounts are ignored.
* **Cryptographic Verification**: HMAC-SHA256 signature verification guards against payment tampering.
* **Immutable Invoicing**: Sequential invoice generation (`RT-INV-2026-XXXXXX`) and billing history ledger.
* **Idempotent Webhooks**: Dedupes duplicate gateway events via `WebhookEvent` recording.

### 6. Team Collaboration & Roles
* Role hierarchy: `OWNER` (full access), `MANAGER` (manage hardware, stands & staff), `STAFF` (operational insights).
* Secure 7-day cryptographic token invitations with email preview and revocation controls.
* Centralized permission engine (`requirePermission`) replacing ad-hoc role checks.

### 7. Customer Success & Business Intelligence
* **Review Intelligence**: 7-day scan velocity % change and top-performing hardware rankings.
* **Algorithmic Health Scoring Engine**: Multi-factor scoring index (0–100) classifying businesses into `HEALTHY`, `WARNING`, or `INACTIVE`.
* **Automated Insights**: Proactive recommendations for low velocity or capacity limits.
* **Activity Audit Timeline**: Append-only audit trail logging tenant operations with actor attribution.
* **Super Admin Control Center**: Platform-wide MRR/ARR tracking, hardware fleet utilization, and global business directory search.

---

## 📁 Repository Structure

```
ReviewTap/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Definitive PostgreSQL schema & relations
│   │   ├── seed.ts               # Demo users, businesses & hardware seeder
│   │   └── seed-plans.ts         # Plan catalog & quota definitions
│   ├── src/
│   │   ├── config/               # Environment & database configuration
│   │   ├── constants/            # HTTP codes & role permission matrices
│   │   ├── controllers/          # Thin HTTP controllers
│   │   ├── middlewares/          # Auth, permissions, rate limiting, error handling
│   │   ├── repositories/         # Prisma query abstraction layer
│   │   ├── routes/               # Express router bindings
│   │   ├── services/             # Core business logic & domain services
│   │   ├── tests/                # Automated regression & E2E test suites
│   │   ├── utils/                # Hashing, slugification, user-agent parsing
│   │   ├── app.ts                # Express application setup & middleware pipeline
│   │   └── server.ts             # HTTP server entrypoint
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                  # Axios HTTP client with interceptors
│   │   ├── components/           # Reusable UI components & layouts
│   │   ├── context/              # AuthContext & session management
│   │   ├── hooks/                # Custom React hooks (useBusinesses, useAnalytics, etc.)
│   │   ├── pages/
│   │   │   ├── auth/             # Login & Register views
│   │   │   ├── dashboard/        # Businesses, NFC, Team, Insights, Usage, Admin
│   │   │   └── public/           # Invitation Acceptance & Public Review views
│   │   ├── services/             # Client-side API service connectors
│   │   ├── types/                # Strict TypeScript interfaces & API contracts
│   │   ├── App.tsx               # Route declarations & navigation guard rails
│   │   └── main.tsx              # React DOM mounting
│   └── package.json
│
├── docs/
│   ├── standards/
│   │   └── codingStandard.md     # Authoritative ReviewTap engineering standard
│   └── phases/                   # Detailed Phase 1–6 audit & implementation reports
│
├── PHASE_1_TO_6_FINAL_AUDIT_REPORT.md  # Master engineering audit report
└── package.json                  # Root monorepo task runner
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
* **Node.js**: v18.0.0 or later
* **PostgreSQL**: v14.0 or later (configured on port `5432`)
* **npm**: v9.0.0 or later

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-org/ReviewTap.git
cd ReviewTap

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reviewtap?schema=public
JWT_SECRET=super_secret_jwt_reviewtap_2026_dev_key_at_least_32_bytes!
JWT_REFRESH_SECRET=super_secret_refresh_reviewtap_2026_dev_key_at_least_32_bytes!
CLIENT_URL=http://localhost:5173
BASE_URL=http://localhost:5000
```

### 3. Initialize the Database
```bash
cd backend

# Validate Prisma schema
npx prisma validate

# Push schema to PostgreSQL (forward-only, non-destructive)
npm run prisma:push

# Seed default plans & demo data
npm run prisma:seed
```

### 4. Run the Development Servers

#### Option A: Running from Root Monorepo
```bash
# Run backend
npm run dev:backend

# Run frontend (in a separate terminal)
npm run dev:frontend
```

#### Option B: Running Individually
```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend
npm run dev
```

* **Frontend URL**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:5000](http://localhost:5000)
* **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Automated Testing

ReviewTap includes 7 automated regression test suites covering every tier:

```bash
cd backend

# Run the complete test suite (all 7 suites)
npm run test:all

# Run specific phase test suites
npm run test:phase1    # Auth, Profile, QR Redirects & Telemetry
npm run test:phase2    # Business CRUD, SQL Aggregations & Event Explorer
npm run test:phase3    # NFC Card Lifecycle, Redirects & Backup QR
npm run test:phase4    # SaaS Plan Catalog, Entitlement Enforcement & Quotas
npm run test:phase5    # Authoritative Orders, Signatures, Invoices & Webhooks
npm run test:phase6    # Teams, Invitations, Permissions, Intelligence & Health
npm run test:e2e       # Master End-to-End Dual-Journey & Multi-Tenant Tests
```

---

## 🔒 Security & Data Isolation Standards

1. **Multi-Tenant Boundary**: All resources (`businesses`, `nfc_cards`, `invoices`, `team_members`) enforce strict tenant ownership checks. Cross-tenant tampering returns `403 Forbidden`.
2. **Server-Authoritative Pricing**: Frontend amounts are never trusted; plan amounts are evaluated exclusively from the database catalog.
3. **Cryptographic Signatures**: Webhook payloads and checkout callbacks require HMAC-SHA256 verification.
4. **Non-Destructive Database Rules**: Absolute prohibition against `prisma migrate reset`, table drops, or historical migration alterations.

---

## 📄 License & Authorship

Developed for the **ReviewTap** Platform by the ReviewTap Engineering Team.  
All rights reserved © 2026.
