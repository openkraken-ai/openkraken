/**
 * Credential Vault (INFRA-015)
 *
 * Unified credential vault abstraction with automatic fallback chain.
 *
 * Fallback Flow (per docs/Architecture.md §5.1):
 * Primary: secrets API (secret-service/D-Bus on Linux, Keychain on macOS)
 *     ↓ (unavailable - headless server without secret-service)
 * Fallback: age-encrypted file ($OPENKRAKEN_HOME/credentials.enc)
 *     ↓ (missing)
 * Error: Credential provisioning required
 *
 * Security:
 * - Credentials are never logged or written to filesystem in plaintext
 * - Age-encrypted fallback file must have permissions 0600
 * - Master key for age encryption stored in OS vault
 */

import {
  createAgeEncryptedProvider,
  getDefaultCredentialsPath,
} from "./providers/age-encrypted";
import { createBunSecretsProvider } from "./providers/bun-secrets";
import type {
  CredentialProvider,
  CredentialVaultConfig,
  VaultBackend,
} from "./types";
import { CredentialError } from "./types";

/**
 * Default service name for OpenKraken credentials
 */
const DEFAULT_SERVICE_NAME = "openkraken";

/**
 * Credential Vault - unified abstraction for credential storage
 *
 * Implements the fallback chain for credential retrieval:
 * 1. Try secrets API (platform-native vault)
 * 2. Fall back to age-encrypted file if unavailable
 * 3. Throw error if neither is available
 */
