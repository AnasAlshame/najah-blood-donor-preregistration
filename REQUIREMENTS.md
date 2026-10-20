# Campaign Requirements & Traceability Matrix

## 1. Functional Requirements

| Req ID | Description | Implementation Surface | Test Evidence |
|--------|-------------|------------------------|---------------|
| **REQ-001** | Branded Arabic landing page with university identity | `src/app/page.tsx`, `src/app/globals.css` | Verified build & design review |
| **REQ-002** | Clean registration form without requiring user login | `src/components/RegistrationForm.tsx` | Tested in production build |
| **REQ-003** | Phone number validation supporting Palestinian carriers (059/056) | `src/lib/validation.ts` | `src/tests/validation.test.ts` (Passed) |
| **REQ-004** | Explicit consent checkbox required prior to submission | `src/components/RegistrationForm.tsx`, `src/lib/validation.ts` | `src/tests/validation.test.ts` (Passed) |
| **REQ-005** | No overwrite on duplicate University ID | `src/app/api/register/route.ts` | 409 Conflict logic on duplicate ID |
| **REQ-006** | Self-reported blood type options with 'UNKNOWN' fallback | `src/types/donor.ts`, `src/lib/validation.ts` | `src/tests/validation.test.ts` (Passed) |
| **REQ-007** | Non-destructive honeypot anti-spam defense | `src/components/RegistrationForm.tsx`, `src/app/api/register/route.ts` | `src/tests/validation.test.ts` (Passed) |
| **REQ-008** | Protected administrator export (JSON & CSV formats) | `src/app/api/admin/export/route.ts` | Bearer token authorization gate |
| **REQ-009** | Encrypted zero-budget database backup & dry-run restore | `scripts/backup.js`, `scripts/restore.js` | AES-256-GCM verification script |
| **REQ-010** | High-resolution campaign QR code asset generation | `public/campaign_qr.png`, `public/campaign_qr.svg` | Verified generated files |

## 2. Explicit Non-Functional Constraints
- **Clinical Non-Eligibility Disclaimer**: Form explicitly disclaims clinical eligibility, reminding donors that blood donation suitability is tested in person.
- **Budget**: $0/month infrastructure cost.
- **Accessibility**: High contrast academic palette (`#002B49` on `#FFFFFF` / `#00A3E0` accents), semantic HTML tags, keyboard navigability, clear focus rings.
