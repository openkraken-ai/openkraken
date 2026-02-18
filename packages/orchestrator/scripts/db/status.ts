#!/usr/bin/env bun

/**
 * Database migration status checker for OpenKraken orchestrator
 *
 * Shows current migration version and pending migrations.
 */

import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";

interface MigrationInfo {
  version: string;
  filename: string;
}

function loadMigrations(migrationsDir: string): MigrationInfo[] {
  if (!existsSync(migrationsDir)) {
    return [];
  }

  const migrations: MigrationInfo[] = [];
  const sqlFiles = new Bun.Glob("*.sql").scanSync(migrationsDir);
  
  for (const file of sqlFiles) {
    const filename = basename(file);
    const version = filename.split("_")[0];
    migrations.push({ version, filename });
  }

  return migrations.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
}

async function showStatus(): Promise<void> {
  console.log("=== OpenKraken Database Migration Status ===\n");
  
  const databasePath = "./storage/data/openkraken.db";
  console.log(`Database: ${databasePath}`);
  
  if (!existsSync(databasePath)) {
    console.log("\n⚠ Database does not exist yet.");
    console.log("Run 'bun run db:migrate' to initialize the database.\n");
    return;
  }
  
  const migrationsDir = join(import.meta.dir, "..", "..", "migrations");
  const availableMigrations = loadMigrations(migrationsDir);
  
  console.log(`\nAvailable migrations: ${availableMigrations.length}`);
  for (const m of availableMigrations) {
    console.log(`  - ${m.filename}`);
  }
  
  const db = new Database(databasePath);
  
  try {
    const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_versions'").all();
    
    if (tables.length === 0) {
      console.log("\n⚠ No schema_versions table found.");
      console.log("Run 'bun run db:migrate' to initialize.\n");
      return;
    }
    
    const applied = db.query("SELECT version, applied_at, checksum, description FROM schema_versions ORDER BY version").all() as Array<{
      version: string;
      applied_at: string;
      checksum: string;
      description: string;
    }>;
    
    console.log(`\nApplied migrations: ${applied.length}`);
    
    if (applied.length === 0) {
      console.log("  (none)");
    } else {
      for (const m of applied) {
        console.log(`  ✓ ${m.version} - ${m.description || "no description"}`);
        console.log(`    Applied: ${m.applied_at}`);
        console.log(`    Checksum: ${m.checksum.slice(0, 8)}...`);
      }
    }
    
    const currentVersion = applied.length > 0 ? applied[applied.length - 1].version : null;
    console.log(`\nCurrent schema version: ${currentVersion || "none"}`);
    
    const appliedVersions = new Set(applied.map((a) => a.version));
    const pending = availableMigrations.filter((m) => !appliedVersions.has(m.version));
    
    if (pending.length > 0) {
      console.log(`\n⚠ Pending migrations: ${pending.length}`);
      for (const m of pending) {
        console.log(`  - ${m.filename}`);
      }
      console.log("\nRun 'bun run db:migrate' to apply pending migrations.");
    } else if (applied.length > 0) {
      console.log("\n✓ Database is up to date.");
    }
    
  } finally {
    db.close();
  }
  
  console.log("");
}

showStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nError:", error.message);
    process.exit(1);
  });
