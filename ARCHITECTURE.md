# Architecture & Design System

## 1. System Overview & Boundaries

The An-Najah Blood Donor Pre-Registration Campaign is architected as a decoupled, privacy-centric modular web system. It serves two distinct personas:
1. **Prospective Donors (Students & Staff)**: Mobile users scanning printed QR codes on campus.
2. **Authorized Campaign Administrators**: Authorized university representatives exporting records for emergency calls or future migration.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|  +---------------------------+             +----------------------------------+   |
|  |   Donor Mobile Browser    |             |       Authorized Admin Tool      |   |
|  |  (Next.js App / Arabic)   |             |    (cURL / Postman / Dashboard)  |   |
|  +-------------+-------------+             +-----------------+----------------+   |
+----------------|---------------------------------------------|--------------------+
                 | HTTPS POST /api/register                    | HTTPS GET /api/admin/export
                 v                                             v Bearer Token
+-----------------------------------------------------------------------------------+
|                            APPLICATION / API LAYER                                |
|                                                                                   |
|  +---------------------------+             +----------------------------------+   |
|  |  - Rate Limiter (IP)      |             |  - Secret Token Verification     |   |
|  |  - Honeypot Trap Detector |             |  - Structured JSON / CSV Format  |   |
|  |  - Zod Input Validator    |             |  - Audit Log Event Dispatcher    |   |
|  |  - Phone Normalizer       |             |                                  |   |
|  +-------------+-------------+             +-----------------+----------------+   |
+----------------|---------------------------------------------|--------------------+
                 | Service Role (RLS Protected)                | Read Query
                 v                                             v
+-----------------------------------------------------------------------------------+
|                            PERSISTENCE LAYER (PostgreSQL)                         |
|                                                                                   |
|  +-----------------------------+          +------------------------------------+  |
|  |   donor_registrations       |          |         consent_records            |  |
|  |   (University ID Unique)    |          |   (Explicit Consent & IP Hash)     |  |
|  +--------------+--------------+          +------------------------------------+  |
|                 |                                                                 |
|                 +------------------->     +------------------------------------+  |
|                                           |         admin_audit_logs           |  |
|                                           +------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

## 2. Separation of Concerns
- **UI Presentation**: Isolated in `src/components/RegistrationForm.tsx` and `src/app/page.tsx`. Clean Arabic RTL forms, no direct database queries.
- **Validation Engine**: Pure functions in `src/lib/validation.ts`. Cross-validated using Zod on both client and server.
- **Persistence Boundary**: Isolated in `src/lib/supabase.ts` and `supabase/migrations/001_initial_schema.sql`. Zero direct exposure of privileged credentials.
- **Admin Access**: Isolated in `src/app/api/admin/export/route.ts` requiring `ADMIN_SECRET_KEY` and writing to `admin_audit_logs`.

## 3. Technology Stack & Tradeoffs
- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.
- **Runtime**: Node.js standard serverless runtime.
- **Rationale**: Highest compatibility with free-tier edge networks (Vercel, Cloudflare Pages), zero server maintenance, and automatic TLS/HTTPS.
