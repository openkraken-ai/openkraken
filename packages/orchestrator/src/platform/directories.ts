/**
 * Directory Creation Service
 * 
 * Creates platform-appropriate directories with correct permissions.
 * Handles recursive creation, permission validation, and error recovery.
 */

import { mkdir, chmod, stat, access, constants } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  getPathResolver,
  type PlatformPaths,
  type PathResolutionOptions,
} from './resolver';
import { LINUX_FHS_PATHS, MACOS_COCOA_PATHS, type OpenKrakenDirectoryStructure } from './paths/constants';
import {
  type DirectoryCreationResult,
  type PermissionValidationResult,
  type PermissionIssue,
  type DirectoryDefinition,
} from './paths/types';

/**
 * Options for directory creation
 */
export interface DirectoryCreationOptions {
  /** Whether to recursively create parent directories */
  recursive?: boolean;
  /** Whether to validate permissions after creation */
  validatePermissions?: boolean;
  /** Whether to fix incorrect permissions automatically */
  autoFixPermissions?: boolean;
  /** Custom paths to use instead of platform defaults */
  customPaths?: Partial<PlatformPaths>;
}

/**
 * Default directory creation options
 */
const DEFAULT_OPTIONS: DirectoryCreationOptions = {
  recursive: true,
  validatePermissions: true,
  autoFixPermissions: false,
};

/**
 * DirectoryManager
 * 
 * Service class for creating and validating OpenKraken directories
 * with appropriate permissions for the current platform.
 */
export class DirectoryManager {
  private resolver: ReturnType<typeof getPathResolver>;
  private options: DirectoryCreationOptions;

