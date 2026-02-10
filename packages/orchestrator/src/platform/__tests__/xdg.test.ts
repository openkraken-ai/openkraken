/**
 * XDG Environment Variable Tests
 *
 * Tests for XDG Base Directory Specification compliance.
 * Verifies that individual XDG environment variables can override FHS paths independently.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  getPlatformPaths,
  PlatformPathResolver,
  resetResolverInstance,
  setResolverInstance,
} from "../resolver";

// Store original environment
let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  // Store original environment
  originalEnv = {
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    XDG_DATA_HOME: process.env.XDG_DATA_HOME,
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
    OPENKRAKEN_HOME: process.env.OPENKRAKEN_HOME,
  };

  // Explicitly unset XDG variables for clean test environment
  process.env.XDG_CONFIG_HOME = undefined;
  process.env.XDG_DATA_HOME = undefined;
  process.env.XDG_CACHE_HOME = undefined;
  process.env.OPENKRAKEN_HOME = undefined;

  // Reset singleton for test isolation
  resetResolverInstance();
});

afterEach(() => {
  // Restore original environment
  process.env.XDG_CONFIG_HOME = originalEnv.XDG_CONFIG_HOME;
  process.env.XDG_DATA_HOME = originalEnv.XDG_DATA_HOME;
  process.env.XDG_CACHE_HOME = originalEnv.XDG_CACHE_HOME;
  process.env.OPENKRAKEN_HOME = originalEnv.OPENKRAKEN_HOME;

  // Reset singleton
  resetResolverInstance();
});

describe("XDG Environment Variable Overrides", () => {
  describe("with mode: fhs", () => {
    it("should use XDG_CONFIG_HOME when explicitly set", () => {
      process.env.XDG_CONFIG_HOME = "/custom/xdg/config";

      const resolver = new PlatformPathResolver();
      const paths = resolver.resolvePaths({ mode: "fhs" });

      // Config should use XDG override
      expect(paths.config).toContain("/custom/xdg/config");
    });

    it("should use XDG_DATA_HOME when explicitly set", () => {
      process.env.XDG_DATA_HOME = "/custom/xdg/data";

      const resolver = new PlatformPathResolver();
      const paths = resolver.resolvePaths({ mode: "fhs" });

      // Data should use XDG override
      expect(paths.data).toBe("/custom/xdg/data");
      // Logs should be in XDG_DATA_HOME/openkraken/logs
      expect(paths.logs).toContain("/custom/xdg/data");
    });

    it("should use XDG_CACHE_HOME when explicitly set", () => {
      process.env.XDG_CACHE_HOME = "/custom/xdg/cache";

      const resolver = new PlatformPathResolver();
      const paths = resolver.resolvePaths({ mode: "fhs" });

      // Cache should use XDG override
      expect(paths.cache).toBe("/custom/xdg/cache");
    });

    it("should use all XDG variables when all are explicitly set", () => {
      process.env.XDG_CONFIG_HOME = "/custom/config";
      process.env.XDG_DATA_HOME = "/custom/data";
      process.env.XDG_CACHE_HOME = "/custom/cache";

      const resolver = new PlatformPathResolver();
      const paths = resolver.resolvePaths({ mode: "fhs" });

      expect(paths.config).toContain("/custom/config");
      expect(paths.data).toBe("/custom/data");
      expect(paths.logs).toContain("/custom/data");
      expect(paths.cache).toBe("/custom/cache");
    });

    it("should use FHS paths when no XDG variables are explicitly set", () => {
      // No XDG vars set (they were deleted in beforeEach)

      const paths = getPlatformPaths({ mode: "fhs" });

      // Should use strict FHS paths
      expect(paths.config).toBe("/etc/openkraken/config.yaml");
      expect(paths.data).toBe("/var/lib/openkraken");
      expect(paths.logs).toBe("/var/log/openkraken");
      expect(paths.cache).toBe("/var/cache/openkraken");
    });
  });

  describe("with mode: xdg", () => {
    it("should use XDG defaults when no variables are set", () => {
      const paths = getPlatformPaths({ mode: "xdg" });

      // Should use XDG defaults (tilde paths)
      expect(paths.config).toContain(".config/openkraken");
      expect(paths.data).toContain(".local/share/openkraken");
      expect(paths.cache).toContain(".cache/openkraken");
    });

    it("should use XDG_CONFIG_HOME when explicitly set", () => {
      process.env.XDG_CONFIG_HOME = "/override/config";

      const paths = getPlatformPaths({ mode: "xdg" });

      expect(paths.config).toContain("/override/config");
    });
  });

  describe("independent XDG variable behavior", () => {
    it("should allow independent overrides per variable", () => {
      // Only set XDG_CONFIG_HOME
      process.env.XDG_CONFIG_HOME = "/config/only";

      const resolver = new PlatformPathResolver();
      const paths = resolver.resolvePaths({ mode: "fhs" });

      // Only config should be overridden
      expect(paths.config).toContain("/config/only");
      expect(paths.data).toBe("/var/lib/openkraken"); // FHS default
      expect(paths.logs).toBe("/var/log/openkraken"); // FHS default
      expect(paths.cache).toBe("/var/cache/openkraken"); // FHS default
    });

    it("should mix XDG config with FHS data and cache", () => {
      process.env.XDG_CONFIG_HOME = "/etc/xdg";
      // XDG_DATA_HOME and XDG_CACHE_HOME not set

      const resolver = new PlatformPathResolver();
      const paths = resolver.resolvePaths({ mode: "fhs" });

      // Each path type is independent
      expect(paths.config).toContain("/etc/xdg");
      expect(paths.data).toBe("/var/lib/openkraken");
      expect(paths.logs).toBe("/var/log/openkraken");
      expect(paths.cache).toBe("/var/cache/openkraken");
    });
  });

  describe("singleton reset for testing", () => {
    it("should allow resetting singleton between tests", () => {
      // First test sets environment
      process.env.XDG_CONFIG_HOME = "/first/test";
      const paths1 = getPlatformPaths({ mode: "fhs" });
      expect(paths1.config).toContain("/first/test");

      // Reset singleton
      resetResolverInstance();

      // Second test with different environment
      process.env.XDG_CONFIG_HOME = "/second/test";
      const paths2 = getPlatformPaths({ mode: "fhs" });
      expect(paths2.config).toContain("/second/test");
    });

    it("should allow setting custom instance for testing", () => {
      const customResolver = new PlatformPathResolver();
      setResolverInstance(customResolver);

      const retrieved = getPlatformPaths();
      expect(retrieved).toEqual(customResolver.resolvePaths());

      // Clean up
      setResolverInstance(null);
      resetResolverInstance();
    });
  });

  describe("tilde expansion in XDG paths", () => {
    it("should expand tilde in XDG_CONFIG_HOME", () => {
      process.env.XDG_CONFIG_HOME = "~/my-xdg-config";

      const paths = getPlatformPaths({ mode: "fhs" });

      expect(paths.config).not.toContain("~");
      expect(paths.config).toContain("my-xdg-config");
    });
  });
});
