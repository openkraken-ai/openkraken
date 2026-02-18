-- Migration: 002_add_encrypted_fields.sql
-- Purpose: Add encrypted content columns and ensure encryption support
-- Note: messages table already has encrypted column from 001_initial_schema.sql
-- This migration is idempotent - safe to run multiple times

-- Ensure index on encrypted for efficient queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages(encrypted);