  constructor(options: DirectoryCreationOptions = {}) {
    this.resolver = getPathResolver();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Ensures all OpenKraken directories exist with correct permissions
   * 
   * @returns Result of directory creation operation
   */
  async ensureDirectories(
    pathOptions: PathResolutionOptions = {}
  ): Promise<DirectoryCreationResult> {
    const paths = this.resolver.resolvePaths(pathOptions);
    const structure = this.getDirectoryStructure();
    const result: DirectoryCreationResult = {
      success: true,
      directories: {},
      errors: [],
    };

    // Create each directory
    for (const [key, definition] of Object.entries(structure)) {
      const path = (paths as Record<string, string>)[key];
      
      try {
        const creationResult = await this.ensureDirectory(path, definition.mode);
        result.directories[key] = creationResult;
        
        if (!creationResult.success && !creationResult.existed) {
          result.success = false;
          result.errors.push(`Failed to create ${key} directory: ${creationResult.error}`);
        }
      } catch (error) {
        result.success = false;
        result.errors.push(`Error creating ${key} directory: ${error}`);
        result.directories[key] = {
          created: false,
          error: String(error),
          existed: false,
        };
      }
    }

    return result;
  }

  /**
   * Ensures a single directory exists with the correct permissions
   */
  async ensureDirectory(
    path: string,
    mode: number
  ): Promise<{ success: boolean; error?: string; existed: boolean }> {
    try {
      // Check if directory already exists
      const stats = await stat(path);
      
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: 'Path exists but is not a directory',
          existed: false,
        };
      }

      // Verify permissions
      if (this.options.validatePermissions) {
        const currentMode = stats.mode & 0o777;
        if (currentMode !== mode) {
          if (this.options.autoFixPermissions) {
            await chmod(path, mode);
          } else {
            return {
              success: false,
              error: `Incorrect permissions: expected ${mode.toString(8)}, got ${currentMode.toString(8)}`,
              existed: true,
            };
          }
        }
      }

      return { success: true, existed: true };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      
      if (err.code === 'ENOENT') {
        // Directory doesn't exist, create it
        try {
          await mkdir(path, { mode, recursive: this.options.recursive });
          return { success: true, existed: false };
        } catch (createError) {
          return {
            success: false,
            error: `Failed to create directory: ${createError}`,
            existed: false,
          };
        }
      }

      return {
        success: false,
        error: `Unexpected error: ${err.message}`,
        existed: false,
      };
    }
  }

  /**
   * Validates that all directories have correct permissions
   */
  async validatePermissions(
    paths: PlatformPaths
  ): Promise<PermissionValidationResult> {
    const structure = this.getDirectoryStructure();
    const issues: PermissionIssue[] = [];

    for (const [key, definition] of Object.entries(structure)) {
      const path = (paths as Record<string, string>)[key];
      
      try {
        const stats = await stat(path);
        const currentMode = stats.mode & 0o777;
        
        if (currentMode !== definition.mode) {
          issues.push({
            path,
            expectedMode: definition.mode,
            actualMode: currentMode,
            severity: this.getSeverity(currentMode, definition.mode),
          });
        }
      } catch (error) {
        issues.push({
          path,
          expectedMode: definition.mode,
          actualMode: 0,
          severity: 'error',
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Fixes directory permissions if they're incorrect
   */
  async fixPermissions(paths: PlatformPaths): Promise<PermissionValidationResult> {
    const structure = this.getDirectoryStructure();
    const issues: PermissionIssue[] = [];

    for (const [key, definition] of Object.entries(structure)) {
      const path = (paths as Record<string, string>)[key];
      
      try {
        const stats = await stat(path);
        const currentMode = stats.mode & 0o777;
        
        if (currentMode !== definition.mode) {
          await chmod(path, definition.mode);
          issues.push({
            path,
            expectedMode: definition.mode,
            actualMode: currentMode,
            severity: 'warning',
          });
        }
      } catch (error) {
        issues.push({
          path,
          expectedMode: definition.mode,
          actualMode: 0,
          severity: 'error',
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Gets the appropriate directory structure for the current platform
   */
  private getDirectoryStructure(): OpenKrakenDirectoryStructure {
    const env = this.resolver.getEnvironment();
    
    if (env.platform === 'darwin') {
      return MACOS_COCOA_PATHS;
    }
    
    return LINUX_FHS_PATHS;
  }

  /**
   * Determines the severity of a permission mismatch
   */
  private getSeverity(actual: number, expected: number): 'warning' | 'error' {
    // Permissions that are too open are more serious than too restrictive
    const actualReadable = (actual & 0o004) !== 0;
    const expectedReadable = (expected & 0o004) !== 0;
    
    if (actualReadable && !expectedReadable) {
      return 'error';
    }
    
    return 'warning';
  }

  /**
   * Checks if a directory is accessible with the expected permissions
   */
  async isAccessible(path: string, mode: number): Promise<boolean> {
    try {
      await access(path, mode);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the subdirectory structure for a base path
   */
  getSubdirectories(basePath: string): Record<string, string> {
    return {
      data: `${basePath}/data`,
      logs: `${basePath}/logs`,
      cache: `${basePath}/cache`,
    };
  }
}

/**
 * Creates directories using default options
 */
export async function ensureDirectories(
  pathOptions: PathResolutionOptions = {}
): Promise<DirectoryCreationResult> {
  const manager = new DirectoryManager();
  return manager.ensureDirectories(pathOptions);
}

/**
 * Validates directory permissions
 */
export async function validateDirectoryPermissions(
  paths: PlatformPaths
): Promise<PermissionValidationResult> {
  const manager = new DirectoryManager();
  return manager.validatePermissions(paths);
}

/**
 * Fixes directory permissions if incorrect
 */
export async function fixDirectoryPermissions(
  paths: PlatformPaths
): Promise<PermissionValidationResult> {
  const manager = new DirectoryManager({ autoFixPermissions: true });
  return manager.fixPermissions(paths);
}

/**
 * Creates a specific directory with permissions
 */
export async function createDirectory(
  path: string,
  mode: number,
  recursive = true
): Promise<{ success: boolean; error?: string; existed: boolean }> {
  const manager = new DirectoryManager({ recursive });
  return manager.ensureDirectory(path, mode);
}