export class CredentialVault {
  private readonly config: CredentialVaultConfig;
  private readonly bunSecretsProvider: CredentialProvider;
  private readonly ageEncryptedProvider: CredentialProvider;
  private activeProvider: CredentialProvider | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config?: Partial<CredentialVaultConfig>) {
    this.config = {
      serviceName: config?.serviceName ?? DEFAULT_SERVICE_NAME,
      encryptedFilePath:
        config?.encryptedFilePath ?? getDefaultCredentialsPath(),
      developmentMode: config?.developmentMode ?? false,
    };

    this.bunSecretsProvider = createBunSecretsProvider(this.config.serviceName);
    this.ageEncryptedProvider = createAgeEncryptedProvider(
      this.config.serviceName,
      this.config.encryptedFilePath
    );
  }

  /**
   * Initialize the vault and determine the active provider
   *
   * This must be called before any credential operations.
   * Uses a promise-based lock to handle concurrent initialization safely.
   */
  async initialize(): Promise<void> {
    // Return immediately if already initialized
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it to complete
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    // Start initialization and store the promise
    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  /**
   * Internal initialization logic
   */
  private async doInitialize(): Promise<void> {
    // Try primary provider first
    const bunSecretsAvailable = await this.bunSecretsProvider.isAvailable();

    if (bunSecretsAvailable) {
      this.activeProvider = this.bunSecretsProvider;
      console.info("[CredentialVault] Using primary provider: bun-secrets");
    } else {
      // Fall back to age-encrypted provider
      const ageEncryptedAvailable =
        await this.ageEncryptedProvider.isAvailable();

      if (ageEncryptedAvailable) {
        this.activeProvider = this.ageEncryptedProvider;
        console.warn(
          "[CredentialVault] secret-service unavailable, using encrypted file fallback"
        );
      } else {
        // Neither provider available - credential provisioning required
        throw new CredentialError(
          "provider_unavailable",
          "No credential vault available. " +
            "Ensure secret-service is running or provision credentials.enc file. " +
            "On headless Linux, run: openkraken credentials init"
        );
      }
    }

    this.initialized = true;
  }

  /**
   * Ensure vault is initialized before operations
   * Returns the active provider for use in operations
   */
  private async ensureInitialized(): Promise<CredentialProvider> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.activeProvider) {
      throw new CredentialError(
        "provider_unavailable",
        "Credential vault not initialized"
      );
    }

    return this.activeProvider;
  }

  /**
   * Get the currently active provider backend
   */
  getActiveBackend(): VaultBackend | null {
    return this.activeProvider?.name ?? null;
  }

  /**
   * Check if we're using the fallback provider
   */
  isUsingFallback(): boolean {
    return this.activeProvider?.name === "age-encrypted";
  }

  /**
   * Retrieve a credential
   *
   * @param key - The credential key (e.g., "anthropic-api-key")
   * @returns The credential value or null if not found
   */
  async get(key: string): Promise<{
    value: string | null;
    backend: VaultBackend;
    fallback: boolean;
  }> {
    const provider = await this.ensureInitialized();

    const value = await provider.get(key);
    const fallback = this.isUsingFallback();

    if (value === null) {
      return { value: null, backend: provider.name, fallback };
    }

    return { value, backend: provider.name, fallback };
  }

  /**
   * Store a credential
   *
   * @param key - The credential key
   * @param value - The credential value
   */
  async set(key: string, value: string): Promise<void> {
    const provider = await this.ensureInitialized();
    await provider.set(key, value);
  }

  /**
   * Delete a credential
   *
   * @param key - The credential key
   * @returns true if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    const provider = await this.ensureInitialized();
    return provider.delete(key);
  }

  /**
   * List all credential keys
   *
   * Note: For bun-secrets provider, this returns an empty array as
   * secrets API doesn't support listing.
   */
  async list(): Promise<string[]> {
    const provider = await this.ensureInitialized();

    if (provider.list) {
      const result = provider.list();
      return result instanceof Promise ? await result : result;
    }

    return [];
  }

  /**
   * Initialize the age-encrypted fallback for headless servers
   *
   * This generates a new age identity and stores it, then creates
   * an empty credentials.enc file.
   *
   * Should only be called on headless servers where secret-service
   * is unavailable.
   */
  async initializeFallback(): Promise<{ recipient: string }> {
    const provider = this.ageEncryptedProvider;

    if (!provider.initializeIdentity) {
      throw new CredentialError(
        "provider_unavailable",
        "Age-encrypted provider does not support initialization"
      );
    }

    const { recipient } = await provider.initializeIdentity();

    // Create empty credentials file
    await provider.set("__initialized__", new Date().toISOString());

    return { recipient };
  }

  /**
   * Force refresh of provider availability check
   *
   * Useful after environment changes (e.g., secret-service becomes available)
   */
  async refresh(): Promise<void> {
    this.initialized = false;
    this.initPromise = null;
    this.activeProvider = null;
    await this.initialize();
  }
}

/**
 * Singleton instance for convenience
 */
let vaultInstance: CredentialVault | null = null;

/**
 * Get the global credential vault instance
 *
 * Note: If an instance already exists, the config parameter is ignored.
 * Use resetCredentialVault() first to create a new instance with different config.
 */
export function getCredentialVault(
  config?: Partial<CredentialVaultConfig>
): CredentialVault {
  if (!vaultInstance) {
    vaultInstance = new CredentialVault(config);
  } else if (config) {
    console.warn(
      "[getCredentialVault] Config ignored - vault instance already exists. " +
        "Call resetCredentialVault() first to reconfigure."
    );
  }
  return vaultInstance;
}

/**
 * Reset the global vault instance (for testing)
 */
export function resetCredentialVault(): void {
  vaultInstance = null;
}

/**
 * Convenience function to retrieve a credential
 */
export async function getCredential(key: string): Promise<string | null> {
  const vault = getCredentialVault();
  const result = await vault.get(key);
  return result.value;
}

/**
 * Convenience function to store a credential
 */
export async function setCredential(key: string, value: string): Promise<void> {
  const vault = getCredentialVault();
  await vault.set(key, value);
}

/**
 * Convenience function to delete a credential
 */
export async function deleteCredential(key: string): Promise<boolean> {
  const vault = getCredentialVault();
  return await vault.delete(key);
}
