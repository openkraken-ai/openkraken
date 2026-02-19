/**
 * Authentication Module
 *
 * Token-based authentication for CLI.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TOKEN_FILE = ".openkraken-token";

/**
 * Session token information
 */
export interface SessionToken {
  token: string;
  expiresAt: number;
  userId?: string;
}

/**
 * Auth manager for CLI
 */
export class AuthManager {
  private tokenPath: string;
  private token: string | null = null;

  constructor(homeDir: string) {
    this.tokenPath = join(homeDir, TOKEN_FILE);
  }

  /**
   * Load token from file
   */
  loadToken(): string | null {
    if (this.token) {
      return this.token;
    }

    if (existsSync(this.tokenPath)) {
      try {
        const content = readFileSync(this.tokenPath, "utf-8");
        const session: SessionToken = JSON.parse(content);

        if (session.expiresAt > Date.now()) {
          this.token = session.token;
          return this.token;
        }
      } catch {
        // Invalid token file, ignore
      }
    }

    return null;
  }

  /**
   * Save token to file
   */
  saveToken(token: string, expiresInMs: number, userId?: string): void {
    const session: SessionToken = {
      token,
      expiresAt: Date.now() + expiresInMs,
      userId,
    };

    writeFileSync(this.tokenPath, JSON.stringify(session, null, 2), "utf-8");
    // Set restrictive permissions (owner read/write only)
    try {
      import("node:fs").then((fs) => {
        fs.chmodSync(this.tokenPath, 0o600);
      }).catch(() => {
        // Ignore chmod errors on platforms that don't support it
      });
    } catch {
      // Ignore chmod errors
    }
    this.token = token;
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    this.token = null;
    try {
      if (existsSync(this.tokenPath)) {
        // Note: In production, securely delete the file
        writeFileSync(this.tokenPath, "", "utf-8");
      }
    } catch {
      // Ignore errors during deletion
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.loadToken() !== null;
  }
}

/**
 * Create an auth manager
 */
export function createAuthManager(): AuthManager {
  const homeDir = process.env.OPENKRAKEN_HOME ?? process.env.HOME ?? ".";
  return new AuthManager(homeDir);
}
