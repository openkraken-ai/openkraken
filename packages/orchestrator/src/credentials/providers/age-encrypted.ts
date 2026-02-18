/**
 * Age-Encrypted Credential Provider (INFRA-015)
 *
 * Provides credential storage using age-encrypted files for headless servers
 * where secret-service is unavailable. This is the fallback when Bun.secrets
 * cannot connect to a secret service daemon.
 *
 * Architecture:
 * - Master key (age identity) is stored in Bun.secrets, env variable, or file
 * - Credentials are stored in an age-encrypted JSON file
 * - File must have permissions 0600 (owner read/write only)
 *
 * The encrypted file path defaults to $OPENKRAKEN_HOME/credentials.enc
 */

import {
  chmodSync,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  Decrypter,
  Encrypter,
  generateIdentity,
  identityToRecipient,
} from "age-encryption";
import { secrets } from "bun";
import type { CredentialProvider, VaultBackend } from "../types";

/**
 * Key name for storing the age identity in secrets API
 */
const MASTER_KEY_NAME = "__openkraken_age_identity__";

/**
 * Filename for file-based age identity (fallback when secrets API unavailable)
 */
const IDENTITY_FILENAME = ".age_identity";

/**
 * Expected file permissions for encrypted files and identity file
 */
const EXPECTED_FILE_MODE = 0o600;

/**
 * Age-encrypted credential provider implementation
 */
export class AgeEncryptedProvider implements CredentialProvider {
  readonly name: VaultBackend = "age-encrypted";

  private readonly encryptedFilePath: string;
  private readonly identityFilePath: string;
  private readonly serviceName: string;
  private cachedIdentity: string | null = null;
  private cachedCredentials: Record<string, string> | null = null;

  constructor(serviceName: string, encryptedFilePath: string) {
    this.serviceName = serviceName;
    this.encryptedFilePath = encryptedFilePath;
    // Identity file lives alongside the encrypted credentials file
    this.identityFilePath = join(dirname(encryptedFilePath), IDENTITY_FILENAME);
  }

