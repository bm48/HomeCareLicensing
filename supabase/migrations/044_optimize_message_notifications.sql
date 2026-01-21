-- Migration: Add optimized indexes for message notifications
-- File: supabase/migrations/044_optimize_message_notifications.sql
-- This migration adds composite indexes to optimize notification queries

-- Composite index for efficient unread message counting
-- This index helps with queries filtering by conversation_id, is_read, and sender_id
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read_sender 
ON messages(conversation_id, is_read, sender_id) 
WHERE is_read = false;

-- Composite index for application-based queries
-- Helps with filtering applications by owner or expert
CREATE INDEX IF NOT EXISTS idx_applications_owner_expert 
ON applications(company_owner_id, assigned_expert_id) 
WHERE company_owner_id IS NOT NULL OR assigned_expert_id IS NOT NULL;

-- Index for user_profiles role lookups (if not exists)
-- Helps with quick role-based filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_role 
ON user_profiles(role) 
WHERE role IN ('admin', 'company_owner', 'expert');

-- Additional index for messages with conversation_id and is_read
-- This is a partial index that only indexes unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread_conversation 
ON messages(conversation_id) 
WHERE is_read = false;

-- Index for applications with company_owner_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_applications_company_owner 
ON applications(company_owner_id) 
WHERE company_owner_id IS NOT NULL;

-- Index for applications with assigned_expert_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_applications_assigned_expert 
ON applications(assigned_expert_id) 
WHERE assigned_expert_id IS NOT NULL;
