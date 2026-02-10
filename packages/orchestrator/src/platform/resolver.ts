/**
 * Path Resolution Engine
 *
 * Core platform path resolution logic that handles cross-platform path construction
 * with proper detection, environment variable support, and path normalization.
 */

import { homedir } from "os";
import { isAbsolute, join, resolve } from "path";
import { detectEnvironment } from "./detection";
import {
  APP_NAME,
  CONFIG_FILE_NAME,
  LINUX_FHS_PATHS,
  MACOS_COCOA_PATHS,
  type PathResolutionMode,
  type PathResolutionOptions,
  type PlatformPaths,
  SUBDIRECTORIES,
  XDG_DEFAULTS,
} from "./paths/constants";
import { expandTilde } from "./paths/expand";
import { PLATFORM_ENV_VARS } from "./paths/types";

/**
 * Validates a custom base path for security and correctness
 *
 * @param path - The path to validate
 * @param source - Description of the path source for error messages
 * @returns Validated path or throws error
 * @throws Error if path is invalid (empty, relative, contains traversal, etc.)
 */
function validateCustomBasePath(path: string, source: string): string {
  // Check for null bytes (path injection attack)
  if (path.includes("\0")) {
    throw new Error(`Invalid ${source}: contains null bytes`);
  }

  // Check for path traversal attempts
  if (path.includes("..")) {
    throw new Error(
      `Invalid ${source}: contains path traversal sequences (..)`
    );
  }

  // Check that path is not empty after trimming
  const trimmedPath = path.trim();
  if (trimmedPath.length === 0) {
    throw new Error(`Invalid ${source}: path is empty`);
  }

  // Check that path is absolute (required for security)
  // expandTilde handles ~, so we check after expansion
  const expandedPath = expandTilde(trimmedPath);
  if (!isAbsolute(expandedPath)) {
    throw new Error(
      `Invalid ${source}: must be an absolute path (got: ${expandedPath})`
    );
  }

  return expandedPath;
}

/**
 * PlatformPathResolver
 *
 * Main class for resolving platform-appropriate storage paths.
 * Handles Linux FHS, macOS Cocoa, and XDG Base Directory Specification.
 */
export class PlatformPathResolver {
  private environment: ReturnType<typeof detectEnvironment>;
  private resolvedPaths: PlatformPaths | null = null;

  constructor() {
    this.environment = detectEnvironment();
  }

  /**
   * Gets the complete platform paths configuration
   *
   * @param options - Resolution options
   * @returns Complete platform paths
   */
  resolvePaths(options: PathResolutionOptions = {}): PlatformPaths {
    if (this.resolvedPaths && !options.mode) {
      return this.resolvedPaths;
    }

    const mode = this.determineResolutionMode(options);
    const paths = this.buildPaths(mode, options);

    if (!options.mode) {
      this.resolvedPaths = paths;
    }

    return paths;
  }

  /**
   * Resolves only the configuration path
   */
  resolveConfigPath(options: PathResolutionOptions = {}): string {
    const paths = this.resolvePaths(options);
    return paths.config;
  }

  /**
   * Resolves only the data path
   */
  resolveDataPath(options: PathResolutionOptions = {}): string {
    const paths = this.resolvePaths(options);
    return paths.data;
  }

  /**
   * Resolves only the logs path
   */
  resolveLogsPath(options: PathResolutionOptions = {}): string {
    const paths = this.resolvePaths(options);
    return paths.logs;
  }

  /**
   * Resolves only the cache path
   */
  resolveCachePath(options: PathResolutionOptions = {}): string {
    const paths = this.resolvePaths(options);
    return paths.cache;
  }

  /**
   * Determines the appropriate resolution mode based on platform and options
   */
  private determineResolutionMode(
    options: PathResolutionOptions
  ): PathResolutionMode {
    // Priority 1: Explicit mode override
    if (options.mode) {
      return options.mode;
    }

    // Priority 2: OPENKRAKEN_HOME override
    const customHome = process.env[PLATFORM_ENV_VARS.OPENKRAKEN_HOME];
    if (customHome) {
      return "custom";
    }

    // Priority 3: Platform-specific defaults
    const { platform, isRoot, isWSL, isNixOS } = this.environment;

    switch (platform) {
      case "linux":
        // Linux path resolution strategy:
        //
        // Priority: OPENKRAKEN_HOME > explicit mode > platform default
        //
        // Platform default logic:
        // - NixOS: Always use XDG (/etc is immutable on NixOS)
        // - Root on standard Linux: Use FHS (/var/lib, /etc) for system-wide storage
        // - Non-root users: Use XDG (~/.local, ~/.config) for user-local storage
        //
        // Rationale for XDG fallback:
        // - Docker/containers: Often have read-only rootfs, /etc may not be writable
        // - Flatpak/sandboxed apps: Cannot access /etc at all, must use $HOME
        // - Non-root users: Cannot write to /var/lib without root/sudo
        // - Embedded Linux: Alpine/BusyBox systems may not have full FHS structure
        //
        // XDG Base Directory Specification is the practical default for portable
        // applications that must work across diverse Linux environments.
        //
        // See: https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
        if (isNixOS) {
          return "xdg";
        }
        // Root on standard Linux gets FHS paths for system-wide storage
        if (isRoot && !isWSL) {
          return "fhs";
        }
        // Non-root, WSL, containers, and sandboxed environments use XDG
        // This ensures portability across:
        // - Docker containers with read-only rootfs
        // - Flatpak/sandboxed applications
        // - Embedded Linux (Alpine, BusyBox)
        // - Non-root user installations
        return "xdg";

      case "darwin":
        // macOS: Always use Cocoa paths
        return "cocoa";

      case "windows":
        // Windows: Not fully supported, fall back to user local
        return "custom";

      default:
        // Unknown platform: try user-local paths
        return "custom";
    }
  }

