/**
 * Orchestrator Platform Integration
 *
 * Example integration of platform storage path abstraction with orchestrator startup.
 * This demonstrates how to use the platform abstraction layer in the main orchestrator.
 */

import {
  detectEnvironment,
  ensureDirectories,
  getPlatformPaths,
  type PlatformPaths,
} from "./platform/index";

/**
 * Orchestrator configuration that uses platform paths
 */
export interface OrchestratorConfig {
  /** Platform-resolved paths */
  paths: PlatformPaths;
  /** Whether running in development mode */
  isDevelopment: boolean;
  /** Environment info for logging */
  environment: ReturnType<typeof detectEnvironment>;
}

/**
 * Initializes the orchestrator with platform-aware path resolution
 *
 * @returns OrchestratorConfig with resolved paths
 */
export async function initializeOrchestrator(): Promise<OrchestratorConfig> {
  console.log("Initializing OpenKraken Orchestrator...");

  // Detect environment
  const environment = detectEnvironment();
  console.log(
    `Detected platform: ${environment.platform} ${environment.platformVersion}`
  );
  console.log(`Architecture: ${environment.arch}`);
  console.log(`Running as root: ${environment.isRoot}`);
  console.log(`WSL: ${environment.isWSL}`);
  console.log(`Docker: ${environment.isDocker}`);

  // Get platform-appropriate paths
  const paths = getPlatformPaths();
  console.log("\nPlatform paths:");
  console.log(`  Config: ${paths.config}`);
  console.log(`  Data: ${paths.data}`);
  console.log(`  Logs: ${paths.logs}`);
  console.log(`  Cache: ${paths.cache}`);

  // Create directories with correct permissions
  console.log("\nEnsuring directories exist...");
  const directoryResult = await ensureDirectories();

  if (directoryResult.success) {
    console.log("All directories created successfully");
  } else {
    console.warn("Some directories could not be created:");
    directoryResult.errors.forEach((error) => {
      console.warn(`  - ${error}`);
    });
  }

  // Determine if running in development mode
  const isDevelopment = environment.platform !== "linux" || !environment.isRoot;

  return {
    paths,
    isDevelopment,
    environment,
  };
}

/**
 * Gets the database path based on platform paths
 */
export function getDatabasePath(config: OrchestratorConfig): string {
  return `${config.paths.data}/openkraken.db`;
}

/**
 * Gets the log file path based on platform paths
 */
export function getLogFilePath(
  config: OrchestratorConfig,
  filename = "orchestrator.log"
): string {
  return `${config.paths.logs}/${filename}`;
}

/**
 * Example usage
 */
if (import.meta.main) {
  initializeOrchestrator()
    .then((config) => {
      console.log("\n=== Orchestrator Configuration ===");
      console.log(`Database: ${getDatabasePath(config)}`);
      console.log(`Log file: ${getLogFilePath(config)}`);
      console.log(`Development mode: ${config.isDevelopment}`);
      console.log("\nOrchestrator initialized successfully!");
    })
    .catch((error) => {
      console.error("Failed to initialize orchestrator:", error);
      process.exit(1);
    });
}
