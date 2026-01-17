-- Migration: Add 4 sample license records to applications table for staff members
-- This migration inserts 4 sample licenses/certifications for existing staff members

DO $$
DECLARE
  staff_member_rec RECORD;
  staff_members_array UUID[];
  license_types TEXT[] := ARRAY[
    'Registered Nurse (RN)',
    'Basic Life Support (BLS)',
    'Certified Home Health Aide (CHHA)',
    'Licensed Practical Nurse (LPN)'
  ];
  license_numbers TEXT[] := ARRAY[
    'RN-2021-12345',
    'BLS-2021-67890',
    'CHHA-TX-2021-001',
    'LPN-CA-2022-456'
  ];
  states TEXT[] := ARRAY[
    'Texas',
    'California',
    'Texas',
    'California'
  ];
  issuing_authorities TEXT[] := ARRAY[
    'Texas Board of Nursing',
    'American Heart Association',
    'Texas Health and Human Services',
    'California Board of Vocational Nursing'
  ];
  issue_dates DATE[] := ARRAY[
    '2022-03-14'::DATE,
    '2024-01-09'::DATE,
    '2021-01-19'::DATE,
    '2022-06-15'::DATE
  ];
  expiry_dates DATE[] := ARRAY[
    '2026-03-14'::DATE,
    '2026-04-19'::DATE,
    '2026-07-29'::DATE,
    '2026-02-25'::DATE
  ];
  staff_counter INTEGER := 0;
  i INTEGER;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Get first 4 active staff members
  SELECT ARRAY_AGG(id ORDER BY created_at ASC)
  INTO staff_members_array
  FROM staff_members
  WHERE status = 'active'
  LIMIT 4;

  -- Check if we have enough staff members
  IF staff_members_array IS NULL OR array_length(staff_members_array, 1) < 4 THEN
    RAISE NOTICE 'Warning: Found fewer than 4 active staff members. Creating licenses for available staff.';
  END IF;

  -- Insert 4 license records
  FOR i IN 1..LEAST(4, COALESCE(array_length(staff_members_array, 1), 0)) LOOP
    -- Calculate days until expiry
    DECLARE
      days_until_expiry_val INTEGER;
      started_date_val DATE;
      last_updated_date_val DATE;
      submitted_date_val DATE;
    BEGIN
      days_until_expiry_val := expiry_dates[i] - today_date;
      started_date_val := issue_dates[i];
      last_updated_date_val := today_date;
      submitted_date_val := issue_dates[i];

      -- Insert application record (representing a staff license)
      INSERT INTO applications (
        staff_member_id,
        company_owner_id,  -- NULL for staff licenses
        application_name,  -- This is the license type
        license_number,
        state,
        status,  -- 'approved' means active license
        progress_percentage,
        started_date,
        last_updated_date,
        submitted_date,
        issue_date,
        expiry_date,
        days_until_expiry,
        issuing_authority,
        created_at,
        updated_at
      )
      VALUES (
        staff_members_array[i],
        NULL,  -- Staff licenses don't have company_owner_id
        license_types[i],
        license_numbers[i],
        states[i],
        'approved',  -- Status: approved = active license
        100,  -- Progress: 100% for completed licenses
        started_date_val,
        last_updated_date_val,
        submitted_date_val,
        issue_dates[i],
        expiry_dates[i],
        days_until_expiry_val,  -- Will be recalculated by trigger, but set initial value
        issuing_authorities[i],
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING;

      -- Get staff member name for logging
      SELECT first_name, last_name
      INTO staff_member_rec
      FROM staff_members
      WHERE id = staff_members_array[i];

      IF FOUND THEN
        staff_counter := staff_counter + 1;
        RAISE NOTICE '✓ Created license "%" for staff member % % (ID: %)',
          license_types[i],
          staff_member_rec.first_name,
          staff_member_rec.last_name,
          staff_members_array[i];
      END IF;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created %/4 staff license records in applications table', staff_counter;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Show summary of created licenses
  RAISE NOTICE 'License Summary:';
  FOR staff_member_rec IN
    SELECT 
      sm.id,
      sm.first_name,
      sm.last_name,
      COUNT(a.id) as license_count
    FROM staff_members sm
    LEFT JOIN applications a ON a.staff_member_id = sm.id AND a.staff_member_id IS NOT NULL
    WHERE sm.id = ANY(staff_members_array)
    GROUP BY sm.id, sm.first_name, sm.last_name
    ORDER BY sm.first_name, sm.last_name
  LOOP
    RAISE NOTICE '  % %: % license(s)',
      staff_member_rec.first_name,
      staff_member_rec.last_name,
      staff_member_rec.license_count;
  END LOOP;

END $$;