  /**
   * Builds paths for the given resolution mode
   */
  private buildPaths(
    mode: PathResolutionMode,
    options: PathResolutionOptions
  ): PlatformPaths {
    switch (mode) {
      case "fhs":
        // In FHS mode, use strict FHS paths unless user explicitly set XDG env vars
        // Only treat as XDG override if explicitly undefined (not just default values)
        if (this.hasExplicitXDGOverrides()) {
          return this.buildFHSWithXDGOverrides();
        }
        return this.buildFHSPaths();

      case "xdg":
        return this.buildXDGPaths();

      case "cocoa":
        return this.buildCocoaPaths();

      case "custom": {
        const customHome = process.env[PLATFORM_ENV_VARS.OPENKRAKEN_HOME];
        if (customHome) {
          return this.buildCustomPaths(
            customHome,
            "OPENKRAKEN_HOME environment variable"
          );
        }
        if (options.customBasePath) {
          return this.buildCustomPaths(
            options.customBasePath,
            "customBasePath option"
          );
        }
        return this.buildCustomPaths(homedir(), "default home directory");
      }

      default:
        return this.buildCustomPaths(homedir(), "default home directory");
    }
  }

  /**
   * Checks if XDG environment variables are explicitly set (not undefined)
   * Only returns true if user actually exported these variables
   */
  private hasExplicitXDGOverrides(): boolean {
    // Only treat as override if the variable is explicitly set (not undefined)
    // This prevents system-wide XDG defaults from triggering override mode
    return (
      process.env[PLATFORM_ENV_VARS.XDG_CONFIG_HOME] !== undefined ||
      process.env[PLATFORM_ENV_VARS.XDG_DATA_HOME] !== undefined ||
      process.env[PLATFORM_ENV_VARS.XDG_CACHE_HOME] !== undefined
    );
  }

  /**
   * Builds FHS-compliant Linux paths with independent XDG overrides
   *
   * Per XDG Base Directory Specification, each environment variable is independent.
   * A user can set $XDG_CONFIG_HOME without setting $XDG_DATA_HOME, etc.
   * This allows partial overrides while respecting XDG semantics.
   */
  private buildFHSWithXDGOverrides(): PlatformPaths {
    // For each path type, check if the corresponding XDG variable is set
    // If set, use XDG; otherwise, fall back to FHS standard location

    const xdgConfig = process.env[PLATFORM_ENV_VARS.XDG_CONFIG_HOME];
    const xdgData = process.env[PLATFORM_ENV_VARS.XDG_DATA_HOME];
    const xdgCache = process.env[PLATFORM_ENV_VARS.XDG_CACHE_HOME];

    // Config: Use XDG_CONFIG_HOME if set, else FHS /etc
    const configBase = xdgConfig
      ? expandTilde(xdgConfig)
      : LINUX_FHS_PATHS.config.path;

    // Data: Use XDG_DATA_HOME if set, else FHS /var/lib
    const dataBase = xdgData ? expandTilde(xdgData) : LINUX_FHS_PATHS.data.path;

    // Logs: Use XDG_DATA_HOME/logs if set, else FHS /var/log
    const logsBase = xdgData
      ? expandTilde(join(xdgData, APP_NAME, SUBDIRECTORIES.logs))
      : LINUX_FHS_PATHS.logs.path;

    // Cache: Use XDG_CACHE_HOME if set, else FHS /var/cache
    const cacheBase = xdgCache
      ? expandTilde(xdgCache)
      : LINUX_FHS_PATHS.cache.path;

    return {
      config: join(configBase, APP_NAME, CONFIG_FILE_NAME),
      data: dataBase,
      logs: logsBase,
      cache: cacheBase,
    };
  }

  /**
   * Builds FHS-compliant Linux paths
   */
  private buildFHSPaths(): PlatformPaths {
    const structure = LINUX_FHS_PATHS;

    return {
      config: join(structure.config.path, CONFIG_FILE_NAME),
      data: structure.data.path,
      logs: structure.logs.path,
      cache: structure.cache.path,
    };
  }

