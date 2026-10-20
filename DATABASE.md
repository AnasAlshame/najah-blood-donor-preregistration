# Database Architecture & Data Integrity

## 1. Schema Definition

The schema is defined in `supabase/migrations/001_initial_schema.sql`.

### Tables

#### `public.donor_registrations`
- `id` (UUID, Primary Key, default `gen_random_uuid()`): Immutable unique identifier.
- `full_name` (VARCHAR 150): Full student/staff Arabic name.
- `university_id` (VARCHAR 50, UNIQUE): Student/employee ID. Preserves leading zeros and alphanumeric chars.
- `campus` (VARCHAR 100): Approved university campus branch.
- `phone_number` (VARCHAR 30): Normalized Palestinian mobile phone number.
- `age` (SMALLINT, CHECK `age >= 16 AND age <= 75`).
- `gender` (VARCHAR 20): Male / Female.
- `blood_type` (ENUM `blood_group_type`): Self-reported blood group (A+, A-, B+, B-, AB+, AB-, O+, O-, UNKNOWN).
- `blood_type_verification` (VARCHAR 30, default `'SELF_REPORTED'`).
- `governorate` (VARCHAR 100): Palestinian governorate.
- `city_or_village` (VARCHAR 100): Town or village.
- `availability_status` (ENUM `availability_status_type`): AVAILABLE, CURRENTLY_UNAVAILABLE, RECENTLY_DONATED.
- `last_donation_date` (DATE, NULLABLE, CHECK `<= CURRENT_DATE`).
- `health_disclosure` (TEXT, NULLABLE): Minimal voluntary health disclosure.
- `registration_source` (VARCHAR 100, default `'QR_CAMPAIGN_2026'`).
- `status` (ENUM `registration_status_type`): ACTIVE, ARCHIVED, MIGRATED.
- `schema_version` (VARCHAR 10, default `'1.0'`).
- `created_at` (TIMESTAMPTZ).
- `updated_at` (TIMESTAMPTZ).

#### `public.consent_records`
- `id` (UUID, Primary Key).
- `registration_id` (UUID, Foreign Key to `donor_registrations.id` ON DELETE CASCADE).
- `consent_version` (VARCHAR 20): E.g., `v1.0-2026`.
- `consent_text_snapshot` (TEXT): Exact snapshot of the legal disclosure at the time of agreement.
- `explicit_consent_given` (BOOLEAN, default `true`).
- `consent_timestamp` (TIMESTAMPTZ).
- `ip_hash` (VARCHAR 64): SHA-256 salted hash of client IP.

#### `public.admin_audit_logs`
- `id` (UUID, Primary Key).
- `actor` (VARCHAR 100): Identity of actor (e.g. `ADMIN_SECRET_KEY_HOLDER`).
- `action` (VARCHAR 50): Action type (e.g., `EXPORT_ALL_RECORDS`).
- `resource_type` (VARCHAR 50).
- `resource_id` (UUID, NULLABLE).
- `metadata` (JSONB): Non-sensitive event metadata.
- `performed_at` (TIMESTAMPTZ).

## 2. Row Level Security (RLS) Policies
- Direct `SELECT` to public anonymous users: **DENIED (false)**.
- Direct `UPDATE` to public anonymous users: **DENIED (false)**.
- Direct `DELETE` to public anonymous users: **DENIED (false)**.
- Insertion and administrative queries must run through the validated server layer using `service_role`.

## 3. Duplicate Handling Strategy
When a submission arrives with a previously recorded `university_id`:
1. Server queries `donor_registrations` by `university_id`.
2. If exists, returns HTTP 409 Conflict with Arabic message informing the user that the ID is already registered.
3. **No existing record is updated** or overwritten to prevent identity tampering.
