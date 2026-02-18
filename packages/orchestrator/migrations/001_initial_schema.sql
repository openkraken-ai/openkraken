-- Migration: 001_initial_schema.sql
-- Purpose: Create all base tables for OpenKraken orchestrator
-- Note: checkpoints and writes tables are managed by bun-sqlite-checkpointer

-- Schema version tracking table
CREATE TABLE IF NOT EXISTS schema_versions (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL,
    checksum TEXT NOT NULL,
    description TEXT
);

-- Insert initial schema version (will be updated by migration runner)
INSERT INTO schema_versions (version, applied_at, checksum, description)
VALUES ('001', CURRENT_TIMESTAMP, 'pending', 'Initial schema - base tables');

-- Thread tracking
CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    metadata BLOB,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Message log with encryption support
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content BLOB NOT NULL,
    encrypted INTEGER DEFAULT 0,
    metadata BLOB,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Semantic memory storage
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding BLOB,
    metadata BLOB,
    importance REAL DEFAULT 0.5,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memories_embeddings (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    model TEXT NOT NULL,
    embedding BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memories(id)
);

-- Audit logging
CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor TEXT,
    target TEXT,
    action TEXT,
    result TEXT,
    metadata BLOB,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proxy/network access logs
CREATE TABLE IF NOT EXISTS proxy_logs (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    method TEXT NOT NULL,
    request_headers BLOB,
    request_body BLOB,
    response_status INTEGER,
    response_headers BLOB,
    response_body BLOB,
    duration_ms INTEGER,
    error TEXT,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories(embedding);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_proxy_logs_timestamp ON proxy_logs(timestamp);
