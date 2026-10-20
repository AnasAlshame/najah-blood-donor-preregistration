# An-Najah National University — Blood Donor Pre-Registration System

## نظام التسجيل المسبق للمتبرعين بالدم — جامعة النجاح الوطنية

Production-grade, zero-budget, mobile-first web system engineered for An-Najah National University's blood donor campaign. Designed for volunteer registration via on-campus QR code scanning.

---

### Core Highlights

1. **Zero-Budget Compliant ($0/mo)**: Configured for Vercel/Cloudflare Pages deployment with an independent Supabase PostgreSQL database.
2. **Institutional Visual Identity**: Strictly follows An-Najah brand colors (`#002B49` Navy, `#00A3E0` Cyan). Red medical colors are strictly excluded.
3. **Privacy & Explicit Consent**: Captures explicit user consent, client metadata hashes, and clear purpose statements.
4. **Security by Design**:
   - Strict Row Level Security (RLS) on PostgreSQL.
   - Public users can only insert validated data; reading, modifying, or deleting records is prohibited.
   - Duplicate prevention based on University ID. Existing records are never overwritten via public endpoints.
   - Serverless in-memory rate limiting and silent honeypot spam protection.
   - Bearer token authorization on administrative data export.
5. **No Medical Overpromising**: The system collects self-reported data and explicitly informs donors that clinical eligibility is determined only at blood bank donation sessions.
6. **Encrypted Backup & Recovery**: Custom zero-dependency AES-256-GCM backup and restoration verification scripts.

---

### Quick Start Guide

#### 1. Requirements
- Node.js 18+ (tested on Node.js 24)
- npm or pnpm
- Git

#### 2. Local Setup
```bash
# Clone the repository
git clone <your-github-repo-url>
cd najah-blood-donor-preregistration

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run tests
npm test

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the registration portal.

---

### Production Verification Gates
- **Tests**: `npm test` (Runs Vitest unit and integration suites)
- **Build**: `npm run build` (Next.js production compiler & TypeScript verification)
- **Backup Verification**: `node scripts/restore.js <file> --dry-run`

---

### Engineering Documentation Index
1. [ARCHITECTURE.md](ARCHITECTURE.md) — System boundaries, data flow, and components.
2. [REQUIREMENTS.md](REQUIREMENTS.md) — Campaign requirements and scope matrix.
3. [DATABASE.md](DATABASE.md) — Schema definition, RLS policies, indexes, and constraints.
4. [SECURITY.md](SECURITY.md) — Threat model, OWASP Top 10 defenses, and admin protection.
5. [TESTING.md](TESTING.md) — Test pyramid, automated test cases, and quality gates.
6. [DEPLOYMENT.md](DEPLOYMENT.md) — Zero-budget deployment runbook on Vercel and Supabase.
7. [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md) — Encrypted backup runbook, RPO/RTO, and restoration drills.
8. [FUTURE_INTEGRATION.md](FUTURE_INTEGRATION.md) — Data contracts and migration plan for the university's main blood donation platform.
