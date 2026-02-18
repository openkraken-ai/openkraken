#!/usr/bin/env bun

/**
 * Database initialization script for OpenKraken orchestrator
 *
 * Creates storage directories and runs database migrations
 * using platform-appropriate paths with WAL mode.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import {
  ensureDirectories,
  getPlatformPaths,
} from "../src/platform/directories";

interface Migration {
  version: string;
  filename: string;
  sql: string;
  checksum: string;
}

/**
 * Calculate SHA256 checksum of SQL content
 */
function calculateChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Load all migration files from the migrations directory
 */
function loadMigrations(migrationsDir: string): Migration[] {
  if (!existsSync(migrationsDir)) {
    console.warn(`Migrations directory not found: ${migrationsDir}`);
    return [];
  }

  const migrations: Migration[] = [];
  
  const sqlFiles = new Bun.Glob("*.sql").scanSync(migrationsDir);
  
  for (const file of sqlFiles) {
    const filename = basename(file);
    const version = filename.split("_")[0];
    const sql = readFileSync(file, "utf-8");
    const checksum = calculateChecksum(sql);
    
    migrations.push({
      version,
      filename,
      sql,
      checksum,
    });
  }

  // Sort by version number
  return migrations.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
}

/**
 * Get applied migrations from schema_versions table
 */
function getAppliedVersions(db: any): Set<string> {
  const rows = db.query("SELECT version FROM schema_versions").all() as { version: string }[];
  return new Set(rows.map((r: { version: string }) => r.version));
}

/**
 * Configure database with WAL mode and pragmas
 */
function configureDatabase(db: any): void {
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA foreign_keys = ON");
}

/**
 * Main initialization function
 */
async function initializeDatabase(): Promise<void> {
  console.log("=== OpenKraken Database Initialization ===\n");

  // Ensure storage directories exist
  console.log("Ensuring storage directories exist...");
  const dirResult = await ensureDirectories();
  if (dirResult.success) {
    console.log("Directories created successfully");
  } else {
    console.warn("Some directories could not be created:");
    for (const err of dirResult.errors) {
      console.warn(`  - ${err}`);
    }
  }

  // Get platform-appropriate paths
  const paths = getPlatformPaths();
  const databasePath = `${paths.data}/openkraken.db`;

  console.log(`\nPlatform: ${process.platform}`);
  console.log(`Data directory: ${paths.data}`);
  console.log(`Database path: ${databasePath}`);

  // Import Database dynamically to avoid issues
  const { Database } = await import("bun:sqlite");
  const db = new Database(databasePath);

  try {
    // Configure database with WAL mode
    configureDatabase(db);
    console.log("\nDatabase configured with WAL mode");

    // Load migrations
    const migrationsDir = join(import.meta.dir, "..", "migrations");
    const migrations = loadMigrations(migrationsDir);
    
    if (migrations.length === 0) {
      console.log("No migration files found.");
      return;
    }

    console.log(`\nFound ${migrations.length} migration(s):`);
    for (const m of migrations) {
      console.log(`  - ${m.filename} (${m.checksum.slice(0, 8)})`);
    }

    // Get already applied migrations
    const applied = getAppliedVersions(db);
    console.log(`\nAlready applied: ${applied.size === 0 ? "none" : Array.from(applied).join(", ")}`);

    // Apply pending migrations
    let appliedCount = 0;

    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        console.log(`Skipping ${migration.version}: already applied`);
        continue;
      }

      console.log(`\nApplying migration ${migration.version}: ${migration.filename}`);
      
      // Start transaction
      const applyMigrationTx = db.transaction(() => {
        // Execute migration SQL
        db.exec(migration.sql);
        
        // Verify schema integrity
        const integrity = db.query("PRAGMA integrity_check").get() as { integrity_check: string };
        if (integrity.integrity_check !== "ok") {
          throw new Error(`Integrity check failed after migration ${migration.version}`);
        }
        
        // Record successful migration
        db.run(
          "INSERT OR REPLACE INTO schema_versions (version, applied_at, checksum, description) VALUES (?, datetime('now'), ?, ?)",
          [migration.version, migration.checksum, `Applied via init-db: ${migration.filename}`]
        );
      });
      
      applyMigrationTx();
      
      console.log(`✓ Migration ${migration.version} applied successfully`);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log("\nAll migrations already applied.");
    } else {
      console.log(`\n✓ Applied ${appliedCount} migration(s)`);
    }

    // Show final status
    const finalApplied = getAppliedVersions(db);
    console.log(`\nCurrent schema version: ${Array.from(finalApplied).pop() || "none"}`);

  } finally {
    db.close();
  }

  console.log("\n=== Database initialization complete ===");
}

// Run initialization
initializeDatabase()
  .then(() => {
    console.log("\nDatabase initialization successful");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
