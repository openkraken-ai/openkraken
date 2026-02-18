/**
 * Bun.secrets Credential Provider (INFRA-015)
 *
 * Provides credential storage using Bun's native secrets API.
 * This uses platform-specific secure storage:
 * - macOS: Keychain Services
 * - Linux: libsecret (GNOME Keyring, KWallet)
 * - Windows: Credential Manager
 *
 * On headless Linux servers without a secret service daemon,
 * this provider will be unavailable and the age-encrypted fallback
 * should be used instead.
 */

import { secrets } from "bun";
import type { CredentialProvider, VaultBackend } from "../types";
/**
 * Bun.secrets credential provider implementation
 */
export class BunSecretsProvider implements CredentialProvider {
  readonly name: VaultBackend = "bun-secrets";

  /**
   * Service name used to namespace credentials in the vault
   */
  private readonly serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Check if Bun.secrets is available on this system
   *
   * This tests actual vault availability by attempting to read a test key.
   * On headless Linux servers without secret-service, this will return false.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // secrets API may throw if the underlying vault is unavailable
      // Test by attempting a read operation
      const testKey = "__openkraken_vault_test__";
      await secrets.get({ service: this.serviceName, name: testKey });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve a credential from the vault
   */
  async get(key: string): Promise<string | null> {
    try {
      const value = await secrets.get({
        service: this.serviceName,
        name: key,
      });
      return value;
    } catch {
      // Return null if the credential doesn't exist or vault is unavailable
      return null;
    }
  }

  /**
   * Store a credential in the vault
   */
  async set(key: string, value: string): Promise<void> {
    await secrets.set({
      service: this.serviceName,
      name: key,
      value,
    });
  }

  /**
   * Delete a credential from the vault
   *
   * @returns true if the credential was deleted, false if it didn't exist
   */
  async delete(key: string): Promise<boolean> {
    try {
      // Check if credential exists first
      const existing = await this.get(key);
      if (existing === null) {
        return false;
      }

      await secrets.delete({
        service: this.serviceName,
        name: key,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all credential keys for this service
   *
   * Note: secrets doesn't provide a list operation, so this returns
   * an empty array. The vault abstraction layer should track keys separately
   * if listing is needed.
   */
  list(): string[] {
    // secrets API doesn't support listing
    // Return empty array - vault layer should track keys if needed
    return [];
  }
}

/**
 * Factory function to create a Bun.secrets provider
 */
export function createBunSecretsProvider(
  serviceName: string
): CredentialProvider {
  return new BunSecretsProvider(serviceName);
}
