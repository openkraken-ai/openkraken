/**
 * Platform Storage Path Types
 *
 * Defines TypeScript interfaces and types for cross-platform storage path resolution.
 * Supports Linux FHS-compliant paths, macOS Cocoa paths, and XDG Base Directory Specification.
 */

/**
 * Supported operating system platforms
 */
export type OperatingSystem = "linux" | "darwin" | "windows" | "unknown";

/**
 * Path resolution mode for different installation contexts
 */
export type PathResolutionMode =
  | "fhs" // Filesystem Hierarchy Standard (Linux system-wide)
  | "xdg" // XDG Base Directory Specification (Linux user-specific)
  | "cocoa" // macOS Cocoa paths
  | "custom"; // Custom path via OPENKRAKEN_HOME

/**
 * Structure defining a single directory path with its requirements
 */
export interface DirectoryDefinition {
  /** Relative path from base or absolute path */
  path: string;
  /** Permission mode in octal notation (e.g., 0o755) */
  mode: number;
  /** Human-readable description of the directory purpose */
  description: string;
}

/**
 * Complete directory structure for OpenKraken
 */
export interface OpenKrakenDirectoryStructure {
  /** Configuration directory (e.g., /etc/openkraken/) */
  config: DirectoryDefinition;
  /** Data directory (e.g., /var/lib/openkraken/) */
  data: DirectoryDefinition;
  /** Logs directory (e.g., /var/log/openkraken/) */
  logs: DirectoryDefinition;
  /** Cache directory (e.g., /var/cache/openkraken/) */
  cache: DirectoryDefinition;
}

/**
 * Resolved platform paths for OpenKraken
 */
export interface PlatformPaths {
  /** Configuration file path (e.g., /etc/openkraken/config.yaml) */
  config: string;
  /** Base data directory (e.g., /var/lib/openkraken) */
  data: string;
  /** Logs directory (e.g., /var/log/openkraken) */
  logs: string;
  /** Cache directory (e.g., /var/cache/openkraken) */
  cache: string;
}

/**
 * Environment information detected at runtime
 */
export interface EnvironmentInfo {
  /** Detected operating system */
  platform: OperatingSystem;
  /** Operating system release version */
  platformVersion: string;
  /** CPU architecture */
  arch: string;
  /** Whether running in Windows Subsystem for Linux */
  isWSL: boolean;
  /** Whether running in a Docker container */
  isDocker: boolean;
  /** Whether running with root privileges (UID 0) */
  isRoot: boolean;
  /** Whether running on NixOS (immutable filesystem) */
  isNixOS: boolean;
  /** Whether D-Bus is available for secret-service */
  isDBusAvailable: boolean;
  /** Whether running in a headless environment (no desktop) */
  isHeadless: boolean;
}

/**
 * Options for path resolution
 */
export interface PathResolutionOptions {
  /** Explicit mode override ('fhs', 'xdg', 'cocoa', 'custom') */
  mode?: PathResolutionMode;
  /** Custom base path when mode is 'custom' */
  customBasePath?: string;
  /** Whether to validate that paths exist */
  validateExistence?: boolean;
}

/**
 * Result of directory creation operation
 */
export interface DirectoryCreationResult {
  /** Whether all directories were created successfully */
  success: boolean;
  /** Map of directory path to creation status */
  directories: Record<
    string,
    {
      /** Whether creation was successful */
      created: boolean;
      /** Error message if creation failed */
      error?: string;
      /** Whether directory already existed */
      existed: boolean;
    }
  >;
  /** List of any errors encountered */
  errors: string[];
}

/**
 * Result of permission validation
 */
export interface PermissionValidationResult {
  /** Whether all permissions are correct */
  valid: boolean;
  /** List of any permission issues */
  issues: PermissionIssue[];
}

/**
 * Individual permission issue detail
 */
export interface PermissionIssue {
  /** Path with incorrect permissions */
  path: string;
  /** Expected permission mode */
  expectedMode: number;
  /** Actual permission mode */
  actualMode: number;
  /** Severity of the issue */
  severity: "warning" | "error";
}

/**
 * Environment variable names used by the platform abstraction
 */
export const PLATFORM_ENV_VARS = {
  /** Override for base path */
  OPENKRAKEN_HOME: "OPENKRAKEN_HOME",
  /** XDG configuration home */
  XDG_CONFIG_HOME: "XDG_CONFIG_HOME",
  /** XDG data home */
  XDG_DATA_HOME: "XDG_DATA_HOME",
  /** XDG cache home */
  XDG_CACHE_HOME: "XDG_CACHE_HOME",
} as const;

/**
 * Type guard to check if a string is a valid OperatingSystem
 */
export function isOperatingSystem(value: string): value is OperatingSystem {
  return ["linux", "darwin", "windows", "unknown"].includes(value);
}

/**
 * Type guard to check if a string is a valid PathResolutionMode
 */
export function isPathResolutionMode(
  value: string
): value is PathResolutionMode {
  return ["fhs", "xdg", "cocoa", "custom"].includes(value);
}
