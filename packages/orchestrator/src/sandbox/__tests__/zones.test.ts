/**
 * Sandbox Zones Tests
 *
 * Unit tests for sandbox zone factory functions.
 * Uses Bun's native test runner.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { SandboxZone, ZoneMount } from "../types";
import {
  getDefaultZoneMounts,
  getZoneForPath,
  getZoneHostPath,
  getZoneMounts,
  getZoneNameFromPath,
  isPathInZone,
  toRuntimeBindMounts,
} from "../zones";

describe("getZoneMounts", () => {
  const originalPlatform = process.platform;
  const originalHome = process.env.HOME;
  const originalOpenKrakenHome = process.env.OPENKRAKEN_HOME;

  beforeEach(() => {
    Object.defineProperty(process, "platform", { value: "linux" });
    process.env.HOME = "/home/testuser";
    process.env.OPENKRAKEN_HOME = undefined;
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    process.env.HOME = originalHome;
    process.env.OPENKRAKEN_HOME = originalOpenKrakenHome;
  });

  it("should return mounts for specified zones", () => {
    const mounts = getZoneMounts(["skills", "inputs"]);

    expect(mounts).toHaveLength(2);
    expect(mounts[0].virtualPath).toBe("/sandbox/skills/");
    expect(mounts[0].hostPath).toBe("/var/lib/openkraken/skills");
    expect(mounts[0].readonly).toBe(true);

    expect(mounts[1].virtualPath).toBe("/sandbox/inputs/");
    expect(mounts[1].hostPath).toBe("/var/lib/openkraken/inputs");
    expect(mounts[1].readonly).toBe(true);
  });

  it("should include all zone properties", () => {
    const mounts = getZoneMounts(["work"]);

    expect(mounts[0]).toHaveProperty("virtualPath");
    expect(mounts[0]).toHaveProperty("hostPath");
    expect(mounts[0]).toHaveProperty("readonly");
  });
});

describe("getDefaultZoneMounts", () => {
  const originalPlatform = process.platform;
  const originalHome = process.env.HOME;
  const originalOpenKrakenHome = process.env.OPENKRAKEN_HOME;

  beforeEach(() => {
    Object.defineProperty(process, "platform", { value: "linux" });
    process.env.HOME = "/home/testuser";
    process.env.OPENKRAKEN_HOME = undefined;
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    process.env.HOME = originalHome;
    process.env.OPENKRAKEN_HOME = originalOpenKrakenHome;
  });

  it("should return all four default zones", () => {
    const mounts = getDefaultZoneMounts();

    expect(mounts).toHaveLength(4);

    const zoneNames = mounts.map((m) =>
      m.virtualPath.replace("/sandbox/", "").replace("/", "")
    );
    expect(zoneNames).toContain("skills");
    expect(zoneNames).toContain("inputs");
    expect(zoneNames).toContain("work");
    expect(zoneNames).toContain("outputs");
  });

  it("should have correct readonly settings for each zone", () => {
    const mounts = getDefaultZoneMounts();

    const skills = mounts.find((m) => m.virtualPath.includes("skills"));
    const inputs = mounts.find((m) => m.virtualPath.includes("inputs"));
    const work = mounts.find((m) => m.virtualPath.includes("work"));
    const outputs = mounts.find((m) => m.virtualPath.includes("outputs"));

    expect(skills?.readonly).toBe(true);
    expect(inputs?.readonly).toBe(true);
    expect(work?.readonly).toBe(false);
    expect(outputs?.readonly).toBe(false);
  });
});

describe("toRuntimeBindMounts", () => {
  it("should convert ZoneMount to runtime format", () => {
    const zones: ZoneMount[] = [
      {
        virtualPath: "/sandbox/skills/",
        hostPath: "/var/lib/openkraken/skills",
        readonly: true,
      },
      {
        virtualPath: "/sandbox/work/",
        hostPath: "/var/lib/openkraken/work",
        readonly: false,
      },
    ];

    const runtimeMounts = toRuntimeBindMounts(zones);

    expect(runtimeMounts).toHaveLength(2);
    expect(runtimeMounts[0]).toEqual({
      source: "/var/lib/openkraken/skills",
      target: "/sandbox/skills/",
      readonly: true,
    });
    expect(runtimeMounts[1]).toEqual({
      source: "/var/lib/openkraken/work",
      target: "/sandbox/work/",
      readonly: false,
    });
  });

  it("should map correct property names", () => {
    const zones: ZoneMount[] = [
      {
        virtualPath: "/sandbox/inputs/",
        hostPath: "/data/inputs",
        readonly: true,
      },
    ];

    const runtimeMounts = toRuntimeBindMounts(zones);

    expect(runtimeMounts[0]).toHaveProperty("source");
    expect(runtimeMounts[0]).toHaveProperty("target");
    expect(runtimeMounts[0]).toHaveProperty("readonly");
  });
});

describe("getZoneHostPath", () => {
  const originalOpenKrakenHome = process.env.OPENKRAKEN_HOME;

  beforeEach(() => {
    process.env.OPENKRAKEN_HOME = undefined;
  });

  afterEach(() => {
    process.env.OPENKRAKEN_HOME = originalOpenKrakenHome;
  });

  it("should return default path when no override", () => {
    const path = getZoneHostPath("skills");
    expect(path).toBe("/var/lib/openkraken/skills");
  });

  it("should respect OPENKRAKEN_HOME override", () => {
    process.env.OPENKRAKEN_HOME = "/custom/path";

    const path = getZoneHostPath("work");
    expect(path).toBe("/custom/path/work");
  });

  it("should work for all zone types", () => {
    const zones: SandboxZone[] = ["skills", "inputs", "work", "outputs"];

    for (const zone of zones) {
      const path = getZoneHostPath(zone);
      expect(path).toBe(`/var/lib/openkraken/${zone}`);
    }
  });
});

describe("isPathInZone", () => {
  const zones: ZoneMount[] = [
    {
      virtualPath: "/sandbox/skills/",
      hostPath: "/var/lib/openkraken/skills",
      readonly: true,
    },
    {
      virtualPath: "/sandbox/work/",
      hostPath: "/var/lib/openkraken/work",
      readonly: false,
    },
  ];

  it("should return true for path inside a zone", () => {
    expect(isPathInZone("/sandbox/skills/file.ts", zones)).toBe(true);
    expect(isPathInZone("/sandbox/work/temp.txt", zones)).toBe(true);
    expect(isPathInZone("/sandbox/skills/nested/deep/file.ts", zones)).toBe(
      true
    );
  });

  it("should return false for path outside zones", () => {
    expect(isPathInZone("/etc/passwd", zones)).toBe(false);
    expect(isPathInZone("/home/user/file.ts", zones)).toBe(false);
    expect(isPathInZone("/sandbox/other/file.ts", zones)).toBe(false);
  });

  it("should handle normalized paths", () => {
    // /sandbox/skills/../work/file.ts normalizes to /sandbox/work/file.ts, which IS in work zone
    expect(isPathInZone("/sandbox/skills/../work/file.ts", zones)).toBe(true);
    expect(isPathInZone("/sandbox/skills/./file.ts", zones)).toBe(true);
  });
});

describe("getZoneForPath", () => {
  const zones: ZoneMount[] = [
    {
      virtualPath: "/sandbox/skills/",
      hostPath: "/var/lib/openkraken/skills",
      readonly: true,
    },
    {
      virtualPath: "/sandbox/work/",
      hostPath: "/var/lib/openkraken/work",
      readonly: false,
    },
    {
      virtualPath: "/sandbox/inputs/",
      hostPath: "/var/lib/openkraken/inputs",
      readonly: true,
    },
  ];

  it("should return correct zone for path", () => {
    expect(getZoneForPath("/sandbox/skills/file.ts", zones)).toBe("skills");
    expect(getZoneForPath("/sandbox/work/temp.txt", zones)).toBe("work");
    expect(getZoneForPath("/sandbox/inputs/data.json", zones)).toBe("inputs");
  });

  it("should return null for path outside zones", () => {
    expect(getZoneForPath("/etc/passwd", zones)).toBeNull();
    expect(getZoneForPath("/sandbox/other/file.ts", zones)).toBeNull();
  });

  it("should return longest match for nested paths", () => {
    const nestedZones: ZoneMount[] = [
      {
        virtualPath: "/sandbox/",
        hostPath: "/var/lib/openkraken",
        readonly: false,
      },
      {
        virtualPath: "/sandbox/skills/",
        hostPath: "/var/lib/openkraken/skills",
        readonly: true,
      },
    ];

    expect(getZoneForPath("/sandbox/skills/file.ts", nestedZones)).toBe(
      "skills"
    );
  });
});

describe("getZoneNameFromPath", () => {
  it("should extract zone name from valid paths", () => {
    expect(getZoneNameFromPath("/sandbox/skills/")).toBe("skills");
    expect(getZoneNameFromPath("/sandbox/inputs/")).toBe("inputs");
    expect(getZoneNameFromPath("/sandbox/work/")).toBe("work");
    expect(getZoneNameFromPath("/sandbox/outputs/")).toBe("outputs");
  });

  it("should throw for invalid paths", () => {
    expect(() => getZoneNameFromPath("/invalid/path")).toThrow();
    expect(() => getZoneNameFromPath("/sandbox/unknown/")).toThrow();
    expect(() => getZoneNameFromPath("")).toThrow();
  });

  it("should handle paths without trailing slash", () => {
    expect(getZoneNameFromPath("/sandbox/skills")).toBe("skills");
  });
});
