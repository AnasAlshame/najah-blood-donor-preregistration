-- ====================================================================
-- An-Najah National University - Blood Donor Pre-Registration Campaign
-- Migration 001: Initial Core Schema & Strict Row Level Security (RLS)
-- ====================================================================

-- 1. Create Enumerations for controlled domain values
DO $$ BEGIN
    CREATE TYPE blood_group_type AS ENUM (
        'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE availability_status_type AS ENUM (
        'AVAILABLE',
        'CURRENTLY_UNAVAILABLE',
        'RECENTLY_DONATED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE registration_status_type AS ENUM (
        'ACTIVE',
        'ARCHIVED',
        'MIGRATED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Donor Registrations Table
CREATE TABLE IF NOT EXISTS public.donor_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    university_id VARCHAR(50) NOT NULL UNIQUE,
    campus VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    age SMALLINT NOT NULL CHECK (age >= 16 AND age <= 75),
    gender VARCHAR(20) NOT NULL,
    blood_type blood_group_type NOT NULL DEFAULT 'UNKNOWN',
    blood_type_verification VARCHAR(30) NOT NULL DEFAULT 'SELF_REPORTED',
    governorate VARCHAR(100) NOT NULL,
    city_or_village VARCHAR(100) NOT NULL,
    availability_status availability_status_type NOT NULL DEFAULT 'AVAILABLE',
    last_donation_date DATE NULL,
    health_disclosure TEXT NULL,
    registration_source VARCHAR(100) NOT NULL DEFAULT 'QR_CAMPAIGN_2026',
    status registration_status_type NOT NULL DEFAULT 'ACTIVE',
    schema_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT check_last_donation_not_future CHECK (
        last_donation_date IS NULL OR last_donation_date <= CURRENT_DATE
    )
);

-- Indexing for fast and secure lookups / operational filtering
CREATE INDEX IF NOT EXISTS idx_donor_university_id ON public.donor_registrations(university_id);
CREATE INDEX IF NOT EXISTS idx_donor_blood_type ON public.donor_registrations(blood_type);
CREATE INDEX IF NOT EXISTS idx_donor_governorate ON public.donor_registrations(governorate);
CREATE INDEX IF NOT EXISTS idx_donor_availability ON public.donor_registrations(availability_status);
CREATE INDEX IF NOT EXISTS idx_donor_created_at ON public.donor_registrations(created_at DESC);

-- 3. Consent Records Table (Mandatory for privacy compliance)
CREATE TABLE IF NOT EXISTS public.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.donor_registrations(id) ON DELETE CASCADE,
    consent_version VARCHAR(20) NOT NULL,
    consent_text_snapshot TEXT NOT NULL,
    explicit_consent_given BOOLEAN NOT NULL DEFAULT true,
    consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ip_hash VARCHAR(64) NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_registration_id ON public.consent_records(registration_id);

-- 4. Administrative Audit Events Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NULL,
    metadata JSONB NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON public.admin_audit_logs(performed_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.donor_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Deny all direct public SELECT/UPDATE/DELETE access to registrations
-- Public cannot view existing donors under any circumstances.
DROP POLICY IF EXISTS "Deny public select on registrations" ON public.donor_registrations;
CREATE POLICY "Deny public select on registrations" ON public.donor_registrations
    FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "Deny public update on registrations" ON public.donor_registrations;
CREATE POLICY "Deny public update on registrations" ON public.donor_registrations
    FOR UPDATE TO anon USING (false);

DROP POLICY IF EXISTS "Deny public delete on registrations" ON public.donor_registrations;
CREATE POLICY "Deny public delete on registrations" ON public.donor_registrations
    FOR DELETE TO anon USING (false);

-- Service role / Authenticated admins can manage registrations
DROP POLICY IF EXISTS "Service role full access on registrations" ON public.donor_registrations;
CREATE POLICY "Service role full access on registrations" ON public.donor_registrations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on consent" ON public.consent_records;
CREATE POLICY "Service role full access on consent" ON public.consent_records
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on audit" ON public.admin_audit_logs;
CREATE POLICY "Service role full access on audit" ON public.admin_audit_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);
