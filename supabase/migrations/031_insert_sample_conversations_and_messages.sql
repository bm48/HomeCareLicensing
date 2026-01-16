-- Migration: Insert Sample Conversations and Messages
-- File: supabase/migrations/031_insert_sample_conversations_and_messages.sql
-- This migration creates sample conversations and messages for testing the messaging system

DO $$
DECLARE
  admin_user_id UUID;
  expert_user_id UUID;
  owner_user_id UUID;
  client_id_val UUID;
  expert_record_id UUID;
  admin_conv_id UUID;
  expert_conv_id UUID;
  message_id UUID;
  base_timestamp TIMESTAMPTZ;
BEGIN
  -- Get demo user IDs
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@demo.com' LIMIT 1;
  SELECT id INTO expert_user_id FROM auth.users WHERE email = 'expert@demo.com' LIMIT 1;
  SELECT id INTO owner_user_id FROM auth.users WHERE email = 'owner@demo.com' LIMIT 1;

  -- Check if users exist
  IF admin_user_id IS NULL THEN
    RAISE WARNING 'Admin user (admin@demo.com) not found. Please run migration 006_demo_accounts.sql first.';
    RETURN;
  END IF;

  IF expert_user_id IS NULL THEN
    RAISE WARNING 'Expert user (expert@demo.com) not found. Please run migration 006_demo_accounts.sql first.';
    RETURN;
  END IF;

  IF owner_user_id IS NULL THEN
    RAISE WARNING 'Owner user (owner@demo.com) not found. Please run migration 006_demo_accounts.sql first.';
    RETURN;
  END IF;

  -- Get or create client for owner
  SELECT id INTO client_id_val
  FROM clients
  WHERE company_owner_id = owner_user_id
  LIMIT 1;

  -- If no client exists, create one
  IF client_id_val IS NULL THEN
    INSERT INTO clients (company_name, contact_name, contact_email, contact_phone, status, expert_id, company_owner_id)
    VALUES (
      'Demo Home Care Services',
      'Demo Company Owner',
      'owner@demo.com',
      '555-0100',
      'active',
      expert_user_id, -- Assign expert to this client
      owner_user_id
    )
    RETURNING id INTO client_id_val;
    RAISE NOTICE 'Created client record for owner@demo.com';
  ELSE
    -- Update client to ensure expert is assigned
    UPDATE clients
    SET expert_id = expert_user_id
    WHERE id = client_id_val AND expert_id IS NULL;
    RAISE NOTICE 'Using existing client record for owner@demo.com';
  END IF;

  -- Get expert record
  SELECT id INTO expert_record_id
  FROM licensing_experts
  WHERE user_id = expert_user_id
  LIMIT 1;

  -- If no expert record exists, create one
  IF expert_record_id IS NULL THEN
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
    RAISE NOTICE 'Using existing licensing_expert record for expert@demo.com';
  END IF;

  -- Set base timestamp (2 days ago)
  base_timestamp := NOW() - INTERVAL '2 days';

  -- ============================================
  -- CREATE ADMIN-CLIENT CONVERSATION
  -- ============================================
  
  -- Check if admin conversation already exists
  SELECT id INTO admin_conv_id
  FROM conversations
  WHERE client_id = client_id_val
    AND admin_id = admin_user_id
    AND expert_id IS NULL
  LIMIT 1;

  -- Create admin conversation if it doesn't exist
  IF admin_conv_id IS NULL THEN
    INSERT INTO conversations (client_id, admin_id, expert_id, last_message_at, created_at, updated_at)
    VALUES (
      client_id_val,
      admin_user_id,
      NULL,
      base_timestamp + INTERVAL '1 day' + INTERVAL '5 hours',
      base_timestamp,
      base_timestamp
    )
    RETURNING id INTO admin_conv_id;
    RAISE NOTICE 'Created admin-client conversation (ID: %)', admin_conv_id;
  ELSE
    RAISE NOTICE 'Admin-client conversation already exists (ID: %)', admin_conv_id;
  END IF;

  -- Insert messages in admin conversation
  -- Message 1: Admin greeting
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    admin_conv_id,
    admin_user_id,
    'Hello! Welcome to Home Care Licensing. I''m here to help you with any questions about your licensing needs.',
    TRUE,
    base_timestamp + INTERVAL '1 hour'
  );

  -- Message 2: Client response
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    admin_conv_id,
    owner_user_id,
    'Thank you! I need help with getting licensed in California. What documents do I need?',
    TRUE,
    base_timestamp + INTERVAL '2 hours'
  );

  -- Message 3: Admin response
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    admin_conv_id,
    admin_user_id,
    'For California, you''ll need: 1) Business license, 2) Proof of insurance, 3) Background checks for all staff, 4) Facility inspection report. I can guide you through each step.',
    TRUE,
    base_timestamp + INTERVAL '3 hours'
  );

  -- Message 4: Client follow-up
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    admin_conv_id,
    owner_user_id,
    'Great! How long does the process typically take?',
    TRUE,
    base_timestamp + INTERVAL '4 hours'
  );

  -- Message 5: Admin response
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    admin_conv_id,
    admin_user_id,
    'The typical processing time is 60-90 days from submission. However, with our expert guidance, we can help you complete everything correctly the first time, which often speeds up the process.',
    TRUE,
    base_timestamp + INTERVAL '5 hours'
  );

  -- Message 6: Client (unread)
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    admin_conv_id,
    owner_user_id,
    'That sounds good. I''ll start gathering the documents. Should I upload them here?',
    FALSE,
    base_timestamp + INTERVAL '1 day' + INTERVAL '5 hours'
  );

  RAISE NOTICE 'Inserted 6 messages in admin-client conversation';

  -- ============================================
  -- CREATE EXPERT-CLIENT CONVERSATION
  -- ============================================

  -- Check if expert conversation already exists
  SELECT id INTO expert_conv_id
  FROM conversations
  WHERE client_id = client_id_val
    AND expert_id = expert_record_id
    AND admin_id IS NULL
  LIMIT 1;

  -- Create expert conversation if it doesn't exist
  IF expert_conv_id IS NULL THEN
    INSERT INTO conversations (client_id, admin_id, expert_id, last_message_at, created_at, updated_at)
    VALUES (
      client_id_val,
      NULL,
      expert_record_id,
      base_timestamp + INTERVAL '1 day' + INTERVAL '8 hours',
      base_timestamp + INTERVAL '6 hours',
      base_timestamp + INTERVAL '6 hours'
    )
    RETURNING id INTO expert_conv_id;
    RAISE NOTICE 'Created expert-client conversation (ID: %)', expert_conv_id;
  ELSE
    RAISE NOTICE 'Expert-client conversation already exists (ID: %)', expert_conv_id;
  END IF;

  -- Insert messages in expert conversation
  -- Message 1: Expert introduction
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    expert_conv_id,
    expert_user_id,
    'Hi! I''m your assigned licensing expert. I specialize in California and Texas home care licensing. How can I assist you today?',
    TRUE,
    base_timestamp + INTERVAL '6 hours'
  );

  -- Message 2: Client response
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    expert_conv_id,
    owner_user_id,
    'Hello! I''m working on getting licensed in California. The admin mentioned I need several documents. Can you help me understand the specific requirements?',
    TRUE,
    base_timestamp + INTERVAL '7 hours'
  );

  -- Message 3: Expert detailed response
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    expert_conv_id,
    expert_user_id,
    'Absolutely! For California home care licensing, here are the key requirements:

1. **Business Entity Documents**: Articles of incorporation or organization
2. **Insurance**: General liability ($1M minimum) and workers'' compensation
3. **Background Checks**: Live scan fingerprints for all owners and key personnel
4. **Financial Statements**: Last 2 years of financial records
5. **Facility Information**: If providing in-home care, you need a business address
6. **Staffing Plan**: Details of your staffing structure

I can review each document with you before submission to ensure everything is correct.',
    TRUE,
    base_timestamp + INTERVAL '8 hours'
  );

  -- Message 4: Client question
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    expert_conv_id,
    owner_user_id,
    'What about the application fee? And do I need to submit everything at once?',
    TRUE,
    base_timestamp + INTERVAL '9 hours'
  );

  -- Message 5: Expert response
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    expert_conv_id,
    expert_user_id,
    'The application fee is $500 for initial licensing. You can submit documents as you gather them, but the application won''t be processed until all required documents are received. I recommend submitting everything together to avoid delays.',
    TRUE,
    base_timestamp + INTERVAL '10 hours'
  );

  -- Message 6: Client (unread)
  INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
  VALUES (
    expert_conv_id,
    owner_user_id,
    'Perfect! I''ll work on gathering everything. Can you send me a checklist I can follow?',
    FALSE,
    base_timestamp + INTERVAL '1 day' + INTERVAL '8 hours'
  );

  RAISE NOTICE 'Inserted 6 messages in expert-client conversation';

  -- ============================================
  -- CREATE ADDITIONAL CONVERSATIONS (if more clients exist)
  -- ============================================

  -- Try to create conversations with other clients if they exist
  DECLARE
    other_client RECORD;
    other_conv_id UUID;
    other_owner_id UUID;
  BEGIN
    FOR other_client IN 
      SELECT c.id, c.company_owner_id, c.company_name
      FROM clients c
      WHERE c.id != client_id_val
        AND c.company_owner_id IS NOT NULL
      LIMIT 3
    LOOP
      -- Get owner user ID
      other_owner_id := other_client.company_owner_id;

      -- Create admin conversation for this client
      SELECT id INTO other_conv_id
      FROM conversations
      WHERE client_id = other_client.id
        AND admin_id = admin_user_id
        AND expert_id IS NULL
      LIMIT 1;

      IF other_conv_id IS NULL THEN
        INSERT INTO conversations (client_id, admin_id, expert_id, last_message_at, created_at, updated_at)
        VALUES (
          other_client.id,
          admin_user_id,
          NULL,
          base_timestamp + INTERVAL '1 day',
          base_timestamp + INTERVAL '12 hours',
          base_timestamp + INTERVAL '12 hours'
        )
        RETURNING id INTO other_conv_id;

        -- Add a couple of messages
        INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
        VALUES (
          other_conv_id,
          admin_user_id,
          'Hello ' || other_client.company_name || '! How can I assist you today?',
          FALSE,
          base_timestamp + INTERVAL '12 hours'
        );

        INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
        VALUES (
          other_conv_id,
          other_owner_id,
          'Hi! I have a question about license renewal.',
          FALSE,
          base_timestamp + INTERVAL '1 day'
        );

        RAISE NOTICE 'Created conversation and messages for client: %', other_client.company_name;
      END IF;
    END LOOP;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sample conversations and messages created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Admin-Client conversation: % messages', 6;
  RAISE NOTICE '  - Expert-Client conversation: % messages', 6;
  RAISE NOTICE '  - Additional conversations created for other clients if they exist';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now test the messaging system by:';
  RAISE NOTICE '  1. Logging in as admin@demo.com and viewing /admin/messages';
  RAISE NOTICE '  2. Logging in as owner@demo.com and viewing /dashboard/messages';
  RAISE NOTICE '  3. Logging in as expert@demo.com and viewing /dashboard/expert/messages';
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating sample conversations and messages: %', SQLERRM;
END $$;