  /**
   * Builds XDG Base Directory Specification paths
   */
  private buildXDGPaths(): PlatformPaths {
    const configHome = this.getXDGConfigHome();
    const dataHome = this.getXDGDataHome();
    const cacheHome = this.getXDGCacheHome();

    return {
      config: join(configHome, APP_NAME, CONFIG_FILE_NAME),
      data: join(dataHome, APP_NAME, SUBDIRECTORIES.data),
      logs: join(dataHome, APP_NAME, SUBDIRECTORIES.logs),
      cache: join(cacheHome, APP_NAME, SUBDIRECTORIES.cache),
    };
  }

  /**
   * Builds macOS Cocoa paths
   */
  private buildCocoaPaths(): PlatformPaths {
    const supportDir = expandTilde(MACOS_COCOA_PATHS.data.path);
    const logsDir = expandTilde(MACOS_COCOA_PATHS.logs.path);
    const cachesDir = expandTilde(MACOS_COCOA_PATHS.cache.path);

    return {
      config: join(supportDir, CONFIG_FILE_NAME),
      data: supportDir,
      logs: logsDir,
      cache: cachesDir,
    };
  }

  /**
   * Builds custom paths from base directory
   *
   * @param customBasePath - The custom base path (validated)
   * @param pathSource - Description of the path source for error messages
   * @returns PlatformPaths with custom base
   * @throws Error if customBasePath is invalid
   */
  private buildCustomPaths(
    customBasePath: string,
    pathSource = "customBasePath"
  ): PlatformPaths {
    // Validate the custom base path for security
    const validatedBasePath = validateCustomBasePath(
      customBasePath,
      pathSource
    );
    const normalizedBase = resolve(validatedBasePath);

    return {
      config: join(normalizedBase, CONFIG_FILE_NAME),
      data: join(normalizedBase, SUBDIRECTORIES.data),
      logs: join(normalizedBase, SUBDIRECTORIES.logs),
      cache: join(normalizedBase, SUBDIRECTORIES.cache),
    };
  }

  /**
   * Gets XDG_CONFIG_HOME or default
   */
  private getXDGConfigHome(): string {
    const xdgConfig = process.env[PLATFORM_ENV_VARS.XDG_CONFIG_HOME];
    if (xdgConfig) {
      return expandTilde(xdgConfig);
    }
    return join(homedir(), XDG_DEFAULTS.config);
  }

  /**
   * Gets XDG_DATA_HOME or default
   */
  private getXDGDataHome(): string {
    const xdgData = process.env[PLATFORM_ENV_VARS.XDG_DATA_HOME];
    if (xdgData) {
      return expandTilde(xdgData);
    }
    return join(homedir(), XDG_DEFAULTS.data);
  }

  /**
   * Gets XDG_CACHE_HOME or default
   */
  private getXDGCacheHome(): string {
    const xdgCache = process.env[PLATFORM_ENV_VARS.XDG_CACHE_HOME];
    if (xdgCache) {
      return expandTilde(xdgCache);
    }
    return join(homedir(), XDG_DEFAULTS.cache);
  }

  /**
   * Gets the current environment info
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Clears cached paths (useful for testing)
   */
  clearCache(): void {
    this.resolvedPaths = null;
  }
}

/**
 * Singleton instance of PlatformPathResolver
 */
let resolverInstance: PlatformPathResolver | null = null;

export function getPathResolver(): PlatformPathResolver {
  if (!resolverInstance) {
    resolverInstance = new PlatformPathResolver();
  }
  return resolverInstance;
}

/**
 * Convenience function to get platform paths
 */
export function getPlatformPaths(
  options: PathResolutionOptions = {}
): PlatformPaths {
  return getPathResolver().resolvePaths(options);
}

/**
 * Convenience function to get configuration path
 */
export function getConfigPath(options: PathResolutionOptions = {}): string {
  return getPathResolver().resolveConfigPath(options);
}

/**
 * Convenience function to get data path
 */
export function getDataPath(options: PathResolutionOptions = {}): string {
  return getPathResolver().resolveDataPath(options);
}

/**
 * Convenience function to get logs path
 */
export function getLogsPath(options: PathResolutionOptions = {}): string {
  return getPathResolver().resolveLogsPath(options);
}

/**
 * Convenience function to get cache path
 */
export function getCachePath(options: PathResolutionOptions = {}): string {
  return getPathResolver().resolveCachePath(options);
}

/**
 * Resolves a relative path within the OpenKraken data directory
 */
export function resolveDataSubpath(
  subpath: string,
  options: PathResolutionOptions = {}
): string {
  const dataPath = getPathResolver().resolveDataPath(options);
  return join(dataPath, subpath);
}

/**
 * Testing helper: Sets a custom resolver instance
 * WARNING: For testing only. Do not use in production.
 */
export function setResolverInstance(
  instance: PlatformPathResolver | null
): void {
  resolverInstance = instance;
}

/**
 * Testing helper: Resets the singleton instance
 * Use in beforeEach/tearDown to ensure test isolation
 */
export function resetResolverInstance(): void {
  resolverInstance = null;
}
