-- Migration: Insert 12 Staff Members for Clients
-- File: supabase/migrations/019_insert_staff_members.sql
-- This migration adds 12 staff_members records linked to existing clients
-- Note: After migration 017, company_owner_id references clients.id

DO $$
DECLARE
  client_record RECORD;
  client_ids UUID[];
  staff_counter INTEGER := 0;
  client_index INTEGER;
  new_staff_id UUID;
  staff_names TEXT[][] := ARRAY[
    ARRAY['Sarah', 'Johnson', 'sarah.johnson', 'Nurse'],
    ARRAY['Michael', 'Chen', 'michael.chen', 'Care Coordinator'],
    ARRAY['Emily', 'Rodriguez', 'emily.rodriguez', 'Home Health Aide'],
    ARRAY['David', 'Thompson', 'david.thompson', 'Physical Therapist'],
    ARRAY['Jessica', 'Martinez', 'jessica.martinez', 'Occupational Therapist'],
    ARRAY['Robert', 'Anderson', 'robert.anderson', 'Social Worker'],
    ARRAY['Amanda', 'Wilson', 'amanda.wilson', 'Registered Nurse'],
    ARRAY['James', 'Brown', 'james.brown', 'Licensed Practical Nurse'],
    ARRAY['Lisa', 'Davis', 'lisa.davis', 'Medical Assistant'],
    ARRAY['Christopher', 'Miller', 'christopher.miller', 'Case Manager'],
    ARRAY['Michelle', 'Garcia', 'michelle.garcia', 'Speech Therapist'],
    ARRAY['Daniel', 'White', 'daniel.white', 'Home Health Aide']
  ];
  client_companies TEXT[] := ARRAY[
    'ComfortCare Home Health Services',
    'Elite Senior Care Solutions',
    'Harmony Home Healthcare',
    'Premier Care Associates',
    'Apex Home Health Services',
    'Wellness Home Care Group',
    'Guardian Home Health LLC'
  ];
  phone_numbers TEXT[] := ARRAY[
    '(555) 123-4567',
    '(555) 234-5678',
    '(555) 345-6789',
    '(555) 456-7890',
    '(555) 567-8901',
    '(555) 678-9012',
    '(555) 789-0123',
    '(555) 890-1234',
    '(555) 901-2345',
    '(555) 012-3456',
    '(555) 111-2222',
    '(555) 222-3333'
  ];
  employee_ids TEXT[] := ARRAY[
    'EMP001',
    'EMP002',
    'EMP003',
    'EMP004',
    'EMP005',
    'EMP006',
    'EMP007',
    'EMP008',
    'EMP009',
    'EMP010',
    'EMP011',
    'EMP012'
  ];
  company_name_var TEXT;
  email_domain TEXT;
BEGIN
  -- Get all client IDs
  SELECT ARRAY_AGG(id ORDER BY company_name) INTO client_ids
  FROM clients
  WHERE company_name = ANY(client_companies);

  -- Check if we have clients
  IF client_ids IS NULL OR array_length(client_ids, 1) IS NULL THEN
    RAISE WARNING 'No clients found. Please ensure clients exist before running this migration.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % clients to assign staff members to', array_length(client_ids, 1);

  -- Insert 12 staff members, distributing them across clients
  FOR i IN 1..12 LOOP
    -- Cycle through clients (distribute staff across all clients)
    client_index := ((i - 1) % array_length(client_ids, 1)) + 1;
    
    -- Get company name for email domain
    SELECT company_name INTO company_name_var
    FROM clients
    WHERE id = client_ids[client_index];
    
    -- Create email domain from company name
    email_domain := LOWER(REPLACE(REPLACE(REPLACE(company_name_var, ' ', ''), 'LLC', ''), 'Inc', '')) || '.com';

    -- Insert staff member
    INSERT INTO staff_members (
      company_owner_id,
      user_id,  -- NULL since these are not linked to auth users
      first_name,
      last_name,
      email,
      phone,
      role,
      job_title,
      status,
      employee_id,
      start_date,
      created_at,
      updated_at
    )
    VALUES (
      client_ids[client_index],  -- Link to client (references clients.id after migration 017)
      NULL,  -- No auth user linked
      staff_names[i][1],  -- first_name
      staff_names[i][2],  -- last_name
      staff_names[i][3] || '@' || email_domain,  -- email
      phone_numbers[i],
      'Staff Member',
      staff_names[i][4],  -- job_title
      'active',
      employee_ids[i],
      CURRENT_DATE - (floor(random() * 365)::INTEGER || ' days')::INTERVAL,  -- Random start date within last year
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO new_staff_id;

    IF new_staff_id IS NOT NULL THEN
      staff_counter := staff_counter + 1;
      RAISE NOTICE '✓ Created staff member: % % for client %', 
        staff_names[i][1], 
        staff_names[i][2],
        company_name_var;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created %/12 staff member records', staff_counter;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Show distribution summary
  RAISE NOTICE 'Staff distribution by client:';
  FOR client_record IN 
    SELECT 
      c.id,
      c.company_name,
      COUNT(sm.id) as staff_count
    FROM clients c
    LEFT JOIN staff_members sm ON sm.company_owner_id = c.id
    WHERE c.company_name = ANY(client_companies)
    GROUP BY c.id, c.company_name
    ORDER BY c.company_name
  LOOP
    RAISE NOTICE '  %: % staff member(s)', client_record.company_name, client_record.staff_count;
  END LOOP;

END $$;