# ReviewTap — Production Deployment & Readiness Report

**Project:** ReviewTap — Google Review SaaS Platform  
**Target Architecture:** Vercel (Frontend) + Render (Backend) + Render PostgreSQL (Database)  
**GitHub Repository:** [https://github.com/kaushal1206/reviewtap.git](https://github.com/kaushal1206/reviewtap.git)  
**Primary Branch:** `main`  
**Preparation Commit:** `e1b40c016b670930b55ef8ba6487f2c7523c8df6`  
**Date:** September 25, 2026  

---

## 1. Architecture Overview

```text
       ┌────────────────────────┐
       │   Customer Devices     │
       │   (NFC Tap / QR Scan)  │
       └───────────┬────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│  Frontend (Vercel)                   │        │  Backend API & Redirect Engine       │
│  React 18 + Vite + TypeScript        │───────▶│  (Render Web Service)                │
│  - SPA client routing & rewrites     │        │  - Express 4.x + Node.js (0.0.0.0)   │
│  - Configurable VITE_API_URL         │        │  - Dynamic CORS with credentials     │
│  - Tailored Dark UI & Micro-footer   │        │  - HTTPS cross-site cookies          │
└──────────────────────────────────────┘        └──────────────────┬───────────────────┘
                                                                   │
                                                                   ▼
                                                ┌──────────────────────────────────────┐
                                                │  Database (Render PostgreSQL)        │
                                                │  Managed PostgreSQL 16+              │
                                                │  - Prisma ORM 5.22.0                 │
                                                │  - Baseline migration 0_init         │
                                                └──────────────────────────────────────┘
```

---

## 2. Infrastructure & Hosting Specifications

| Component | Target Provider | Configuration / Artifact | Status |
|---|---|---|---|
| **Frontend** | **Vercel** | `frontend/vercel.json` (SPA rewrites, clean URLs) | **READY FOR CONNECT** |
| **Backend** | **Render** | `render.yaml` (Render Blueprint Web Service) | **READY FOR CONNECT** |
| **Database** | **Render PostgreSQL** | `render.yaml` (Render Blueprint Database `reviewtap-db`) | **READY FOR PROVISION** |
| **Source Control** | **GitHub** | `https://github.com/kaushal1206/reviewtap.git` (branch `main`) | **PASS (Synced)** |

---

## 3. Production Environment Inventory

### Backend Environment Variables (`backend/.env.example`)
* `PORT`: Automatically injected by hosting provider (Render). Default fallback: `5000`.
* `NODE_ENV`: Set to `production`.
* `DATABASE_URL`: Managed PostgreSQL connection string (injected automatically by Render Blueprint).
* `JWT_SECRET`: Random 32+ character key for access token signing.
* `JWT_REFRESH_SECRET`: Random 32+ character key for refresh token signing.
* `CLIENT_URL` / `FRONTEND_URL` / `CORS_ORIGIN`: Deployed Vercel URL (e.g. `https://reviewtap.vercel.app`).
* `BASE_URL`: Public backend URL (e.g. `https://reviewtap-api.onrender.com`).
* `IP_SALT`: Salt for GDPR/CCPA anonymized IP telemetry hashing.

### Frontend Environment Variables (`frontend/.env.example`)
* `VITE_API_URL`: Backend API endpoint (e.g. `https://reviewtap-api.onrender.com/api`).
* `VITE_APP_URL`: Frontend public URL (e.g. `https://reviewtap.vercel.app`).

---

## 4. Build & Deployment Commands

### Backend (Render Web Service)
* **Root Directory:** `backend`
* **Build Command:** `npm install && npx prisma generate && npm run build`
* **Pre-Deploy (Migration):** `npx prisma migrate deploy`
* **Start Command:** `npm start` (executes `node dist/server.js`)
* **Health Check Endpoint:** `/health` (also accessible at `/api/health`)

### Frontend (Vercel)
* **Root Directory:** `frontend`
* **Framework Preset:** Vite
* **Build Command:** `npm run build` (`tsc && vite build`)
* **Output Directory:** `dist`
* **Install Command:** `npm install`

---

## 5. Verification & Audit Results

| Audit Check | Status | Verification Detail |
|---|---|---|
| **Prisma Schema Validation** | **PASS** | Validated via `npx prisma validate`. Schema valid with 0 errors. |
| **Prisma Baseline Migration** | **FIXED** | Generated `backend/prisma/migrations/0_init/migration.sql` via `prisma migrate diff`. Resolved as applied on existing local database without dropping or truncating tables. Forward-only ready for Render. |
| **Backend TypeScript Compilation** | **PASS** | `npm run build` (`tsc`) compiled with 0 errors. |
| **Frontend Production Build** | **PASS** | `npm run build` (`tsc && vite build`) compiled in 22.73s with 0 errors. Output in `frontend/dist/`. |
| **Server Host Binding** | **FIXED** | Updated `backend/src/server.ts` to bind explicitly to `0.0.0.0:${env.PORT}` for cloud container compatibility. |
| **CORS Configuration** | **FIXED** | Configured dynamic CORS origin parser supporting `CLIENT_URL`, `FRONTEND_URL`, and `CORS_ORIGIN` with credentials and strict origin filtering. |
| **Cross-Origin Cookie Security** | **FIXED** | Configured `sameSite: 'none'` and `secure: true` in production mode in `backend/src/controllers/auth.controller.ts` for cross-site HTTPS sessions between Vercel and Render. |
| **Dual Health Endpoint** | **FIXED** | Implemented active PostgreSQL probe on `/health` and `/api/health` returning `200 OK` with `{ status: "healthy", database: "connected" }`. |
| **API Client URL Config** | **FIXED** | Updated `frontend/src/api/client.ts` to dynamically use `import.meta.env.VITE_API_URL` with fallback to `/api` and added `getApiAssetUrl` helper for cross-origin SVG/PNG downloads. |
| **SPA Route Fallback** | **FIXED** | Created `frontend/vercel.json` routing `/(.*)` to `/index.html` to support deep-linking and page refreshes on nested dashboard routes. |
| **Phase 1 Test Suite** | **PASS** | 7/7 automated assertions passed (Auth, Business, QR Engine, Redirect, Telemetry). |
| **Phase 2 Test Suite** | **PASS** | 8/8 automated assertions passed (Multi-Tenant Isolation, Inactive States, Analytics). |
| **Phase 3 Test Suite** | **PASS** | 7/7 automated assertions passed (NFC Provisioning & Redirect Invariants). |
| **Phase 4 Test Suite** | **PASS** | 9/9 automated assertions passed (Subscriptions, Quota Gating, Admin Catalog). |
| **Phase 5 Test Suite** | **PASS** | 6/6 automated assertions passed (HMAC Signatures, Webhook Idempotency, Invoicing). |
| **Phase 6 Test Suite** | **PASS** | 12/12 automated assertions passed (Staff Roles, Notifications, Health & Intelligence). |
| **Master E2E Verification** | **PASS** | 8/8 full customer journeys and tenant security isolation verified. |
| **Billing / Payment Status** | **PASS** | Phase 5 billing is server-authoritative with HMAC-SHA256 signature verification and idempotent webhook processing. Gateway adapter is simulated for demo SaaS tier (no live Stripe secret keys required). |
| **Secrets & Privacy Audit** | **PASS** | Verified `.gitignore` filters `backend/.env`, `frontend/.env`, `postgres_data/`, and database dumps. Zero secrets or keys committed. |

---

## 6. Live Deployment Status & Manual Steps Required

Per deployment rules, automated CLI tools were checked for active sessions:
* `vercel` CLI: Not pre-authenticated in local environment.
* `render` CLI / API: Not pre-authenticated in local environment.

Per Rule 17: **Stopped before attempting any credential work.**
The repository at [https://github.com/kaushal1206/reviewtap.git](https://github.com/kaushal1206/reviewtap.git) contains the complete, production-ready codebase and deployment blueprints.

### Step-by-Step Instructions to Go Live:

### Step 1: Deploy Backend & PostgreSQL on Render
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** ➔ **Blueprint**.
3. Connect your GitHub repository: `https://github.com/kaushal1206/reviewtap.git`.
4. Render will detect `render.yaml` and display:
   - **reviewtap-api** (Web Service, Node runtime, root dir `backend`)
   - **reviewtap-db** (Managed PostgreSQL database)
5. Click **Apply**.
6. Render will provision the PostgreSQL database, automatically run `npx prisma migrate deploy` to instantiate all tables, and start `reviewtap-api`.
7. Once deployed, copy your Render Web Service URL:
   `https://reviewtap-api.onrender.com` (example).

### Step 2: Deploy Frontend on Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** ➔ **Project**.
3. Import the GitHub repository: `kaushal1206/reviewtap`.
4. In the configuration screen:
   - **Framework Preset:** Vite
   - **Root Directory:** Click "Edit" and select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand **Environment Variables** and add:
   - `VITE_API_URL`: `https://<YOUR_RENDER_BACKEND_URL>/api` (e.g., `https://reviewtap-api.onrender.com/api`)
   - `VITE_APP_URL`: `https://<YOUR_VERCEL_PROJECT_URL>` (e.g., `https://reviewtap.vercel.app`)
6. Click **Deploy**.
7. Once deployed, copy your Vercel URL (e.g., `https://reviewtap.vercel.app`).

### Step 3: Link Vercel URL in Render Environment
1. In your Render Dashboard, go to **reviewtap-api** ➔ **Environment**.
2. Set `CLIENT_URL` and `FRONTEND_URL` to your Vercel URL:
   `https://<YOUR_VERCEL_PROJECT_URL>`
3. Click **Save Changes** (triggers an instant re-deploy with updated CORS allowlist).

---

## 7. Post-Deployment Verification Checklist

Once both services are active:
1. Open `https://<YOUR_RENDER_BACKEND_URL>/health` ➔ Confirm `status: healthy`, `database: connected`.
2. Open `https://<YOUR_VERCEL_PROJECT_URL>` ➔ Confirm login and dashboard render.
3. Register an account ➔ Verify JWT issued and dashboard opens.
4. Create a business with a Google Review URL ➔ Verify QR code generates and displays correctly.
5. Scan QR code or visit `https://<YOUR_RENDER_BACKEND_URL>/r/<slug>` ➔ Confirm HTTP 302 redirect to Google Review page and scan count incremented.
6. Provision NFC card ➔ Tap / visit `https://<YOUR_RENDER_BACKEND_URL>/r/nfc/<publicId>` ➔ Confirm HTTP 302 redirect to Google Review page and tap count incremented.
