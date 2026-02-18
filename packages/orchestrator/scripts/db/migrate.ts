#!/usr/bin/env bun

/**
 * Database migration runner for OpenKraken orchestrator
 *
 * Applies forward-only migrations with checksum verification.
 * Uses atomic transactions and integrity checks for safety.
 */

import { Database } from "bun:sqlite";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";

interface Migration {
  version: string;
  filename: string;
  sql: string;
  checksum: string;
}

function calculateChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function loadMigrations(migrationsDir: string): Migration[] {
  if (!existsSync(migrationsDir)) {
    console.warn(`Migrations directory not found: ${migrationsDir}`);
    return [];
  }

  const migrations: Migration[] = [];
  const sqlFiles = new Bun.Glob("*.sql").scanSync(migrationsDir);
  
  for (const file of sqlFiles) {
    const fullPath = join(migrationsDir, file);
    const filename = basename(file);
    const version = filename.split("_")[0];
    const sql = readFileSync(fullPath, "utf-8");
    const checksum = calculateChecksum(sql);
    
    migrations.push({ version, filename, sql, checksum });
  }

  return migrations.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
}

function getAppliedVersions(db: Database): Set<string> {
  try {
    const rows = db.query("SELECT version FROM schema_versions").all() as { version: string }[];
    return new Set(rows.map((r) => r.version));
  } catch {
    return new Set();
  }
}

function applyMigration(db: Database, migration: Migration): void {
  console.log(`Applying migration ${migration.version}: ${migration.filename}`);
  
  const applyMigrationTx = db.transaction(() => {
    // Split SQL into statements - handle multi-line statements
    const lines = migration.sql.split('\n');
    const statements: string[] = [];
    let currentStatement = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments
      if (trimmed.startsWith('--')) continue;
      
      currentStatement += line;
      
      // Check if statement ends with semicolon
      if (trimmed.endsWith(';')) {
        const stmt = currentStatement.trim();
        if (stmt.length > 0) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // Execute each statement
    for (const stmt of statements) {
      if (stmt.length > 0) {
        db.run(stmt);
      }
    }
    
    const integrity = db.query("PRAGMA integrity_check").get() as { integrity_check: string };
    if (integrity.integrity_check !== "ok") {
      throw new Error(`Integrity check failed after migration ${migration.version}`);
    }
    
    db.run(
      "INSERT OR REPLACE INTO schema_versions (version, applied_at, checksum, description) VALUES (?, datetime('now'), ?, ?)",
      [migration.version, migration.checksum, `Applied via migration runner: ${migration.filename}`]
    );
  });
  
  applyMigrationTx();
  console.log(`✓ Migration ${migration.version} applied successfully`);
}

function configureDatabase(db: Database): void {
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA foreign_keys = ON");
}

async function runMigrations(): Promise<void> {
  console.log("=== OpenKraken Database Migration Runner ===\n");
  
  console.log("Ensuring storage directories exist...");
  const storageDir = "./storage/data";
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true });
    console.log("Directories created");
  } else {
    console.log("Directories already exist");
  }
  
  const databasePath = "./storage/data/openkraken.db";
  console.log(`Database: ${databasePath}\n`);
  
  const migrationsDir = join(import.meta.dir, "..", "..", "migrations");
  const migrations = loadMigrations(migrationsDir);
  
  if (migrations.length === 0) {
    console.log("No migration files found.");
    return;
  }
  
  console.log(`Found ${migrations.length} migration(s):`);
  for (const m of migrations) {
    console.log(`  - ${m.filename} (${m.checksum.slice(0, 8)})`);
  }
  console.log("");
  
  const db = new Database(databasePath);
  
  try {
    configureDatabase(db);
    
    const applied = getAppliedVersions(db);
    console.log(`Already applied: ${applied.size === 0 ? "none" : Array.from(applied).join(", ")}\n`);
    
    let appliedCount = 0;
    
    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        const row = db.query("SELECT checksum FROM schema_versions WHERE version = ?").get(migration.version) as { checksum: string } | undefined;
        if (row && row.checksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.version} checksum mismatch! ` +
            `Expected: ${migration.checksum}, Found: ${row.checksum}. ` +
            `The migration file may have been modified after application.`
          );
        }
        console.log(`Skipping ${migration.version}: already applied`);
        continue;
      }
      
      applyMigration(db, migration);
      appliedCount++;
    }
    
    if (appliedCount === 0) {
      console.log("\nAll migrations already applied.");
    } else {
      console.log(`\n✓ Applied ${appliedCount} migration(s)`);
    }
    
    const finalApplied = getAppliedVersions(db);
    console.log(`\nCurrent schema version: ${Array.from(finalApplied).pop() || "none"}`);
    
  } finally {
    db.close();
  }
  
  console.log("\n=== Migration complete ===");
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nMigration failed:", error.message);
    process.exit(1);
  });
