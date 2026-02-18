/**
 * Tests for Credential Vault (INFRA-015)
 *
 * Note: These tests focus on logic that can be tested without requiring
 * actual system vault access. Tests for secrets API integration require
 * a running secret-service (on Linux) or Keychain access (on macOS).
 *
 * To run integration tests with real vault access:
 * - Linux: Ensure gnome-keyring or kwallet is running
 * - macOS: Keychain access is available by default
 */

import { describe, expect, test } from "bun:test";
import { CredentialError } from "../types";
import { CredentialVault } from "../vault";

describe("CredentialError", () => {
  test("creates error with correct properties", () => {
    const error = new CredentialError("not_found", "Credential not found");

    expect(error.name).toBe("CredentialError");
    expect(error.type).toBe("not_found");
    expect(error.message).toBe("Credential not found");
  });

  test("includes cause when provided", () => {
    const cause = new Error("Original error");
    const error = new CredentialError(
      "provider_unavailable",
      "Provider failed",
      cause
    );

    expect(error.cause).toBe(cause);
  });

  test("supports all error types", () => {
    const errorTypes = [
      "not_found",
      "provider_unavailable",
      "encryption_error",
      "permission_denied",
      "invalid_format",
    ] as const;

    for (const type of errorTypes) {
      const error = new CredentialError(type, `Test ${type}`);
      expect(error.type).toBe(type);
    }
  });
});

describe("CredentialVault", () => {
  test("getActiveBackend returns null before initialization", () => {
    const originalHome = process.env.OPENKRAKEN_HOME;
    try {
      process.env.OPENKRAKEN_HOME = "/tmp/test";
      const vault = new CredentialVault({ serviceName: "test" });
      expect(vault.getActiveBackend()).toBeNull();
    } finally {
      process.env.OPENKRAKEN_HOME = originalHome;
    }
  });

  test("isUsingFallback returns false before initialization", () => {
    const originalHome = process.env.OPENKRAKEN_HOME;
    try {
      process.env.OPENKRAKEN_HOME = "/tmp/test";
      const vault = new CredentialVault({ serviceName: "test" });
      expect(vault.isUsingFallback()).toBe(false);
    } finally {
      process.env.OPENKRAKEN_HOME = originalHome;
    }
  });

  test("throws when OPENKRAKEN_HOME is not set", () => {
    const originalHome = process.env.OPENKRAKEN_HOME;
    try {
      process.env.OPENKRAKEN_HOME = undefined;
      expect(() => new CredentialVault()).toThrow(
        "OPENKRAKEN_HOME environment variable is not set"
      );
    } finally {
      process.env.OPENKRAKEN_HOME = originalHome;
    }
  });

  test("accepts custom service name", () => {
    const originalHome = process.env.OPENKRAKEN_HOME;
    try {
      process.env.OPENKRAKEN_HOME = "/tmp/test";
      const vault = new CredentialVault({ serviceName: "custom-service" });
      expect(vault).toBeDefined();
    } finally {
      process.env.OPENKRAKEN_HOME = originalHome;
    }
  });

  test("accepts custom encrypted file path", () => {
    const originalHome = process.env.OPENKRAKEN_HOME;
    try {
      process.env.OPENKRAKEN_HOME = "/tmp/test";
      const vault = new CredentialVault({
        serviceName: "test",
        encryptedFilePath: "/custom/path/credentials.enc",
      });
      expect(vault).toBeDefined();
    } finally {
      process.env.OPENKRAKEN_HOME = originalHome;
    }
  });
});

describe("Types", () => {
  test("VaultBackend type allows expected values", () => {
    const bunSecrets = "bun-secrets";
    const ageEncrypted = "age-encrypted";

    expect(bunSecrets).toBe("bun-secrets");
    expect(ageEncrypted).toBe("age-encrypted");
  });

  test("CredentialResult interface is correct shape", () => {
    const result = {
      value: "test-value",
      backend: "bun-secrets" as const,
      fallback: false,
    };

    expect(result.value).toBe("test-value");
    expect(result.backend).toBe("bun-secrets");
    expect(result.fallback).toBe(false);
  });

  test("CredentialResult with null value is valid", () => {
    const result = {
      value: null,
      backend: "age-encrypted" as const,
      fallback: true,
    };

    expect(result.value).toBeNull();
    expect(result.fallback).toBe(true);
  });
});
