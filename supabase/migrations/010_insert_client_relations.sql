-- Migration: Insert Client States, Conversations, and Expert States
-- File: supabase/migrations/010_insert_client_relations.sql
-- This migration adds related data for the 7 demo clients

-- First, ensure we have a licensing expert record for the demo expert user
DO $$
DECLARE
  expert_user_id UUID;
  expert_record_id UUID;
BEGIN
  -- Get the expert user ID
  SELECT id INTO expert_user_id
  FROM auth.users
  WHERE email = 'expert@demo.com'
  LIMIT 1;

  -- If expert user exists, create or update the licensing_expert record
  IF expert_user_id IS NOT NULL THEN
    -- Check if licensing_expert record already exists
    SELECT id INTO expert_record_id
    FROM licensing_experts
    WHERE user_id = expert_user_id
    LIMIT 1;

    IF expert_record_id IS NULL THEN
      -- Create licensing_expert record
      INSERT INTO licensing_experts (user_id, first_name, last_name, email, status, expertise)
      VALUES (
        expert_user_id,
        'Demo',
        'Expert',
        'expert@demo.com',
        'active',
        'Home Healthcare, Skilled Nursing, Assisted Living'
      )
      RETURNING id INTO expert_record_id;
      
      RAISE NOTICE 'Created licensing_expert record for expert@demo.com';
    ELSE
      RAISE NOTICE 'Licensing_expert record already exists for expert@demo.com';
    END IF;
  ELSE
    RAISE WARNING 'Expert user (expert@demo.com) not found. Some records may not be created.';
  END IF;
END $$;

-- Insert client_states for the 7 clients
-- Each client gets 1-2 states assigned
INSERT INTO client_states (client_id, state)
SELECT 
  c.id,
  state_value
FROM clients c
CROSS JOIN (
  VALUES 
    ('ComfortCare Home Health Services', 'California'),
    ('ComfortCare Home Health Services', 'Texas'),
    ('Elite Senior Care Solutions', 'New York'),
    ('Harmony Home Healthcare', 'Florida'),
    ('Harmony Home Healthcare', 'California'),
    ('Premier Care Associates', 'Texas'),
    ('Apex Home Health Services', 'Illinois'),
    ('Wellness Home Care Group', 'Pennsylvania'),
    ('Wellness Home Care Group', 'Ohio'),
    ('Guardian Home Health LLC', 'Michigan')
) AS client_states_data(company_name, state_value)
WHERE c.company_name = client_states_data.company_name
ON CONFLICT (client_id, state) DO NOTHING;

-- Insert conversations for each client
-- Link conversations to the expert if available
DO $$
DECLARE
  client_record RECORD;
  expert_record_id UUID;
  days_ago INTEGER;
BEGIN
  -- Get the expert record ID
  SELECT id INTO expert_record_id
  FROM licensing_experts
  WHERE email = 'expert@demo.com' AND status = 'active'
  LIMIT 1;

  -- Create a conversation for each client
  FOR client_record IN 
    SELECT id, company_name
    FROM clients
    WHERE company_name IN (
      'ComfortCare Home Health Services',
      'Elite Senior Care Solutions',
      'Harmony Home Healthcare',
      'Premier Care Associates',
      'Apex Home Health Services',
      'Wellness Home Care Group',
      'Guardian Home Health LLC'
    )
    AND NOT EXISTS (
      SELECT 1 FROM conversations WHERE client_id = clients.id
    )
  LOOP
    -- Random days ago (0-30 days)
    days_ago := floor(random() * 31)::INTEGER;
    
    INSERT INTO conversations (client_id, expert_id, last_message_at)
    VALUES (
      client_record.id,
      expert_record_id,
      NOW() - (days_ago || ' days')::INTERVAL
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Insert expert_states for the expert
-- Assign the expert to multiple states they specialize in
INSERT INTO expert_states (expert_id, state)
SELECT 
  le.id,
  state_value
FROM licensing_experts le
CROSS JOIN (
  VALUES 
    ('California'),
    ('Texas'),
    ('New York'),
    ('Florida'),
    ('Illinois'),
    ('Pennsylvania'),
    ('Ohio')
) AS expert_states_data(state_value)
WHERE le.email = 'expert@demo.com'
  AND le.status = 'active'
ON CONFLICT (expert_id, state) DO NOTHING;

-- Update clients to assign expert_id where we have an expert
UPDATE clients c
SET expert_id = le.user_id
FROM licensing_experts le
WHERE le.email = 'expert@demo.com'
  AND le.status = 'active'
  AND c.company_name IN (
    'ComfortCare Home Health Services',
    'Elite Senior Care Solutions',
    'Harmony Home Healthcare',
    'Premier Care Associates',
    'Apex Home Health Services',
    'Wellness Home Care Group',
    'Guardian Home Health LLC'
  )
  AND c.expert_id IS NULL;

-- Summary
DO $$
DECLARE
  client_states_count INTEGER;
  conversations_count INTEGER;
  expert_states_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO client_states_count
  FROM client_states cs
  INNER JOIN clients c ON c.id = cs.client_id
  WHERE c.company_name IN (
    'ComfortCare Home Health Services',
    'Elite Senior Care Solutions',
    'Harmony Home Healthcare',
    'Premier Care Associates',
    'Apex Home Health Services',
    'Wellness Home Care Group',
    'Guardian Home Health LLC'
  );

  SELECT COUNT(*) INTO conversations_count
  FROM conversations conv
  INNER JOIN clients c ON c.id = conv.client_id
  WHERE c.company_name IN (
    'ComfortCare Home Health Services',
    'Elite Senior Care Solutions',
    'Harmony Home Healthcare',
    'Premier Care Associates',
    'Apex Home Health Services',
    'Wellness Home Care Group',
    'Guardian Home Health LLC'
  );

  SELECT COUNT(*) INTO expert_states_count
  FROM expert_states es
  INNER JOIN licensing_experts le ON le.id = es.expert_id
  WHERE le.email = 'expert@demo.com';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Client States: % records', client_states_count;
  RAISE NOTICE '  Conversations: % records', conversations_count;
  RAISE NOTICE '  Expert States: % records', expert_states_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
