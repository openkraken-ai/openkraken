-- Migration: 003_add_skills_tables.sql
-- Purpose: Add skills pipeline tables for skill management and audit

-- Skills metadata
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL,
    source TEXT NOT NULL,
    manifest BLOB NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Skill lifecycle audit log
CREATE TABLE IF NOT EXISTS skill_audit_log (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT,
    details BLOB,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skill_audit_log_skill ON skill_audit_log(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_analysis_reports_skill ON skill_analysis_reports(skill_id);
