/**
 * Tilde Expansion Utilities
 * 
 * Provides cross-platform tilde (~) expansion for home directory paths.
 * Uses Node.js/Bun built-in path.expanduser() with additional fallbacks.
 */

import { homedir } from 'os';
import { join } from 'path';

/**
 * Options for tilde expansion
 */
export interface ExpandTildeOptions {
  /** Allow expansion of ~user paths (e.g., ~otheruser/path) */
  allowOtherUsers?: boolean;
}

/**
 * Result of tilde expansion operation
 */
export interface ExpandTildeResult {
  /** Expanded path or null if expansion failed */
  path: string | null;
  /** Whether expansion was performed */
  expanded: boolean;
  /** Original input path */
  original: string;
}

/**
 * Expands tilde (~) in a path to the user's home directory
 * 
 * @param path - Path that may contain tilde
 * @param options - Expansion options
 * @returns Expanded path with tilde replaced by home directory
 * 
 * @example
 * expandTilde('~/Documents') // Returns '/home/username/Documents'
 * expandTilde('~/Library/Logs') // Returns '/Users/username/Library/Logs' on macOS
 * expandTilde('/absolute/path') // Returns '/absolute/path' unchanged
 */
export function expandTilde(path: string, options: ExpandTildeOptions = {}): string {
  const { allowOtherUsers = false } = options;

  // Fast path: no tilde in path
  if (!path.includes('~')) {
    return path;
  }

  // Handle pure tilde
  if (path === '~') {
    return homedir();
  }

  // Handle tilde followed by slash (user's home directory)
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }

  // Handle ~user paths (less common, but supported)
  if (allowOtherUsers && path.startsWith('~') && path.includes('/')) {
    const slashIndex = path.indexOf('/');
    const username = path.slice(1, slashIndex);
    const userHome = getHomeDirectoryForUser(username);
    
    if (userHome) {
      return join(userHome, path.slice(slashIndex));
    }
  }

  // Return original path if we can't expand (best effort)
  return path;
}

/**
 * Attempts to expand tilde and returns a result object
 * 
 * @param path - Path that may contain tilde
 * @param options - Expansion options
 * @returns Result object with expanded path and metadata
 */
export function expandTildeSafe(
  path: string,
  options: ExpandTildeOptions = {}
): ExpandTildeResult {
  const expanded = expandTilde(path, options);
  return {
    path: expanded,
    expanded: expanded !== path,
    original: path,
  };
}

/**
 * Expands tilde with additional validation
 * 
 * @param path - Path that may contain tilde
 * @returns Validated and expanded path
 * @throws Error if path cannot be expanded or is invalid
 */
export function expandTildeValidated(path: string): string {
  const result = expandTildeSafe(path, { allowOtherUsers: true });
  
  if (result.path === null) {
    throw new Error(`Failed to expand tilde in path: ${path}`);
  }

  // Validate the result is an absolute path when expected
  if (path.startsWith('~/') && !result.path.startsWith('/')) {
    throw new Error(`Tilde expansion produced non-absolute path: ${result.path}`);
  }

  return result.path;
}

/**
 * Gets home directory for a specific user
 * Used for expanding ~user paths
 * 
 * @param username - Username to look up
 * @returns Home directory path or null if user not found
 */
function getHomeDirectoryForUser(username: string): string | null {
  // On POSIX systems, we can look up the home directory from /etc/passwd
  // This is a simplified implementation
  try {
    const passwdContent = Bun.readFile('/etc/passwd');
    const lines = passwdContent.toString().split('\n');
    
    for (const line of lines) {
      if (line.startsWith(`${username}:`)) {
        const parts = line.split(':');
        if (parts.length >= 6) {
          return parts[5];
        }
      }
    }
  } catch {
    // Fall through to return null
  }

  return null;
}

/**
 * Checks if a path starts with tilde (would need expansion)
 * 
 * @param path - Path to check
 * @returns True if path starts with tilde
 */
export function needsTildeExpansion(path: string): boolean {
  return path.startsWith('~');
}

/**
 * Batch expands tildes in multiple paths
 * 
 * @param paths - Array of paths that may contain tildes
 * @returns Array of expanded paths
 */
export function expandTildeBatch(paths: string[]): string[] {
  return paths.map(path => expandTilde(path));
}

/**
 * Expands environment variables and tilde in a path
 * Expands ${VAR} patterns, then expands tilde
 * 
 * @param path - Path with potential environment variables and/or tilde
 * @returns Fully expanded path
 */
export function expandPathAll(path: string): string {
  // Expand ${VAR} patterns in the path
  let expanded = path.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    return process.env[varName] ?? '';
  });
  
  // Then expand tilde
  expanded = expandTilde(expanded);
  
  return expanded;
}
