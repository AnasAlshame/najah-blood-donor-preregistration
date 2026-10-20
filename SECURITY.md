# Security Architecture & Threat Model

## 1. Principles
- **Least Privilege**: Browser client bundles only have access to `NEXT_PUBLIC_SUPABASE_ANON_KEY` which is strictly blocked from reading donor records by PostgreSQL RLS.
- **Zero Sensitive Data in Public Endpoints**: Public clients have no read endpoints for registered donors.
- **Data Minimization**: No national ID numbers, exact street addresses, GPS coordinates, or comprehensive medical history are collected.

## 2. Threat Modeling & OWASP Top 10 Mitigations

| Threat Vector | Mitigation Strategy | Location |
|---------------|---------------------|----------|
| **Broken Access Control (A01)** | RLS denies public reads and edits. Admin exports strictly guarded by bearer token `ADMIN_SECRET_KEY`. | `supabase/migrations/001_initial_schema.sql`, `src/app/api/admin/export/route.ts` |
| **Cryptographic Failures (A02)** | All traffic transmitted over HTTPS/TLS. Encrypted backups use `AES-256-GCM` with random initialization vectors (IV). | `scripts/backup.js` |
| **Injection (A03)** | Strict schema validation with Zod. All Supabase / PostgreSQL queries are parameterized. | `src/lib/validation.ts`, `src/app/api/register/route.ts` |
| **Insecure Design (A04)** | Duplicates do not overwrite existing records. Rate limiting and honeypots deter automation. | `src/lib/rateLimit.ts`, `src/lib/validation.ts` |
| **Security Misconfiguration (A05)** | Secrets stored in `.env.local` and `.gitignore`. No hardcoded tokens. | `.env.example`, `.gitignore` |
| **Vulnerable Components (A06)** | Minimal dependency footprint, audited via `npm audit` and pinned versions. | `package.json` |
| **Identification & Auth Failures (A07)** | Administrative export strictly requires high-entropy bearer token. | `src/app/api/admin/export/route.ts` |
| **Software and Data Integrity Failures (A08)** | Full TypeScript typing, strict compiler options, and automated test gates. | `tsconfig.json`, `src/tests/` |
| **Security Logging & Monitoring (A09)** | Administrative export actions are recorded in `admin_audit_logs`. | `src/app/api/admin/export/route.ts` |
| **Server-Side Request Forgery (A10)** | No user-supplied URLs or webhooks are queried by the backend. | Architectural invariant |

## 3. Administrative Protection
Administrative exports are available via:
```bash
curl -H "Authorization: Bearer <ADMIN_SECRET_KEY>" https://<your-app-domain>/api/admin/export?format=csv -o donors.csv
```
Unauthorized requests receive HTTP 401 Unauthorized with no sensitive stack trace.
