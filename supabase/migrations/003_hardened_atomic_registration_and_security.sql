-- ====================================================================
-- An-Najah National University - WASel Campaign
-- Migration 003: Hardened Atomic Registration RPC, Role Privileges & Schema Upgrade
-- ====================================================================

-- 1. Safely add separated fields to public.donor_registrations
ALTER TABLE public.donor_registrations 
ADD COLUMN IF NOT EXISTS university_email VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS detailed_address TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_donor_university_email ON public.donor_registrations(university_email);

-- 2. Create the Hardened Atomic Registration Function
-- Fixed search_path prevents search_path hijacking
-- Strict privilege revocation prevents unauthenticated direct invocation via PostgREST
CREATE OR REPLACE FUNCTION public.register_donor_atomic(
    p_full_name VARCHAR(150),
    p_university_id VARCHAR(50),
    p_university_email VARCHAR(100),
    p_campus VARCHAR(100),
    p_phone_number VARCHAR(30),
    p_age SMALLINT,
    p_gender VARCHAR(20),
    p_blood_type public.blood_group_type,
    p_governorate VARCHAR(100),
    p_city_or_village VARCHAR(100),
    p_detailed_address TEXT,
    p_availability_status public.availability_status_type,
    p_last_donation_date DATE,
    p_health_disclosure TEXT,
    p_consent_version VARCHAR(20),
    p_consent_text TEXT,
    p_ip_hash VARCHAR(64)
)
RETURNS TABLE (
    success BOOLEAN,
    donor_id UUID,
    error_code VARCHAR(50),
    error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_donor_id UUID;
    v_existing_id UUID;
BEGIN
    -- Duplicate check on university_id
    SELECT id INTO v_existing_id 
    FROM public.donor_registrations 
    WHERE university_id = p_university_id 
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'DUPLICATE_ID'::VARCHAR(50), 'University ID already registered'::TEXT;
        RETURN;
    END IF;

    -- Insert Donor Registration
    INSERT INTO public.donor_registrations (
        full_name,
        university_id,
        university_email,
        campus,
        phone_number,
        age,
        gender,
        blood_type,
        blood_type_verification,
        governorate,
        city_or_village,
        detailed_address,
        availability_status,
        last_donation_date,
        health_disclosure,
        registration_source,
        status,
        schema_version,
        created_at,
        updated_at
    ) VALUES (
        p_full_name,
        p_university_id,
        p_university_email,
        p_campus,
        p_phone_number,
        p_age,
        p_gender,
        p_blood_type,
        'SELF_REPORTED',
        p_governorate,
        p_city_or_village,
        p_detailed_address,
        p_availability_status,
        p_last_donation_date,
        p_health_disclosure,
        'QR_CAMPAIGN_2026',
        'ACTIVE',
        '2.0',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_donor_id;

    -- Insert Consent Record Atomically
    INSERT INTO public.consent_records (
        registration_id,
        consent_version,
        consent_text_snapshot,
        explicit_consent_given,
        consent_timestamp,
        ip_hash
    ) VALUES (
        v_donor_id,
        p_consent_version,
        p_consent_text,
        true,
        timezone('utc'::text, now()),
        p_ip_hash
    );

    RETURN QUERY SELECT true, v_donor_id, NULL::VARCHAR(50), 'Registration successful'::TEXT;
EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT false, NULL::UUID, 'DUPLICATE_ID'::VARCHAR(50), 'University ID already registered'::TEXT;
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, NULL::UUID, 'DATABASE_ERROR'::VARCHAR(50), SQLERRM::TEXT;
END;
$$;

-- 3. Enforce Least Privilege: Revoke public/unauthenticated execution
REVOKE ALL ON FUNCTION public.register_donor_atomic(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, SMALLINT, VARCHAR, 
    public.blood_group_type, VARCHAR, VARCHAR, TEXT, 
    public.availability_status_type, DATE, TEXT, VARCHAR, TEXT, VARCHAR
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.register_donor_atomic(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, SMALLINT, VARCHAR, 
    public.blood_group_type, VARCHAR, VARCHAR, TEXT, 
    public.availability_status_type, DATE, TEXT, VARCHAR, TEXT, VARCHAR
) FROM anon;

REVOKE ALL ON FUNCTION public.register_donor_atomic(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, SMALLINT, VARCHAR, 
    public.blood_group_type, VARCHAR, VARCHAR, TEXT, 
    public.availability_status_type, DATE, TEXT, VARCHAR, TEXT, VARCHAR
) FROM authenticated;

-- Grant execution exclusively to the trusted backend service_role
GRANT EXECUTE ON FUNCTION public.register_donor_atomic(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, SMALLINT, VARCHAR, 
    public.blood_group_type, VARCHAR, VARCHAR, TEXT, 
    public.availability_status_type, DATE, TEXT, VARCHAR, TEXT, VARCHAR
) TO service_role;
