/**
 * Credential Vault Types (INFRA-015)
 *
 * Type definitions for the credential vault abstraction.
 * Supports platform-native vaults (Bun.secrets) with age-encrypted file fallback.
 */

/**
 * Supported vault backend types
 */
export type VaultBackend = "bun-secrets" | "age-encrypted";

/**
 * Configuration for the credential vault
 */
export interface CredentialVaultConfig {
  /** Service name used to identify credentials in the vault */
  serviceName: string;
  /** Path to age-encrypted credentials file for fallback */
  encryptedFilePath?: string;
  /** Enable development mode with environment variable fallback */
  developmentMode?: boolean;
}

/**
 * Provider interface for credential storage backends
 */
export interface CredentialProvider {
  /** Unique identifier for this provider */
  readonly name: VaultBackend;

  /** Check if this provider is available on the current system */
  isAvailable(): Promise<boolean>;

  /** Retrieve a credential by key */
  get(key: string): Promise<string | null>;

  /** Store a credential */
  set(key: string, value: string): Promise<void>;

  /** Delete a credential */
  delete(key: string): Promise<boolean>;

  /** List all credential keys */
  list?(): string[] | Promise<string[]>;

  /**
   * Initialize a new identity for this provider (optional)
   *
   * Used by providers that require initialization before use,
   * such as age-encrypted file storage on headless servers.
   */
  initializeIdentity?(): Promise<{ identity: string; recipient: string }>;
}

/**
 * Result of credential retrieval operation
 */
export interface CredentialResult {
  /** The retrieved credential value, or null if not found */
  value: string | null;
  /** The backend that provided the credential */
  backend: VaultBackend;
  /** Whether a fallback was used */
  fallback: boolean;
}

/**
 * Error types for credential operations
 */
export type CredentialErrorType =
  | "not_found"
  | "provider_unavailable"
  | "encryption_error"
  | "permission_denied"
  | "invalid_format";

/**
 * Error thrown by credential vault operations
 */
export class CredentialError extends Error {
  readonly type: CredentialErrorType;
  readonly cause?: Error;

  constructor(type: CredentialErrorType, message: string, cause?: Error) {
    super(message);
    this.name = "CredentialError";
    this.type = type;
    this.cause = cause;
  }
}
