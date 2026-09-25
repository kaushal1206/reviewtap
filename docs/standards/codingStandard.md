# ReviewTap — Coding Standard

## 1. Purpose

This document defines the mandatory engineering standards for the ReviewTap platform.

ReviewTap is a QR + NFC powered Google Review management SaaS.

The platform must remain:

* Secure
* Maintainable
* Scalable
* Modular
* Testable
* Type-safe
* Non-destructive
* Easy to extend

This document is the authoritative coding standard for the ReviewTap project.

---

# 2. Technology Standards

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* React Hook Form
* Zod

## Backend

* Node.js
* Express
* TypeScript
* Zod

## Database

* PostgreSQL
* Prisma ORM

## Authentication

* JWT access tokens
* HTTP-only refresh tokens
* bcrypt/bcryptjs password hashing

---

# 3. Architecture

Use a modular architecture.

Backend:

Router
→ Middleware
→ Controller
→ Service
→ Repository
→ Prisma
→ PostgreSQL

Frontend:

Page
→ Component
→ Hook
→ API Service
→ Backend API

Never bypass architectural layers without a documented reason.

---

# 4. Backend Rules

## Routes

Routes are responsible only for:

* HTTP method
* URL
* Middleware
* Controller binding

Do not place business logic inside routes.

## Controllers

Controllers must remain thin.

Responsibilities:

* Read request
* Validate/receive validated input
* Call service
* Return response

Controllers must not directly query Prisma.

## Services

Services contain business logic.

Examples:

* Business creation
* Slug generation
* QR generation orchestration
* Redirect logic
* Analytics calculations
* Ownership validation

## Repositories

Repositories are responsible for database operations.

Prisma access should remain inside repositories unless the existing architecture explicitly requires another approved pattern.

---

# 5. Frontend Rules

Pages handle page-level orchestration.

Components handle UI.

Hooks handle reusable client-side logic.

API services handle server communication.

Do not put database logic inside frontend code.

Do not put business rules unnecessarily inside visual components.

Reusable UI must be componentized.

---

# 6. TypeScript Rules

Strict TypeScript is mandatory.

Avoid:

* `any`
* `@ts-ignore`
* `@ts-expect-error` unless specifically justified
* unsafe type assertions
* duplicated interfaces

Use shared types where appropriate.

Every API request and response should have defined types.

---

# 7. Validation

Use Zod for external input validation.

Validate:

* Authentication input
* Business creation
* Business update
* Google Review URL
* Query parameters
* Pagination
* Filtering
* Analytics parameters

Never trust frontend validation alone.

Backend validation is mandatory.

---

# 8. Authentication & Authorization

Authentication and authorization are separate concerns.

Authentication determines:

"Who is the user?"

Authorization determines:

"What can this user access?"

Business owners must only access their own businesses.

Super Admin may access platform-wide data.

Never rely on frontend route protection for security.

Every protected backend endpoint must verify authorization.

---

# 9. Multi-Tenant Data Isolation

Business data must always be scoped to the authenticated user/owner where applicable.

Never retrieve a business only by ID without checking ownership or administrative privileges.

Example:

Incorrect:

```text
GET business by ID
```

Correct:

```text
Get business by ID
+
Verify requesting user's authorization
```

Cross-business data leakage is considered a critical defect.

---

# 10. Business Slugs

Business slugs must be:

* URL-safe
* Collision-resistant
* Unique
* Stable by default

Do not automatically change an existing slug during unrelated business edits.

If slug changes are supported, handle redirects safely.

---

# 11. QR Code Architecture

QR codes must point to ReviewTap-controlled URLs.

Example:

```text
https://reviewtap.com/r/business-slug
```

Do not make the QR code permanently dependent on the external Google Review URL.

The redirect layer must remain under ReviewTap control.

This allows:

* Destination updates
* Analytics
* NFC/QR consistency
* Future routing features

---

# 12. NFC Architecture

NFC cards must use URL-based routing.

Example:

```text
https://reviewtap.com/r/business-slug
```

NFC and QR should be able to use the same redirect destination.

Do not assume the platform can control how every phone handles NFC.

The system provides the URL.

The device determines the final interaction behavior.

---

# 13. Redirect System

The redirect endpoint must:

1. Validate the slug.
2. Find the business.
3. Verify the business is active.
4. Record telemetry asynchronously where safe.
5. Redirect to the configured Google Review URL.

Example:

```text
GET /r/:slug
```

Do not block the customer unnecessarily because analytics recording failed.

Redirect availability has priority over non-critical telemetry.

---

