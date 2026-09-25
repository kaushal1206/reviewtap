# ReviewTap — Render Production Database Fix Report

**Date:** September 25, 2026  
**Production Backend URL:** [https://reviewtap-hyo1.onrender.com](https://reviewtap-hyo1.onrender.com)  
**Status:** ✅ **DIAGNOSED, FIXED & LOCALLY VERIFIED (READY FOR RENDER REDEPLOY)**

---

## 1. Problem Summary
When starting on Render, the backend build succeeded, but the application crashed during database initialization with the following error:
```text
PrismaClientInitializationError:
Can't reach database server at `localhost:5432`
```

---

## 2. Root Cause Analysis
1. **Silent Fallback to Localhost in Environment Config:**  
   In `backend/src/config/env.ts`, `DATABASE_URL` defaulted to `postgresql://postgres:postgres@localhost:5432/reviewtap?schema=public` when `process.env.DATABASE_URL` was not supplied or not picked up.
2. **Implicit PrismaClient Initialization Without Explicit Datasource URL:**  
   In `backend/src/config/db.ts`, `new PrismaClient({...})` was instantiated without passing `datasources: { db: { url: env.DATABASE_URL } }`. When `DATABASE_URL` was missing from the container's environment or defaulted, Prisma attempted to connect to `localhost:5432` on the Render Linux container where no PostgreSQL service is running.
3. **Missing Baseline Prisma Migration for Fresh Deployments:**  
   The project did not have a tracked `prisma/migrations` folder, which is required for `npx prisma migrate deploy` to initialize schema tables on a managed cloud database.
4. **Prisma Generate Missing from Production Build Step:**  
   `backend/package.json` had `"build": "tsc"`, which compiled TypeScript but did not guarantee that Prisma Client was generated from the schema in clean container environments.
5. **Node.js Runtime Mismatch:**  
   Render was defaulting to Node.js `24.21.0` (unsupported by older Prisma engines), whereas the application targets Node.js 20–22 LTS.

---

## 3. Engineering Fixes Implemented

### A. Fail-Fast Production Environment Validation (`backend/src/config/env.ts`)
* Implemented strict validation: If running in production (`NODE_ENV === 'production'` or `RENDER` is set), the backend checks if `DATABASE_URL` is missing or points to `localhost` / `127.0.0.1`.
* If misconfigured, the process immediately halts with an explicit error explaining that the **Render PostgreSQL Internal Database URL** must be provided in the Render Dashboard.
* Synchronizes `process.env.DATABASE_URL = resolvedDatabaseUrl` so Prisma query engines and CLI tools always receive the resolved URL.

### B. Explicit Datasource Injection in Prisma (`backend/src/config/db.ts`)
* Updated `new PrismaClient()` to explicitly inject:
  ```ts
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  }
  ```
  This eliminates any fallback to localhost and ensures Prisma always connects to the configured Render PostgreSQL database.

### C. Baseline Prisma Migration (`backend/prisma/migrations/0_init/migration.sql`)
* Generated baseline migration containing the complete forward-only DDL (enums, tables, foreign keys, indexes).
* Resolved as applied locally (`npx prisma migrate resolve --applied 0_init`) with **zero** data loss and **zero** table drops.
* Updated `.gitignore` to track `!backend/prisma/migrations/**/*.sql`.
* Added deployment scripts to `backend/package.json`:
  * `"prisma:deploy": "prisma migrate deploy"`
  * `"start:prod": "prisma migrate deploy && node dist/server.js"`
  * Updated `"build"`: `"prisma generate && tsc"`

### D. Server Host Binding & Node Engine (`backend/src/server.ts` & `package.json`)
* Configured Express to bind to `0.0.0.0` (required for Render HTTP reverse proxy).
* Added `"engines": { "node": ">=20.0.0 <=22.x" }` to `backend/package.json` so Render automatically provisions Node.js 22 LTS instead of Node 24.

### E. Health & CORS Enhancements (`backend/src/app.ts`)
* Enhanced `/health` and `/api/health` with an active PostgreSQL probe (`SELECT 1`) returning `{ status: "healthy", database: "connected" }`.
* Updated CORS to accept production frontend URLs dynamically with credentials (`credentials: true`), preventing unauthorized origins while rejecting `*`.

---

## 4. Files Changed

| File | Change Description |
|---|---|
| `backend/src/config/env.ts` | Added fail-fast production database validation, localhost check, and URL synchronization. |
| `backend/src/config/db.ts` | Explicitly passed `env.DATABASE_URL` to `PrismaClient` datasources. |
| `backend/src/server.ts` | Bound Express listener to `0.0.0.0:${env.PORT}`. |
| `backend/src/app.ts` | Added dual `/health` and `/api/health` with active DB probe and dynamic CORS origin validation. |
| `backend/src/controllers/auth.controller.ts` | Configured `sameSite: 'none'` and `secure: true` for cross-site HTTPS cookies in production. |
| `backend/package.json` | Added `engines.node` (20–22), `prisma generate` to build, `prisma:deploy`, and `start:prod`. |
| `backend/prisma/migrations/0_init/` | Added baseline migration SQL for Render deployment. |
| `backend/.env.example` | Updated with Render PostgreSQL connection instructions and environment variable inventory. |
| `.gitignore` | Allowed tracking of Prisma migration SQL files. |

---

## 5. Required Render Environment Variables

In your Render Dashboard (**reviewtap-api** ➔ **Environment**), configure:

| Key | Value / Instructions |
|---|---|
| `DATABASE_URL` | **[CRITICAL]** Copy the **Internal Database URL** from your Render PostgreSQL instance.<br>Format: `postgresql://user:password@dpg-xxxxx-a/reviewtap` |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `JWT_SECRET` | Secure random string (at least 32 characters) |
| `JWT_REFRESH_SECRET` | Secure random string (at least 32 characters) |
| `CLIENT_URL` | Your frontend URL (e.g. `https://reviewtap.vercel.app` or `http://localhost:5173`) |
| `FRONTEND_URL` | Same as `CLIENT_URL` |
| `BASE_URL` | `https://reviewtap-hyo1.onrender.com` |

> ⚠️ **Important:** Do NOT commit your production `DATABASE_URL` to Git. It must be set exclusively in the Render Environment Dashboard.

---

## 6. Manual Actions Required in Render Dashboard

1. **Open Render Dashboard:**  
   Navigate to [dashboard.render.com](https://dashboard.render.com).
2. **Locate your PostgreSQL Database:**  
   Click on your PostgreSQL instance (e.g. `reviewtap-db`).
3. **Copy the Internal Database URL:**  
   Under **Connections**, find **Internal Database URL** and click **Copy**.  
   *(Do NOT use the External Database URL if your backend service is in the same Render region — the internal URL is faster and free of bandwidth fees).*
4. **Configure Web Service Environment:**  
   * Go to your backend Web Service (`reviewtap-api` / `reviewtap-hyo1`).
   * Click **Environment** in the left sidebar.
   * Add / update `DATABASE_URL` and paste the Internal Database URL copied in Step 3.
   * Set `NODE_ENV` = `production`.
   * Set `NODE_VERSION` = `22`.
   * Save Changes.
5. **Verify Build & Start Commands in Settings:**  
   * **Root Directory:** `backend`
   * **Build Command:** `npm install && npm run build` (Note: `npm run build` now runs `prisma generate && tsc` automatically).
   * **Start Command:** `npm run start:prod` (or `npx prisma migrate deploy && npm start`).
6. **Trigger Manual Deploy:**  
   Click **Manual Deploy** ➔ **Deploy latest commit**.

---

## 7. Build & Test Verification Results

| Verification Check | Command | Result | Notes |
|---|---|---|---|
| **Prisma Schema Validation** | `npx prisma validate` | ✅ **PASS** | Valid schema, 0 errors |
| **Prisma Baseline Migration** | `npx prisma migrate status` | ✅ **PASS** | `Database schema is up to date!` |
| **Backend TypeScript Build** | `npm run build` | ✅ **PASS** | `prisma generate && tsc` completed with 0 errors |
| **Dual Health Endpoint** | `GET /api/health`, `GET /health` | ✅ **PASS** | Returns `200 OK`: `{ status: "healthy", database: "connected" }` |
| **Master E2E Test Suite** | `npm run test:e2e` | ✅ **PASS** | 8/8 customer journeys, redirects, and multi-tenant security verified |

---

## 8. Post-Deploy Verification Checklist

Once the manual redeploy finishes on Render:
1. Open `https://reviewtap-hyo1.onrender.com/health` in your browser.
2. Confirm the response:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "service": "ReviewTap API & Redirect Engine",
     "version": "2.0.0"
   }
   ```
3. Check Render deployment logs — confirm that `npx prisma migrate deploy` executed cleanly and Express logged:
   ```text
   ✅ Connected to PostgreSQL database via Prisma
   🚀 ReviewTap Engine running on http://0.0.0.0:5000
   ```
