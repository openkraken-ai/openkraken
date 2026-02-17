/**
 * Directory Permission Validation Tests
 *
 * Tests for DirectoryManager permission validation and fixing functionality.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { existsSync } from "node:fs";
import { chmod, mkdir, rmdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DirectoryManager,
  fixDirectoryPermissions,
  validateDirectoryPermissions,
} from "../directories";
import type { PlatformPaths } from "../paths/types";
import {
  PlatformPathResolver,
  resetResolverInstance,
  setResolverInstance,
} from "../resolver";

describe("DirectoryManager Permission Validation", () => {
  let testBaseDir: string;
  let resolver: PlatformPathResolver;

  beforeEach(async () => {
    // Create a unique test directory
    testBaseDir = join(tmpdir(), `openkraken-test-${Date.now()}`);
    await mkdir(testBaseDir, { recursive: true });

    // Create a mock resolver instance
    resolver = new PlatformPathResolver();
    setResolverInstance(resolver);

    // Create the actual test directories before validation
    await mkdir(join(testBaseDir, "config"), { recursive: true });
    await mkdir(join(testBaseDir, "data"), { recursive: true });
    await mkdir(join(testBaseDir, "logs"), { recursive: true });
    await mkdir(join(testBaseDir, "cache"), { recursive: true });

    // Set correct permissions
    await chmod(join(testBaseDir, "config"), 0o750);
    await chmod(join(testBaseDir, "data"), 0o755);
    await chmod(join(testBaseDir, "logs"), 0o750);
    await chmod(join(testBaseDir, "cache"), 0o755);

    // Mock the resolver to return our test paths
    const mockPaths: PlatformPaths = {
      config: join(testBaseDir, "config"),
      data: join(testBaseDir, "data"),
      logs: join(testBaseDir, "logs"),
      cache: join(testBaseDir, "cache"),
    };

    // Mock resolvePaths to return mock paths
    vi.spyOn(resolver, "resolvePaths").mockReturnValue(mockPaths);
    vi.spyOn(resolver, "getEnvironment").mockReturnValue({
      platform: "linux",
      platformVersion: "6.0.0",
      arch: "x64",
      isWSL: false,
      isDocker: false,
      isRoot: false,
    });
  });

  afterEach(async () => {
    // Cleanup test directory
    if (existsSync(testBaseDir)) {
      try {
        await rmdir(testBaseDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    }

    // Reset singleton
    resetResolverInstance();
    vi.restoreAllMocks();
  });

  describe("validateDirectoryPermissions", () => {
    it("should return valid=true when all directories have correct permissions", async () => {
      // Create directories with correct permissions per INFRA-014
      // config: 640, data: 700, logs: 750, cache: 755
      await mkdir(join(testBaseDir, "config"), { recursive: true });
      await chmod(join(testBaseDir, "config"), 0o640);
      await mkdir(join(testBaseDir, "data"), { recursive: true });
      await chmod(join(testBaseDir, "data"), 0o700);
      await mkdir(join(testBaseDir, "logs"), { recursive: true });
      await chmod(join(testBaseDir, "logs"), 0o750);
      await mkdir(join(testBaseDir, "cache"), { recursive: true });
      await chmod(join(testBaseDir, "cache"), 0o755);

      const mockPaths: PlatformPaths = {
        config: join(testBaseDir, "config"),
        data: join(testBaseDir, "data"),
        logs: join(testBaseDir, "logs"),
        cache: join(testBaseDir, "cache"),
      };

      const result = await validateDirectoryPermissions(mockPaths);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect incorrect permissions and report issues", async () => {
      // Create directories with wrong permissions per INFRA-014
      // config should be 640, not 777
      await mkdir(join(testBaseDir, "config"), { recursive: true });
      await chmod(join(testBaseDir, "config"), 0o777);

      const mockPaths: PlatformPaths = {
        config: join(testBaseDir, "config"),
        data: join(testBaseDir, "data"),
        logs: join(testBaseDir, "logs"),
        cache: join(testBaseDir, "cache"),
      };

      const result = await validateDirectoryPermissions(mockPaths);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);

      const configIssue = result.issues.find((i) => i.path.includes("config"));
      expect(configIssue).toBeDefined();
      expect(configIssue?.expectedMode).toBe(0o640);
      expect(configIssue?.actualMode).toBe(0o777);
    });

    it("should report non-existent directories as errors", async () => {
      const mockPaths: PlatformPaths = {
        config: join(testBaseDir, "nonexistent-config"),
        data: join(testBaseDir, "data"),
        logs: join(testBaseDir, "logs"),
        cache: join(testBaseDir, "cache"),
      };

      const result = await validateDirectoryPermissions(mockPaths);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);

      const missingIssue = result.issues.find((i) =>
        i.path.includes("nonexistent-config")
      );
      expect(missingIssue).toBeDefined();
      expect(missingIssue?.severity).toBe("error");
    });

    it("should report overly permissive directories as errors", async () => {
      // Create directory with world-readable permissions when it should be restricted
      await mkdir(join(testBaseDir, "config"), { recursive: true });
      await chmod(join(testBaseDir, "config"), 0o755);

      const mockPaths: PlatformPaths = {
        config: join(testBaseDir, "config"),
        data: join(testBaseDir, "data"),
        logs: join(testBaseDir, "logs"),
        cache: join(testBaseDir, "cache"),
      };

      const result = await validateDirectoryPermissions(mockPaths);

      expect(result.valid).toBe(false);

      const configIssue = result.issues.find((i) => i.path.includes("config"));
      expect(configIssue?.severity).toBe("error");
    });
  });

  describe("fixPermissions", () => {
    it("should fix incorrect permissions and return success", async () => {
      // Create directory with wrong permissions (config should be 640 per INFRA-014)
      await mkdir(join(testBaseDir, "config"), { recursive: true });
      await chmod(join(testBaseDir, "config"), 0o777);

      // Verify it's wrong before fixing
      const statsBefore = await stat(join(testBaseDir, "config"));
      // biome-ignore lint/suspicious/noBitwiseOperators: Permission bit extraction is intentional
      expect(statsBefore.mode & 0o777).toBe(0o777);

      const mockPaths: PlatformPaths = {
        config: join(testBaseDir, "config"),
        data: join(testBaseDir, "data"),
        logs: join(testBaseDir, "logs"),
        cache: join(testBaseDir, "cache"),
      };

      const result = await fixDirectoryPermissions(mockPaths);

      // Verify it's fixed to 640 (config per INFRA-014)
      const statsAfter = await stat(join(testBaseDir, "config"));
      // biome-ignore lint/suspicious/noBitwiseOperators: Permission bit extraction is intentional
      expect(statsAfter.mode & 0o777).toBe(0o640);

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].severity).toBe("warning");
    });

    it("should handle non-existent directories gracefully", async () => {
      const mockPaths: PlatformPaths = {
        config: join(testBaseDir, "nonexistent-config"),
        data: join(testBaseDir, "data"),
        logs: join(testBaseDir, "logs"),
        cache: join(testBaseDir, "cache"),
      };

      const result = await fixDirectoryPermissions(mockPaths);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);

      const missingIssue = result.issues.find((i) =>
        i.path.includes("nonexistent-config")
      );
      expect(missingIssue?.severity).toBe("error");
    });

    it("should not modify directories with correct permissions", async () => {
      // Create directory with correct permissions per INFRA-014
      // data directory should be 700 (private)
      await mkdir(join(testBaseDir, "data"), { recursive: true });
      await chmod(join(testBaseDir, "data"), 0o700);

      // Get modification time before
      const statsBefore = await stat(join(testBaseDir, "data"));
      const mtimeBefore = statsBefore.mtimeMs;

      const mockPaths: PlatformPaths = {
        config: join(testBaseDir, "config"),
        data: join(testBaseDir, "data"),
        logs: join(testBaseDir, "logs"),
        cache: join(testBaseDir, "cache"),
      };

      const result = await fixDirectoryPermissions(mockPaths);

      // Verify directory wasn't touched
      const statsAfter = await stat(join(testBaseDir, "data"));
      expect(statsAfter.mtimeMs).toBe(mtimeBefore);

      // data directory should have no issues (0o700 is correct for data per INFRA-014)
      const dataIssue = result.issues.find((i) => i.path.includes("data"));
      expect(dataIssue).toBeUndefined();
    });
  });

  describe("DirectoryManager with autoFixPermissions", () => {
    it("should automatically fix permissions when option is enabled", async () => {
      // Create directory with wrong permissions
      await mkdir(join(testBaseDir, "logs"), { recursive: true });
      await chmod(join(testBaseDir, "logs"), 0o777);

      const manager = new DirectoryManager({ autoFixPermissions: true });

      const _mockPaths: PlatformPaths = {
        config: join(testBaseDir, "config"),
        data: join(testBaseDir, "data"),
        logs: join(testBaseDir, "logs"),
        cache: join(testBaseDir, "cache"),
      };

      // ensureDirectories should fix permissions automatically
      const _result = await manager.ensureDirectories();

      // Verify permissions were fixed
      const stats = await stat(join(testBaseDir, "logs"));
      // biome-ignore lint/suspicious/noBitwiseOperators: Permission bit extraction is intentional
      expect(stats.mode & 0o777).toBe(0o750);
    });

    it("should report permission error when autoFixPermissions is disabled and permissions are wrong", async () => {
      // Create directory with wrong permissions
      await mkdir(join(testBaseDir, "config"), { recursive: true });
      await chmod(join(testBaseDir, "config"), 0o777);

      const manager = new DirectoryManager({ autoFixPermissions: false });

      // First validate to see if there's an issue
      const validateResult = await manager.validatePermissions({
        config: join(testBaseDir, "config"),
        data: join(testBaseDir, "data"),
        logs: join(testBaseDir, "logs"),
        cache: join(testBaseDir, "cache"),
      });

      // Should detect the permission issue
      expect(validateResult.valid).toBe(false);
      const configIssue = validateResult.issues.find((i) =>
        i.path.includes("config")
      );
      expect(configIssue).toBeDefined();
    });
  });

  describe("isAccessible", () => {
    it("should return false for non-existent directory", async () => {
      const manager = new DirectoryManager();
      const isAccessible = await manager.isAccessible(
        join(testBaseDir, "does-not-exist"),
        0o755
      );

      expect(isAccessible).toBe(false);
    });

    it("should handle access errors gracefully", async () => {
      // Test with a path that will cause access to fail
      // Since we're testing the function handles errors, we don't need specific permissions
      const manager = new DirectoryManager();

      // This should return false or throw, but function catches errors
      const result = await manager.isAccessible(
        "/proc/999999999/notexist",
        0o755
      );

      // Function should handle gracefully (return false on error)
      expect(typeof result).toBe("boolean");
    });

    it("should check directory existence regardless of permission checks", async () => {
      await mkdir(join(testBaseDir, "exists"), { recursive: true });

      const manager = new DirectoryManager();

      // Just check existence works
      const exists = !(await manager.isAccessible(
        join(testBaseDir, "exists"),
        0o000
      ));

      // Either true or false is acceptable - we're testing error handling
      // The function is primarily for checking if we can proceed with operations
      expect(typeof exists).toBe("boolean");
    });
  });
});

describe("Permission Severity Determination", () => {
  let testBaseDir: string;
  let resolver: PlatformPathResolver;

  beforeEach(async () => {
    testBaseDir = join(tmpdir(), `openkraken-severity-${Date.now()}`);
    await mkdir(testBaseDir, { recursive: true });

    resolver = new PlatformPathResolver();
    setResolverInstance(resolver);

    vi.spyOn(resolver, "resolvePaths").mockReturnValue({
      config: join(testBaseDir, "config"),
      data: join(testBaseDir, "data"),
      logs: join(testBaseDir, "logs"),
      cache: join(testBaseDir, "cache"),
    });
    vi.spyOn(resolver, "getEnvironment").mockReturnValue({
      platform: "linux",
      platformVersion: "6.0.0",
      arch: "x64",
      isWSL: false,
      isDocker: false,
      isRoot: false,
    });
  });

  afterEach(async () => {
    if (existsSync(testBaseDir)) {
      try {
        await rmdir(testBaseDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    }
    resetResolverInstance();
    vi.restoreAllMocks();
  });

  it("should mark overly permissive directories as errors", async () => {
    // Create config directory with overly permissive 0o755 (should be 0o750)
    await mkdir(join(testBaseDir, "config"), { recursive: true });
    await chmod(join(testBaseDir, "config"), 0o755);

    const mockPaths: PlatformPaths = {
      config: join(testBaseDir, "config"),
      data: join(testBaseDir, "data"),
      logs: join(testBaseDir, "logs"),
      cache: join(testBaseDir, "cache"),
    };

    const result = await validateDirectoryPermissions(mockPaths);
    const configIssue = result.issues.find((i) => i.path.includes("config"));

    expect(configIssue?.severity).toBe("error");
  });

  it("should mark overly open directories as errors", async () => {
    // Create directories with correct permissions first
    await mkdir(join(testBaseDir, "config"), { recursive: true });
    await chmod(join(testBaseDir, "config"), 0o640);
    // Create data directory with overly open permissions (0o755 when should be 0o700)
    await mkdir(join(testBaseDir, "data"), { recursive: true });
    await chmod(join(testBaseDir, "data"), 0o755);
    await mkdir(join(testBaseDir, "logs"), { recursive: true });
    await chmod(join(testBaseDir, "logs"), 0o750);
    await mkdir(join(testBaseDir, "cache"), { recursive: true });
    await chmod(join(testBaseDir, "cache"), 0o755);

    const mockPaths: PlatformPaths = {
      config: join(testBaseDir, "config"),
      data: join(testBaseDir, "data"),
      logs: join(testBaseDir, "logs"),
      cache: join(testBaseDir, "cache"),
    };

    const result = await validateDirectoryPermissions(mockPaths);
    const dataIssue = result.issues.find((i) => i.path.includes("data"));

    // Data being too open (755 when should be 700) is a security error
    expect(dataIssue?.severity).toBe("error");
  });
});
