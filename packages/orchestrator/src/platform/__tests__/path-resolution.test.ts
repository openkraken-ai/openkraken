/**
 * Path Resolution Tests
 *
 * Unit tests for the PlatformPathResolver and path resolution logic.
 * Uses Bun's native test runner.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import {
  LINUX_FHS_PATHS,
  MACOS_COCOA_PATHS,
  PERMISSIONS,
} from "../paths/constants";
import {
  getCachePath,
  getConfigPath,
  getDataPath,
  getLogsPath,
  getPathResolver,
  getPlatformPaths,
  PlatformPathResolver,
  resetResolverInstance,
  resolveDataSubpath,
} from "../resolver";

// Store original environment for cleanup
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

describe("PlatformPathResolver", () => {
  let resolver: PlatformPathResolver;

  beforeEach(() => {
    resolver = new PlatformPathResolver();
  });

  describe("resolvePaths", () => {
    it("should return FHS paths when mode is fhs", () => {
      const paths = resolver.resolvePaths({ mode: "fhs" });

      expect(paths.config).toBe("/etc/openkraken/config.yaml");
      expect(paths.data).toBe("/var/lib/openkraken");
      expect(paths.logs).toBe("/var/log/openkraken");
      expect(paths.cache).toBe("/var/cache/openkraken");
    });

    it("should return Cocoa paths when mode is cocoa", () => {
      const paths = resolver.resolvePaths({ mode: "cocoa" });

      // Paths should contain expanded tilde for home directory with proper capitalization
      expect(paths.config).toContain("Library/Application Support/OpenKraken");
      expect(paths.config).toContain("config.yaml");
      expect(paths.logs).toContain("Library/Logs/OpenKraken");
      expect(paths.cache).toContain("Library/Caches/OpenKraken");
    });

    it("should respect OPENKRAKEN_HOME override", () => {
      const paths = resolver.resolvePaths({
        mode: "custom",
        customBasePath: "/custom/path",
      });

      expect(paths.config).toBe("/custom/path/config.yaml");
      expect(paths.data).toBe("/custom/path/data");
      expect(paths.logs).toBe("/custom/path/logs");
      expect(paths.cache).toBe("/custom/path/cache");
    });
  });

  describe("resolveConfigPath", () => {
    it("should return only the config path", () => {
      const configPath = resolver.resolveConfigPath({ mode: "fhs" });

      expect(configPath).toBe("/etc/openkraken/config.yaml");
    });
  });

  describe("resolveDataPath", () => {
    it("should return only the data path", () => {
      const dataPath = resolver.resolveDataPath({ mode: "fhs" });

      expect(dataPath).toBe("/var/lib/openkraken");
    });
  });

  describe("resolveLogsPath", () => {
    it("should return only the logs path", () => {
      const logsPath = resolver.resolveLogsPath({ mode: "fhs" });

      expect(logsPath).toBe("/var/log/openkraken");
    });
  });

  describe("resolveCachePath", () => {
    it("should return only the cache path", () => {
      const cachePath = resolver.resolveCachePath({ mode: "fhs" });

      expect(cachePath).toBe("/var/cache/openkraken");
    });
  });

  describe("getEnvironment", () => {
    it("should return environment info", () => {
      const env = resolver.getEnvironment();

      expect(env).toHaveProperty("platform");
      expect(env).toHaveProperty("arch");
      expect(env).toHaveProperty("isRoot");
      expect(env).toHaveProperty("isWSL");
      expect(env).toHaveProperty("isDocker");
    });
  });

  describe("clearCache", () => {
    it("should clear cached paths", () => {
      resolver.resolvePaths({ mode: "fhs" });
      resolver.clearCache();

      // Should not throw when resolving with different mode
      expect(() => resolver.resolvePaths({ mode: "cocoa" })).not.toThrow();
    });
  });
});

describe("Convenience Functions", () => {
  describe("getPlatformPaths", () => {
    it("should return platform paths using default options", () => {
      const paths = getPlatformPaths({ mode: "fhs" });

      expect(paths).toHaveProperty("config");
      expect(paths).toHaveProperty("data");
      expect(paths).toHaveProperty("logs");
      expect(paths).toHaveProperty("cache");
    });
  });

  describe("getConfigPath", () => {
    it("should return config path", () => {
      const path = getConfigPath({ mode: "fhs" });
      expect(path).toBe("/etc/openkraken/config.yaml");
    });
  });

  describe("getDataPath", () => {
    it("should return data path", () => {
      const path = getDataPath({ mode: "fhs" });
      expect(path).toBe("/var/lib/openkraken");
    });
  });

  describe("getLogsPath", () => {
    it("should return logs path", () => {
      const path = getLogsPath({ mode: "fhs" });
      expect(path).toBe("/var/log/openkraken");
    });
  });

  describe("getCachePath", () => {
    it("should return cache path", () => {
      const path = getCachePath({ mode: "fhs" });
      expect(path).toBe("/var/cache/openkraken");
    });
  });

  describe("resolveDataSubpath", () => {
    it("should resolve subpath within data directory", () => {
      const subpath = resolveDataSubpath("subdir/file.txt", { mode: "fhs" });
      expect(subpath).toBe("/var/lib/openkraken/subdir/file.txt");
    });
  });
});

describe("Permission Constants", () => {
  describe("PERMISSIONS", () => {
    it("should have correct standard permission value", () => {
      expect(PERMISSIONS.standard).toBe(0o755);
    });

    it("should have correct restricted permission value", () => {
      expect(PERMISSIONS.restricted).toBe(0o750);
    });

    it("should have correct private permission value", () => {
      expect(PERMISSIONS.private).toBe(0o700);
    });
  });
});

describe("Linux FHS Paths", () => {
  it("should define correct config path", () => {
    expect(LINUX_FHS_PATHS.config.path).toBe("/etc/openkraken");
    expect(LINUX_FHS_PATHS.config.mode).toBe(0o640);
  });

  it("should define correct data path", () => {
    expect(LINUX_FHS_PATHS.data.path).toBe("/var/lib/openkraken");
    expect(LINUX_FHS_PATHS.data.mode).toBe(0o700);
  });

  it("should define correct logs path", () => {
    expect(LINUX_FHS_PATHS.logs.path).toBe("/var/log/openkraken");
    expect(LINUX_FHS_PATHS.logs.mode).toBe(0o750);
  });

  it("should define correct cache path", () => {
    expect(LINUX_FHS_PATHS.cache.path).toBe("/var/cache/openkraken");
    expect(LINUX_FHS_PATHS.cache.mode).toBe(0o755);
  });
});

describe("macOS Cocoa Paths", () => {
  it("should define correct support path with proper capitalization", () => {
    // macOS Finder uses case-insensitive but case-preserving paths
    // The convention is Title Case for Application Support directories
    expect(MACOS_COCOA_PATHS.data.path).toContain(
      "Library/Application Support/OpenKraken"
    );
    expect(MACOS_COCOA_PATHS.data.mode).toBe(0o700);
  });

  it("should define correct logs path with proper capitalization", () => {
    expect(MACOS_COCOA_PATHS.logs.path).toContain("Library/Logs/OpenKraken");
    expect(MACOS_COCOA_PATHS.logs.mode).toBe(0o755);
  });

  it("should define correct caches path with proper capitalization", () => {
    expect(MACOS_COCOA_PATHS.cache.path).toContain("Library/Caches/OpenKraken");
    expect(MACOS_COCOA_PATHS.cache.mode).toBe(0o755);
  });
});

describe("Singleton Pattern", () => {
  it("should return same instance from getPathResolver", () => {
    const resolver1 = getPathResolver();
    const resolver2 = getPathResolver();

    expect(resolver1).toBe(resolver2);
  });
});

describe("NixOS Path Resolution", () => {
  let resolver: PlatformPathResolver;

  beforeEach(() => {
    resolver = new PlatformPathResolver();

    // Mock NixOS environment
    vi.spyOn(resolver as any, "getEnvironment").mockReturnValue({
      platform: "linux",
      platformVersion: "6.0.0",
      arch: "x64",
      isWSL: false,
      isDocker: false,
      isRoot: false,
      isNixOS: true, // Running on NixOS
      isDBusAvailable: false, // NixOS typically headless
      isHeadless: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should use XDG paths on NixOS by default", () => {
    // On NixOS without explicit mode, should use XDG (not FHS)
    // because /etc is immutable on NixOS
    const paths = resolver.resolvePaths();

    // XDG paths use ~/.config, ~/.local/share, ~/.cache
    expect(paths.config).toContain(".config");
    expect(paths.config).toContain("openkraken");
    expect(paths.data).toContain(".local");
    expect(paths.data).toContain("openkraken");
    expect(paths.cache).toContain(".cache");
    expect(paths.cache).toContain("openkraken");
  });

  it("should allow FHS mode override on NixOS", () => {
    // Even on NixOS, user can force FHS mode if they have a writable /etc
    const paths = resolver.resolvePaths({ mode: "fhs" });

    expect(paths.config).toBe("/etc/openkraken/config.yaml");
    expect(paths.data).toBe("/var/lib/openkraken");
    expect(paths.logs).toBe("/var/log/openkraken");
    expect(paths.cache).toBe("/var/cache/openkraken");
  });

  it("should show NixOS in environment summary", () => {
    const env = resolver.getEnvironment();

    expect(env.isNixOS).toBe(true);
  });
});

describe("Headless Linux Path Resolution", () => {
  let resolver: PlatformPathResolver;

  beforeEach(() => {
    resolver = new PlatformPathResolver();

    // Mock headless Linux environment (no desktop, no D-Bus)
    vi.spyOn(resolver as any, "getEnvironment").mockReturnValue({
      platform: "linux",
      platformVersion: "6.0.0",
      arch: "x64",
      isWSL: false,
      isDocker: false,
      isRoot: false,
      isNixOS: false,
      isDBusAvailable: false, // No D-Bus in headless
      isHeadless: true, // No desktop environment
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should use XDG paths for non-root headless Linux", () => {
    // Headless Linux should still use XDG paths
    const paths = resolver.resolvePaths();

    // Should use XDG default locations
    expect(paths.config).toContain(".config");
    expect(paths.data).toContain(".local");
    expect(paths.cache).toContain(".cache");
  });

  it("should report headless in environment summary", () => {
    const env = resolver.getEnvironment();

    expect(env.isHeadless).toBe(true);
  });

  it("should report no D-Bus in headless environment", () => {
    const env = resolver.getEnvironment();

    expect(env.isDBusAvailable).toBe(false);
  });

  it("should still allow OPENKRAKEN_HOME override in headless", () => {
    const paths = resolver.resolvePaths({
      mode: "custom",
      customBasePath: "/opt/openkraken",
    });

    expect(paths.config).toBe("/opt/openkraken/config.yaml");
    expect(paths.data).toBe("/opt/openkraken/data");
    expect(paths.logs).toBe("/opt/openkraken/logs");
    expect(paths.cache).toBe("/opt/openkraken/cache");
  });
});

describe("XDG Environment Variable Override in FHS Mode", () => {
  let resolver: PlatformPathResolver;

  beforeEach(() => {
    resolver = new PlatformPathResolver();

    // Ensure clean environment
    process.env.XDG_CONFIG_HOME = undefined;
    process.env.XDG_DATA_HOME = undefined;
    process.env.XDG_CACHE_HOME = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.XDG_CONFIG_HOME = undefined;
    process.env.XDG_DATA_HOME = undefined;
    process.env.XDG_CACHE_HOME = undefined;
  });

  it("should override config with XDG_CONFIG_HOME", () => {
    process.env.XDG_CONFIG_HOME = "/custom/xdg/config";

    const paths = resolver.resolvePaths();

    // Config should use XDG_CONFIG_HOME
    expect(paths.config).toBe("/custom/xdg/config/openkraken/config.yaml");
  });

  it("should override data with XDG_DATA_HOME", () => {
    process.env.XDG_DATA_HOME = "/custom/xdg/data";

    const paths = resolver.resolvePaths();

    // Data should use XDG_DATA_HOME with app name subdirectory
    expect(paths.data).toBe("/custom/xdg/data/openkraken/data");
  });

  it("should override cache with XDG_CACHE_HOME", () => {
    process.env.XDG_CACHE_HOME = "/custom/xdg/cache";

    const paths = resolver.resolvePaths();

    // Cache should use XDG_CACHE_HOME with app name subdirectory
    expect(paths.cache).toBe("/custom/xdg/cache/openkraken/cache");
  });

  it("should override multiple paths with multiple XDG variables", () => {
    process.env.XDG_CONFIG_HOME = "/custom/config";
    process.env.XDG_DATA_HOME = "/custom/data";
    process.env.XDG_CACHE_HOME = "/custom/cache";

    const paths = resolver.resolvePaths();

    expect(paths.config).toBe("/custom/config/openkraken/config.yaml");
    expect(paths.data).toBe("/custom/data/openkraken/data");
    expect(paths.cache).toBe("/custom/cache/openkraken/cache");
  });

  it("should use XDG defaults for paths not overridden", () => {
    // Only set XDG_CONFIG_HOME, not others
    process.env.XDG_CONFIG_HOME = "/custom/config";

    const paths = resolver.resolvePaths();

    // Config should use XDG_CONFIG_HOME
    expect(paths.config).toBe("/custom/config/openkraken/config.yaml");
    // Data should use default XDG_DATA_HOME
    expect(paths.data).toContain(".local/share/openkraken/data");
    // Logs use XDG_DATA_HOME (per XDG spec, logs go in data directory)
    expect(paths.logs).toContain(".local/share/openkraken/logs");
    // Cache should use default XDG_CACHE_HOME
    expect(paths.cache).toContain(".cache/openkraken/cache");
  });

  it("should respect explicit XDG overrides", () => {
    // All three XDG variables set
    process.env.XDG_CONFIG_HOME = "/custom/config";
    process.env.XDG_DATA_HOME = "/custom/data";
    process.env.XDG_CACHE_HOME = "/custom/cache";

    const paths = resolver.resolvePaths();

    // All should use custom XDG paths
    expect(paths.config).toBe("/custom/config/openkraken/config.yaml");
    expect(paths.data).toBe("/custom/data/openkraken/data");
    expect(paths.cache).toBe("/custom/cache/openkraken/cache");
    // Logs should use XDG_DATA_HOME since that's how logs are resolved
    expect(paths.logs).toBe("/custom/data/openkraken/logs");
  });
});

describe("Custom Path Validation", () => {
  let resolver: PlatformPathResolver;

  beforeEach(() => {
    resolver = new PlatformPathResolver();
    process.env.OPENKRAKEN_HOME = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.OPENKRAKEN_HOME = undefined;
  });

  it("should reject null bytes in custom path", () => {
    expect(() => {
      resolver.resolvePaths({
        mode: "custom",
        customBasePath: "/path/with\0null",
      });
    }).toThrow("contains null bytes");
  });

  it("should reject path traversal in custom path", () => {
    expect(() => {
      resolver.resolvePaths({
        mode: "custom",
        customBasePath: "/path/with/../traversal",
      });
    }).toThrow("contains path traversal sequences");
  });

  it("should reject relative custom path", () => {
    expect(() => {
      resolver.resolvePaths({
        mode: "custom",
        customBasePath: "relative/path",
      });
    }).toThrow("must be an absolute path");
  });

  it("should accept valid absolute custom path", () => {
    const paths = resolver.resolvePaths({
      mode: "custom",
      customBasePath: "/opt/openkraken",
    });

    expect(paths.config).toBe("/opt/openkraken/config.yaml");
    expect(paths.data).toBe("/opt/openkraken/data");
    expect(paths.logs).toBe("/opt/openkraken/logs");
    expect(paths.cache).toBe("/opt/openkraken/cache");
  });

  it("should expand tilde in custom path", () => {
    const paths = resolver.resolvePaths({
      mode: "custom",
      customBasePath: "~/my-app",
    });

    // Should expand ~ to home directory
    expect(paths.config).toContain("/my-app/config.yaml");
    expect(paths.data).toContain("/my-app/data");
  });

  it("should reject OPENKRAKEN_HOME with null bytes", () => {
    process.env.OPENKRAKEN_HOME = "/path/with\0null";

    expect(() => {
      resolver.resolvePaths();
    }).toThrow("contains null bytes");
  });

  it("should reject OPENKRAKEN_HOME with path traversal", () => {
    process.env.OPENKRAKEN_HOME = "/path/with/../traversal";

    expect(() => {
      resolver.resolvePaths();
    }).toThrow("contains path traversal sequences");
  });

  it("should accept valid OPENKRAKEN_HOME", () => {
    process.env.OPENKRAKEN_HOME = "/opt/my-app";

    const paths = resolver.resolvePaths();

    expect(paths.config).toBe("/opt/my-app/config.yaml");
    expect(paths.data).toBe("/opt/my-app/data");
  });
});
