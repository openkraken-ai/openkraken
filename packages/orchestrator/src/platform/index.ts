/**
 * Platform Abstraction Layer - Public API
 *
 * Cross-platform storage path resolution for OpenKraken.
 * Supports Linux FHS, macOS Cocoa paths, and XDG Base Directory Specification.
 *
 * @module platform
 */

// Platform detection
export {
  detectArchitecture,
  detectDocker,
  detectEnvironment,
  detectPlatform,
  detectPlatformVersion,
  detectRootPrivileges,
  detectWSL,
  getEnvironmentSummary,
  isLinux,
  isMacOS,
  isUnixLike,
  isWindows,
  mapDarwinVersion,
} from "./detection";
// Directory creation
export {
  createDirectory,
  DirectoryManager,
  ensureDirectories,
  fixDirectoryPermissions,
  validateDirectoryPermissions,
} from "./directories";
// Constants
export * from "./paths/constants";
// Tilde expansion
export {
  expandPathAll,
  expandTilde,
  expandTildeBatch,
  expandTildeSafe,
  expandTildeValidated,
  needsTildeExpansion,
} from "./paths/expand";
// Types
export * from "./paths/types";
// Path resolution
export {
  getCachePath,
  getConfigPath,
  getDataPath,
  getLogsPath,
  getPathResolver,
  getPlatformPaths,
  PlatformPathResolver,
  resetResolverInstance,
  resolveDataSubpath,
  setResolverInstance,
} from "./resolver";
