/**
 * Platform Path Constants
 *
 * Defines FHS-compliant Linux paths, macOS Cocoa paths, and XDG Base Directory defaults.
 * These constants are used for cross-platform storage path resolution.
 *
 * Sources:
 * - FHS 3.0: https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html
 * - XDG Base Directory Specification: https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
 * - Apple NSSearchPathDirectory: Developer documentation
 *
 * Security Note: Permissions are configured per INFRA-014: Directory Permissions & Security
 * - Data directories: 700 (owner only) for sensitive data
 * - Log directories: 750 (group readable)
 * - Cache directories: 755 (world readable)
 * - Config directories: 640 (owner rw, group r)
 * - Database files: 600 (owner rw only)
 * - Socket files: 660 (owner rw, group rw)
 */

import type { OpenKrakenDirectoryStructure } from "./types";

/**
 * Application name used in directory paths (lowercase)
 */
export const APP_NAME = "openkraken";

/**
 * macOS-specific application name with correct capitalization
 *
 * macOS Finder is case-insensitive by default, but follows
 * the convention of Title Case for Application Support directories.
 * See: https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/MacOSXDirectories/MacOSXDirectories.html
 */
export const APP_NAME_MACOS = "OpenKraken";

/**
 * Permission mode constants (octal notation)
 *
 * Per INFRA-014 acceptance criteria:
 * - 0o755 (rwxr-xr-x): Standard directory permissions - owner full access, others read/execute
 * - 0o750 (rwxr-x---): Restricted directory permissions - owner full access, group read/execute
 * - 0o700 (rwx------): Private directory permissions - only owner access
 * - 0o640 (rw-r-----): Config directory permissions - owner read/write, group read
 * - 0o600 (rw-------): Database file permissions - owner read/write only
 * - 0o660 (rw-rw----): Socket file permissions - owner read/write, group read/write
 */
export const PERMISSIONS = {
  /** Standard permissions for data and cache directories (755) */
  standard: 0o755 as const,
  /** Restricted permissions for logs directories (750) */
  restricted: 0o750 as const,
  /** Private permissions for sensitive data directories (700) */
  private: 0o700 as const,
  /** Config directory permissions - owner rw, group read (640) */
  config: 0o640 as const,
  /** Database file permissions - owner read/write only (600) */
  database: 0o600 as const,
  /** Socket file permissions - owner rw, group rw (660) */
  socket: 0o660 as const,
} as const;

/**
 * Linux FHS (Filesystem Hierarchy Standard) path definitions
 *
 * Per FHS 3.0:
 * - /var/lib: Variable state information (data)
 * - /etc: Host-specific system configuration
 * - /var/log: Log files and directories
 * - /var/cache: Application cache data
 *
 * Security: Per INFRA-014
 * - /var/lib/openkraken: 700 (owner only) - contains database
 * - /etc/openkraken: 640 (owner rw, group r) - contains credentials
 * - /var/log/openkraken: 750 (owner full, group read)
 * - /var/cache/openkraken: 755 (owner full, others read)
 */
export const LINUX_FHS_PATHS: OpenKrakenDirectoryStructure = {
  config: {
    path: `/etc/${APP_NAME}`,
    mode: PERMISSIONS.config,
    description: "Configuration directory (FHS /etc) - secured with 640",
  },
  data: {
    path: `/var/lib/${APP_NAME}`,
    mode: PERMISSIONS.private,
    description: "Data directory (FHS /var/lib) - secured with 700",
  },
  logs: {
    path: `/var/log/${APP_NAME}`,
    mode: PERMISSIONS.restricted,
    description: "Logs directory (FHS /var/log) - secured with 750",
  },
  cache: {
    path: `/var/cache/${APP_NAME}`,
    mode: PERMISSIONS.standard,
    description: "Cache directory (FHS /var/cache) - secured with 755",
  },
};

/**
 * macOS Cocoa path definitions
 *
 * Based on NSSearchPathDirectory:
 * - Application Support: ~/Library/Application Support/<name>
 * - Logs: ~/Library/Logs/<name>
 * - Caches: ~/Library/Caches/<name>
 *
 * Security: Per INFRA-014
 * - ~/Library/Application Support/Openkraken: 700 (owner only)
 * - ~/Library/Logs/OpenKraken: 755 (world readable)
 * - ~/Library/Caches/OpenKraken: 755 (world readable)
 */
