/**
 * Platform Abstraction Layer - Public API
 * 
 * Cross-platform storage path resolution for OpenKraken.
 * Supports Linux FHS, macOS Cocoa paths, and XDG Base Directory Specification.
 * 
 * @module platform
 */

// Types
export * from './paths/types';

// Constants
export * from './paths/constants';

// Path resolution
export {
  PlatformPathResolver,
  getPathResolver,
  getPlatformPaths,
  getConfigPath,
  getDataPath,
  getLogsPath,
  getCachePath,
  resolveDataSubpath,
  setResolverInstance,
  resetResolverInstance,
} from './resolver';

// Platform detection
export {
  detectEnvironment,
  detectPlatform,
  detectArchitecture,
  detectPlatformVersion,
  detectWSL,
  detectDocker,
  detectRootPrivileges,
  getEnvironmentSummary,
  isLinux,
  isMacOS,
  isWindows,
  isUnixLike,
  mapDarwinVersion,
} from './detection';

// Directory creation
export {
  DirectoryManager,
  ensureDirectories,
  validateDirectoryPermissions,
  fixDirectoryPermissions,
  createDirectory,
} from './directories';

// Tilde expansion
export {
  expandTilde,
  expandTildeSafe,
  expandTildeValidated,
  expandTildeBatch,
  expandPathAll,
  needsTildeExpansion,
} from './paths/expand';
