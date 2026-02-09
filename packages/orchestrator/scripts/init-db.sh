#!/usr/bin/env bash
# Database initialization script for OpenKraken orchestrator
# Creates storage directories and initializes the SQLite database schema

set -euo pipefail

# Configuration
STORAGE_DATA_DIR="./storage/data"
DATABASE_PATH="${STORAGE_DATA_DIR}/openkraken.db"
SCHEMA_VERSION="001"

echo "=== OpenKraken Database Initialization ==="
echo "Database path: ${DATABASE_PATH}"

# Create storage directories if they don't exist
echo "Ensuring storage directories exist..."
mkdir -p "${STORAGE_DATA_DIR}"
mkdir -p "./storage/sandbox"

# Initialize database if it doesn't exist
if [ ! -f "${DATABASE_PATH}" ]; then
    echo "Creating new database: ${DATABASE_PATH}"
    
    # Use bun:sqlite or sqlite3 to create the database and schema
    # For now, we create a placeholder that will be properly initialized
    # when the actual migration scripts are created
    
    # Create schema_versions table first (required for migration tracking)
    sqlite3 "${DATABASE_PATH}" <<EOF
-- Schema version tracking table
CREATE TABLE IF NOT EXISTS schema_versions (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL,
    checksum TEXT NOT NULL,
    description TEXT
);

-- Insert initial schema version
INSERT INTO schema_versions (version, applied_at, checksum, description)
VALUES (
    '${SCHEMA_VERSION}',
    datetime('now'),
    'pending',
    'Initial schema'
);

-- Placeholder for checkpoint tables (LangGraph state persistence)
CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    state BLOB NOT NULL,
    metadata BLOB,
    created_at TEXT NOT NULL DEFAULT datetime('now'),
    PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS writes (
    thread_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    value BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT datetime('now'),
    PRIMARY KEY (thread_id, checkpoint_id, task_id, channel)
);

-- Thread tracking
CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    metadata BLOB,
    created_at TEXT NOT NULL DEFAULT datetime('now'),
    updated_at TEXT NOT NULL DEFAULT datetime('now')
);

-- Message log with encryption support
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content BLOB NOT NULL,
    encrypted INTEGER DEFAULT 0,
    metadata BLOB,
    created_at TEXT NOT NULL DEFAULT datetime('now')
);

-- Semantic memory storage
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding BLOB,
    metadata BLOB,
    importance REAL DEFAULT 0.5,
    created_at TEXT NOT NULL DEFAULT datetime('now'),
    updated_at TEXT NOT NULL DEFAULT datetime('now')
);

CREATE TABLE IF NOT EXISTS memories_embeddings (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    model TEXT NOT NULL,
    embedding BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT datetime('now'),
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
    timestamp TEXT NOT NULL DEFAULT datetime('now')
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
    timestamp TEXT NOT NULL DEFAULT datetime('now')
);

-- Skills metadata
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL,
    source TEXT NOT NULL,
    manifest BLOB NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT datetime('now'),
    updated_at TEXT NOT NULL DEFAULT datetime('now')
);

-- Security analysis reports
CREATE TABLE IF NOT EXISTS skill_analysis_reports (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    findings BLOB NOT NULL,
    risk_level TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    approved INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT datetime('now'),
    FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Skill lifecycle audit log
CREATE TABLE IF NOT EXISTS skill_audit_log (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT,
    details BLOB,
    timestamp TEXT NOT NULL DEFAULT datetime('now'),
    FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkpoints_thread ON checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS idx_writes_thread ON writes(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories(embedding);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_proxy_logs_timestamp ON proxy_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skill_audit_log_skill ON skill_audit_log(skill_id);

-- Enable WAL mode for better concurrency
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;
EOF
    
    echo "Database schema initialized successfully"
    
    # Update schema version with actual checksum
    SCHEMA_CHECKSUM=$(sha256sum "${DATABASE_PATH}" | cut -d' ' -f1)
    sqlite3 "${DATABASE_PATH}" "UPDATE schema_versions SET checksum = '${SCHEMA_CHECKSUM}' WHERE version = '${SCHEMA_VERSION}'"
    
    echo "Schema version ${SCHEMA_VERSION} recorded with checksum"
else
    echo "Database already exists at ${DATABASE_PATH}"
    
    # Verify schema version
    CURRENT_VERSION=$(sqlite3 "${DATABASE_PATH}" "SELECT version FROM schema_versions ORDER BY version DESC LIMIT 1;" 2>/dev/null || echo "unknown")
    echo "Current schema version: ${CURRENT_VERSION}"
fi

echo "=== Database initialization complete ==="