# 14. Analytics

Analytics must distinguish between:

* QR
* NFC
* Other future sources

Do not claim that a redirect equals a submitted Google Review.

Correct terminology:

* QR Scans
* NFC Taps
* Review Page Redirects
* Redirect Events

Incorrect terminology:

* Guaranteed Reviews
* Reviews Generated
* Reviews Submitted

unless independently verified.

---

# 15. Database Rules

Use Prisma migrations.

Never use:

```text
prisma migrate reset
```

Never:

* Drop production tables
* Truncate business data
* Delete existing migrations
* Rewrite historical migrations

Schema changes must be forward-only.

Every structural database change requires a migration.

---

# 16. Soft Deletion

Business records should not be hard-deleted when historical analytics depend on them.

Prefer:

```text
status
deletedAt
```

where appropriate.

Historical scan events must remain consistent.

---

# 17. API Standards

Use consistent API responses.

Success:

```text
{
  success: true,
  data: ...
}
```

Error:

```text
{
  success: false,
  error: {
    code: "...",
    message: "..."
  }
}
```

Do not expose:

* Password hashes
* Refresh tokens
* Internal database errors
* Stack traces
* Secrets

---

# 18. Error Handling

Use centralized error handling.

Errors must be:

* Predictable
* Typed where practical
* Logged appropriately
* Safe for users

Do not expose raw Prisma/database errors to clients.

---

# 19. Security

Mandatory:

* Password hashing
* HTTP-only refresh cookies
* Input validation
* Authorization checks
* Rate limiting where appropriate
* Safe CORS configuration
* Environment-based secrets
* No hardcoded credentials

Never commit secrets.

---

# 20. Environment Variables

Secrets must be stored in environment variables.

Examples:

```text
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
FRONTEND_URL
API_URL
```

Never hardcode production secrets.

---

# 21. Naming Convention

Use:

* `camelCase` for variables/functions
* `PascalCase` for React components/classes
* `UPPER_SNAKE_CASE` for constants where appropriate
* Descriptive database names
* RESTful endpoint names

Avoid meaningless names such as:

```text
data1
temp
abc
test2
```

---

# 22. Testing

Every feature must have appropriate tests.

Minimum expectations:

* Validation tests
* Service tests
* Authorization tests
* API tests for important endpoints
* Regression tests for critical flows

Critical ReviewTap flow:

```text
Create Business
→ Generate Slug
→ Generate QR
→ Scan/Tap
→ Redirect
→ Record Event
```

must remain covered.

---

# 23. Logging

Logs must be useful and structured.

Never log:

* Passwords
* JWT secrets
* Refresh tokens
* Sensitive credentials

Log important operational events such as:

* Authentication failures
* Authorization failures
* Redirect failures
* Database failures
* Unexpected server errors

---

# 24. UI/UX Standards

The UI must be:

* Responsive
* Accessible
* Mobile-friendly
* Consistent
* Fast
* Professional

Every asynchronous operation should have:

* Loading state
* Success state
* Error state
* Empty state where applicable

QR/review pages must be optimized for mobile devices.

---

# 25. API Performance

Avoid unnecessary database queries.

Use:

* Pagination
* Selective fields
* Aggregation queries
* Appropriate indexes

Analytics must not load every historical event into application memory when database aggregation can perform the calculation.

---

# 26. Code Quality

Do not duplicate business logic.

Prefer reusable services and utilities.

Remove dead code.

Do not leave:

* Debug console logs
* Temporary files
* Unused imports
* Fake data in production paths
* Placeholder implementations

---

# 27. Non-Destructive Development

Never delete working Phase 1 functionality to implement Phase 2.

Existing behavior must be preserved unless a documented requirement explicitly changes it.

Before modifying an existing module:

1. Understand it.
2. Identify dependencies.
3. Assess regression risk.
4. Make the smallest safe change.

---

# 28. Phase Completion Standard

A phase is NOT complete merely because code exists.

A phase is complete only when:

* Implementation is finished
* TypeScript passes
* Build passes
* Tests pass
* Database migration succeeds
* Existing features still work
* Security checks pass
* Documentation is updated
* Manual verification is completed
* Completion report is produced

---

# 29. Documentation

Maintain:

```text
README.md
docs/
  architecture/
  api/
  standards/
  phases/
```

Each completed phase must have a documented implementation and verification report.

---

# 30. Priority Rule

When requirements conflict:

1. Security
2. Data integrity
3. This coding standard
4. Existing architecture
5. Phase requirements
6. UI convenience

Never sacrifice data integrity or security for implementation speed.