  /**
   * Check if this provider is available
   *
   * Returns true if:
   * 1. The encrypted credentials file exists with correct permissions, OR
   * 2. We can create a new encrypted file
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if file exists
      if (!existsSync(this.encryptedFilePath)) {
        // Can potentially create - available if we have a master key
        return await this.hasMasterKey();
      }

      // Verify file permissions
      const stats = statSync(this.encryptedFilePath);
      // Extract permission bits (lower 9 bits of mode)
      const mode = stats.mode % 0o1000;
      if (mode !== EXPECTED_FILE_MODE) {
        console.warn(
          `credentials.enc has incorrect permissions ${mode.toString(8).padStart(3, "0")}, expected 600. ` +
            "Run: chmod 600 <credentials.enc>"
        );
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if we have access to the master key
   */
  private async hasMasterKey(): Promise<boolean> {
    // First check environment variable
    if (process.env.OPENKRAKEN_AGE_IDENTITY) {
      return true;
    }

    // Then check file-based identity (fallback for headless servers)
    if (existsSync(this.identityFilePath)) {
      return true;
    }

    // Finally check secrets API
    try {
      const identity = await secrets.get({
        service: this.serviceName,
        name: MASTER_KEY_NAME,
      });
      return identity !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get the age identity (private key) for decryption
   */
  private async getIdentity(): Promise<string> {
    if (this.cachedIdentity) {
      return this.cachedIdentity;
    }

    // First check environment variable (for development/testing)
    const envIdentity = process.env.OPENKRAKEN_AGE_IDENTITY;
    if (envIdentity) {
      this.cachedIdentity = envIdentity;
      return envIdentity;
    }

    // Then check file-based identity (fallback for headless servers)
    if (existsSync(this.identityFilePath)) {
      try {
        const identity = readFileSync(this.identityFilePath, "utf-8").trim();
        if (identity) {
          this.cachedIdentity = identity;
          return identity;
        }
      } catch {
        // Fall through to secrets API check
      }
    }

    // Finally check secrets API
    try {
      const identity = await secrets.get({
        service: this.serviceName,
        name: MASTER_KEY_NAME,
      });

      if (!identity) {
        throw new Error(
          "Age identity not found. Set OPENKRAKEN_AGE_IDENTITY environment variable, " +
            "provision a .age_identity file, or run: openkraken credentials init"
        );
      }

      this.cachedIdentity = identity;
      return identity;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Age identity not found")
      ) {
        throw error;
      }
      throw new Error(
        `Failed to retrieve age identity: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the public key (recipient) from the identity
   */
  private async getRecipient(): Promise<string> {
    const identity = await this.getIdentity();
    return await identityToRecipient(identity);
  }

  /**
   * Load and decrypt credentials from the encrypted file
   */
  private async loadCredentials(): Promise<Record<string, string>> {
    if (this.cachedCredentials) {
      return this.cachedCredentials;
    }

    if (!existsSync(this.encryptedFilePath)) {
      // No file yet - return empty credentials
      this.cachedCredentials = {};
      return {};
    }

    try {
      const encryptedContent = readFileSync(this.encryptedFilePath, "utf-8");
      const identity = await this.getIdentity();

      const decrypter = new Decrypter();
      decrypter.addIdentity(identity);

      const decrypted = await decrypter.decrypt(encryptedContent, "text");
      const credentials = JSON.parse(decrypted as string) as Record<
        string,
        string
      >;

      this.cachedCredentials = credentials;
      return credentials;
    } catch (error) {
      throw new Error(
        `Failed to decrypt credentials: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Encrypt and save credentials to the file
   */
  private async saveCredentials(
    credentials: Record<string, string>
  ): Promise<void> {
    try {
      const recipient = await this.getRecipient();
      const cipher = new Encrypter();
      cipher.addRecipient(recipient);

      const plaintext = JSON.stringify(credentials, null, 2);
      const encrypted = (await cipher.encrypt(plaintext)) as string;

      // Write file
      writeFileSync(this.encryptedFilePath, encrypted, {
        mode: EXPECTED_FILE_MODE,
      });

      // Ensure correct permissions (writeFileSync mode may not work on all platforms)
      chmodSync(this.encryptedFilePath, EXPECTED_FILE_MODE);
      this.cachedCredentials = credentials;
    } catch (error) {
      throw new Error(
        `Failed to encrypt credentials: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Retrieve a credential
   */
  async get(key: string): Promise<string | null> {
    const credentials = await this.loadCredentials();
    return credentials[key] ?? null;
  }

  /**
   * Store a credential
   */
  async set(key: string, value: string): Promise<void> {
    const credentials = await this.loadCredentials();
    credentials[key] = value;
    await this.saveCredentials(credentials);
  }

  /**
   * Delete a credential
   */
  async delete(key: string): Promise<boolean> {
    const credentials = await this.loadCredentials();

    if (!(key in credentials)) {
      return false;
    }

    delete credentials[key];
    await this.saveCredentials(credentials);
    return true;
  }

  /**
   * List all credential keys
   */
  async list(): Promise<string[]> {
    const credentials = await this.loadCredentials();
    return Object.keys(credentials);
  }

  /**
   * Initialize a new age identity and store it
   *
   * This should be called once during initial setup to generate
   * the master encryption key.
   *
   * Storage priority:
   * 1. Secrets API (if available) - preferred for desktop systems
   * 2. File-based (.age_identity) - fallback for headless servers
   */
  async initializeIdentity(): Promise<{ identity: string; recipient: string }> {
    const identity = await generateIdentity();
    const recipient = await identityToRecipient(identity);

    // Try to store in secrets API first
    let storedInVault = false;
    try {
      await secrets.set({
        service: this.serviceName,
        name: MASTER_KEY_NAME,
        value: identity,
      });
      storedInVault = true;
    } catch {
      // Secrets API unavailable - falling back to file-based storage
      console.info(
        "[AgeEncryptedProvider] Secrets API unavailable, using file-based identity storage"
      );
    }

    // If secrets API failed, store in file
    if (!storedInVault) {
      try {
        // Ensure parent directory exists
        const parentDir = dirname(this.identityFilePath);
        if (!existsSync(parentDir)) {
          throw new Error(`Parent directory does not exist: ${parentDir}`);
        }

        // Write identity file with restricted permissions
        writeFileSync(this.identityFilePath, identity, {
          mode: EXPECTED_FILE_MODE,
        });
        chmodSync(this.identityFilePath, EXPECTED_FILE_MODE);
      } catch (error) {
        throw new Error(
          `Failed to store age identity: ${error instanceof Error ? error.message : String(error)}. ` +
            "Ensure OPENKRAKEN_HOME exists and is writable."
        );
      }
    }

    this.cachedIdentity = identity;
    return { identity, recipient };
  }

  /**
   * Clear the in-memory cache
   */
  clearCache(): void {
    this.cachedIdentity = null;
    this.cachedCredentials = null;
  }
}

/**
 * Default path for the encrypted credentials file
 */
export function getDefaultCredentialsPath(): string {
  const home = process.env.OPENKRAKEN_HOME;
  if (!home) {
    throw new Error("OPENKRAKEN_HOME environment variable is not set");
  }
  return join(home, "credentials.enc");
}

/**
 * Factory function to create an age-encrypted provider
 */
export function createAgeEncryptedProvider(
  serviceName: string,
  encryptedFilePath?: string
): CredentialProvider {
  const path = encryptedFilePath ?? getDefaultCredentialsPath();
  return new AgeEncryptedProvider(serviceName, path);
}
