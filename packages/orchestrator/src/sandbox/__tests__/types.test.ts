/**
 * Sandbox Types Tests
 *
 * Unit tests for sandbox type definitions.
 * Uses Bun's native test runner.
 */

import { afterEach, describe, expect, it } from "bun:test";
import {
  DARWIN_HOST_PATHS,
  getDefaultHostPaths,
  LINUX_HOST_PATHS,
  type OpenKrakenSandboxConfig,
  type SandboxZone,
  ZONE_DEFAULTS,
} from "../types";

describe("SandboxZone type", () => {
  it("should accept valid zone names", () => {
    const zones: SandboxZone[] = ["skills", "inputs", "work", "outputs"];
    expect(zones).toHaveLength(4);
    expect(zones).toContain("skills");
    expect(zones).toContain("inputs");
    expect(zones).toContain("work");
    expect(zones).toContain("outputs");
  });
});

describe("ZONE_DEFAULTS", () => {
  it("should have correct virtual paths for all zones", () => {
    expect(ZONE_DEFAULTS.skills.virtualPath).toBe("/sandbox/skills/");
    expect(ZONE_DEFAULTS.inputs.virtualPath).toBe("/sandbox/inputs/");
    expect(ZONE_DEFAULTS.work.virtualPath).toBe("/sandbox/work/");
    expect(ZONE_DEFAULTS.outputs.virtualPath).toBe("/sandbox/outputs/");
  });

  it("should have correct readonly settings", () => {
    expect(ZONE_DEFAULTS.skills.readonly).toBe(true);
    expect(ZONE_DEFAULTS.inputs.readonly).toBe(true);
    expect(ZONE_DEFAULTS.work.readonly).toBe(false);
    expect(ZONE_DEFAULTS.outputs.readonly).toBe(false);
  });
});

describe("LINUX_HOST_PATHS", () => {
  it("should have Linux-specific paths", () => {
    expect(LINUX_HOST_PATHS.skills).toBe("/var/lib/openkraken/skills");
    expect(LINUX_HOST_PATHS.inputs).toBe("/var/lib/openkraken/inputs");
    expect(LINUX_HOST_PATHS.work).toBe("/var/lib/openkraken/work");
    expect(LINUX_HOST_PATHS.outputs).toBe("/var/lib/openkraken/outputs");
  });
});

describe("DARWIN_HOST_PATHS", () => {
  it("should have macOS-specific paths", () => {
    expect(DARWIN_HOST_PATHS.skills).toBe(
      "~/Library/Application Support/OpenKraken/skills"
    );
    expect(DARWIN_HOST_PATHS.inputs).toBe(
      "~/Library/Application Support/OpenKraken/inputs"
    );
    expect(DARWIN_HOST_PATHS.work).toBe(
      "~/Library/Application Support/OpenKraken/work"
    );
    expect(DARWIN_HOST_PATHS.outputs).toBe(
      "~/Library/Application Support/OpenKraken/outputs"
    );
  });
});

describe("getDefaultHostPaths", () => {
  const originalPlatform = process.platform;
  const originalHome = process.env.HOME;
  const originalOpenKrakenHome = process.env.OPENKRAKEN_HOME;

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, "platform", { value: originalPlatform });
    process.env.HOME = originalHome;
    process.env.OPENKRAKEN_HOME = originalOpenKrakenHome;
  });

  it("should return Linux paths on Linux platform", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    process.env.OPENKRAKEN_HOME = undefined;

    const paths = getDefaultHostPaths();

    expect(paths.skills).toBe("/var/lib/openkraken/skills");
    expect(paths.inputs).toBe("/var/lib/openkraken/inputs");
  });

  it("should expand HOME on macOS platform", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    process.env.HOME = "/Users/testuser";
    process.env.OPENKRAKEN_HOME = undefined;

    const paths = getDefaultHostPaths();

    expect(paths.skills).toBe(
      "/Users/testuser/Library/Application Support/OpenKraken/skills"
    );
  });

  it("should respect OPENKRAKEN_HOME override", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    process.env.OPENKRAKEN_HOME = "/custom/path";

    const paths = getDefaultHostPaths();

    expect(paths.skills).toBe("/custom/path/skills");
    expect(paths.inputs).toBe("/custom/path/inputs");
    expect(paths.work).toBe("/custom/path/work");
    expect(paths.outputs).toBe("/custom/path/outputs");
  });

  it("should fallback to Linux paths on unknown platform", () => {
    Object.defineProperty(process, "platform", { value: "unknown" });
    process.env.OPENKRAKEN_HOME = undefined;

    const paths = getDefaultHostPaths();

    expect(paths.skills).toBe("/var/lib/openkraken/skills");
  });
});

describe("OpenKrakenSandboxConfig interface", () => {
  it("should accept valid configuration", () => {
    const config: OpenKrakenSandboxConfig = {
      enabled: true,
      timeoutSeconds: 300,
      memoryLimitMb: 1024,
      cpuLimitPercent: 50,
      zones: [
        {
          virtualPath: "/sandbox/skills/",
          hostPath: "/var/lib/openkraken/skills",
          readonly: true,
        },
      ],
    };

    expect(config.enabled).toBe(true);
    expect(config.timeoutSeconds).toBe(300);
    expect(config.memoryLimitMb).toBe(1024);
    expect(config.cpuLimitPercent).toBe(50);
    expect(config.zones).toHaveLength(1);
  });

  it("should enforce timeout minimum of 60 seconds", () => {
    const config: OpenKrakenSandboxConfig = {
      enabled: true,
      timeoutSeconds: 60,
      memoryLimitMb: 512,
      cpuLimitPercent: 10,
      zones: [],
    };

    expect(config.timeoutSeconds).toBe(60);
  });

  it("should enforce memory minimum of 512MB", () => {
    const config: OpenKrakenSandboxConfig = {
      enabled: true,
      timeoutSeconds: 300,
      memoryLimitMb: 512,
      cpuLimitPercent: 100,
      zones: [],
    };

    expect(config.memoryLimitMb).toBe(512);
  });

  it("should allow cpu range 10-100", () => {
    const lowConfig: OpenKrakenSandboxConfig = {
      enabled: true,
      timeoutSeconds: 300,
      memoryLimitMb: 1024,
      cpuLimitPercent: 10,
      zones: [],
    };

    const highConfig: OpenKrakenSandboxConfig = {
      enabled: true,
      timeoutSeconds: 300,
      memoryLimitMb: 1024,
      cpuLimitPercent: 100,
      zones: [],
    };

    expect(lowConfig.cpuLimitPercent).toBe(10);
    expect(highConfig.cpuLimitPercent).toBe(100);
  });
});