export const MACOS_COCOA_PATHS: OpenKrakenDirectoryStructure = {
  config: {
    path: `~/Library/Application Support/${APP_NAME_MACOS}`,
    mode: PERMISSIONS.private,
    description:
      "Configuration directory (macOS Application Support) - secured with 700",
  },
  data: {
    path: `~/Library/Application Support/${APP_NAME_MACOS}`,
    mode: PERMISSIONS.private,
    description:
      "Data directory (macOS Application Support) - secured with 700",
  },
  logs: {
    path: `~/Library/Logs/${APP_NAME_MACOS}`,
    mode: PERMISSIONS.standard,
    description: "Logs directory (macOS Logs) - secured with 755",
  },
  cache: {
    path: `~/Library/Caches/${APP_NAME_MACOS}`,
    mode: PERMISSIONS.standard,
    description: "Caches directory (macOS Caches) - secured with 755",
  },
};

/**
 * XDG Base Directory Specification defaults
 *
 * Per XDG spec:
 * - XDG_CONFIG_HOME defaults to $HOME/.config
 * - XDG_DATA_HOME defaults to $HOME/.local/share
 * - XDG_CACHE_HOME defaults to $HOME/.cache
 */
export const XDG_DEFAULTS = {
  config: ".config",
  data: ".local/share",
  cache: ".cache",
} as const;

/**
 * XDG-compliant path definitions for Linux
 * Used when XDG environment variables are set or for user-level installations
 *
 * Note: These are path templates showing the structure.
 * Actual paths are resolved by the resolver using environment variables.
 */
export const LINUX_XDG_PATHS: OpenKrakenDirectoryStructure = {
  config: {
    path: "$XDG_CONFIG_HOME/openkraken",
    mode: PERMISSIONS.config,
    description: "Configuration directory - secured with 640",
  },
  data: {
    path: "$XDG_DATA_HOME/openkraken",
    mode: PERMISSIONS.private,
    description: "Data directory - secured with 700",
  },
  logs: {
    path: "$XDG_DATA_HOME/openkraken/logs",
    mode: PERMISSIONS.restricted,
    description: "Logs directory - secured with 750",
  },
  cache: {
    path: "$XDG_CACHE_HOME/openkraken",
    mode: PERMISSIONS.standard,
    description: "Cache directory - secured with 755",
  },
};

/**
 * Subdirectories created within base paths
 */
export const SUBDIRECTORIES = {
  data: "data",
  logs: "logs",
  cache: "cache",
  config: "", // Config files go directly in config directory
} as const;

/**
 * Configuration file name
 */
export const CONFIG_FILE_NAME = "config.yaml";

/**
 * Database file name
 */
export const DATABASE_FILE_NAME = "openkraken.db";

/**
 * Maps PathResolutionMode to directory structure constants
 */
export const MODE_TO_PATHS: Record<string, OpenKrakenDirectoryStructure> = {
  fhs: LINUX_FHS_PATHS,
  xdg: LINUX_XDG_PATHS,
  cocoa: MACOS_COCOA_PATHS,
};

/**
 * Gets the appropriate directory structure for a given mode
 */
export function getDirectoryStructureForMode(
  mode: string
): OpenKrakenDirectoryStructure {
  return MODE_TO_PATHS[mode] ?? LINUX_FHS_PATHS;
}

/**
 * Validates that a permission mode is valid (0-0777)
 */
export function isValidPermissionMode(mode: number): boolean {
  return (
    typeof mode === "number" &&
    mode >= 0 &&
    mode <= 0o777 &&
    Number.isInteger(mode)
  );
}

/**
 * Converts numeric permission mode to octal string representation
 */
export function permissionToString(mode: number): string {
  if (!isValidPermissionMode(mode)) {
    return "invalid";
  }
  return mode.toString(8).padStart(4, "0");
}

/**
 * Parses permission string (e.g., "755") to numeric mode
 */
export function parsePermissionString(perms: string): number {
  const parsed = Number.parseInt(perms, 8);
  if (!isValidPermissionMode(parsed)) {
    throw new Error(`Invalid permission string: ${perms}`);
  }
  return parsed;
}
