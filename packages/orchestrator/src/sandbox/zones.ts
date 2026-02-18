/**
 * OpenKraken Sandbox Zones
 *
 * Zone factory for creating sandbox zone mounts.
 * Per PRD/TechSpec:
 * - skills: Read-only, contains skill definitions
 * - inputs: Read-only, owner-provided data
 * - work: Read-write, ephemeral, cleared at session boundary
 * - outputs: Read-write, ephemeral, cleared at session boundary
 */

import { mkdir } from "node:fs/promises";
import { join, normalize } from "node:path";
import {
  getDefaultHostPaths,
  type SandboxZone,
  ZONE_DEFAULTS,
  type ZoneMount,
} from "./types.js";

/**
 * Get zone mounts for the specified zones
 * Maps zone names to virtual/host path pairs
 */
export function getZoneMounts(zoneNames: SandboxZone[]): ZoneMount[] {
  const hostPaths = getDefaultHostPaths();
  return zoneNames.map((zone) => ({
    ...ZONE_DEFAULTS[zone],
    hostPath: hostPaths[zone],
  }));
}

/**
 * Get all default zone mounts
 */
export function getDefaultZoneMounts(): ZoneMount[] {
  return getZoneMounts(["skills", "inputs", "work", "outputs"]);
}

/**
 * Convert ZoneMount to Anthropic Sandbox Runtime bindMounts format
 * Runtime expects: { source: hostPath, target: virtualPath, readonly: boolean }
 */
export function toRuntimeBindMounts(zones: ZoneMount[]): Array<{
  source: string;
  target: string;
  readonly: boolean;
}> {
  return zones.map((zone) => ({
    source: zone.hostPath,
    target: zone.virtualPath,
    readonly: zone.readonly,
  }));
}

/**
 * Get zone host path from zone name
 * Respects OPENKRAKEN_HOME environment variable for development
 */
export function getZoneHostPath(zone: SandboxZone): string {
  const basePath = process.env.OPENKRAKEN_HOME || "/var/lib/openkraken";
  return join(basePath, zone);
}

/**
 * Ensure zone directories exist on the host system
 * Creates directories with appropriate permissions
 */
export async function ensureZoneDirectories(
  zones: SandboxZone[]
): Promise<void> {
  const permissions: Record<SandboxZone, number> = {
    skills: 0o755, // ro for all
    inputs: 0o755, // ro for all
    work: 0o755, // rw for owner, but managed by sandbox
    outputs: 0o755, // rw for owner, but managed by sandbox
  };

  await Promise.all(
    zones.map(async (zone) => {
      const zonePath = getZoneHostPath(zone);
      try {
        await mkdir(zonePath, { recursive: true, mode: permissions[zone] });
      } catch (error) {
        // Ignore error if directory already exists
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw error;
        }
      }
    })
  );
}

/**
 * Session cleanup - clear ephemeral zones (work, outputs)
 * Called at session boundary (midnight or configured timezone)
 * Per Architecture.md: "The Sandbox work and outputs zones are cleared at session boundaries"
 */
export async function sessionCleanup(): Promise<void> {
  const ephemeralZones: SandboxZone[] = ["work", "outputs"];

  await Promise.all(
    ephemeralZones.map(async (zone) => {
      const zonePath = getZoneHostPath(zone);
      try {
        const entries = await fs.readdir(zonePath);
        await Promise.all(
          entries.map(async (entry) => {
            const fullPath = join(zonePath, entry);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
              await fs.rm(fullPath, { recursive: true, force: true });
            } else {
              await fs.unlink(fullPath);
            }
          })
        );
      } catch (error) {
        // Directory may not exist - that's ok for first run
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    })
  );
}

/**
 * Check if a path is within any sandbox zone
 */
export function isPathInZone(targetPath: string, zones: ZoneMount[]): boolean {
  const normalizedPath = normalize(targetPath);

  for (const zone of zones) {
    const normalizedZonePath = normalize(zone.virtualPath);
    if (normalizedPath.startsWith(normalizedZonePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Get zone info for a given path
 */
export function getZoneForPath(
  targetPath: string,
  zones: ZoneMount[]
): SandboxZone | null {
  const normalizedPath = normalize(targetPath);
  let longestMatch: SandboxZone | null = null;
  let longestMatchLength = 0;

  for (const zone of zones) {
    const normalizedZonePath = normalize(zone.virtualPath);
    if (
      normalizedPath.startsWith(normalizedZonePath) &&
      normalizedZonePath.length > longestMatchLength
    ) {
      longestMatch = zone.virtualPath
        .replace("/sandbox/", "")
        .replace("/", "") as SandboxZone;
      longestMatchLength = normalizedZonePath.length;
    }
  }

  return longestMatch;
}

/**
 * Extract zone name from virtual path in a type-safe manner
 * @param virtualPath - e.g., "/sandbox/skills/"
 * @returns zone name - e.g., "skills"
 */
export function getZoneNameFromPath(virtualPath: string): SandboxZone {
  const match = virtualPath.match(/^\/sandbox\/(\w+)/);
  if (!match) {
    throw new Error(`Invalid zone path: ${virtualPath}`);
  }
  const zoneName = match[1] as SandboxZone;
  if (!["skills", "inputs", "work", "outputs"].includes(zoneName)) {
    throw new Error(`Unknown zone: ${zoneName}`);
  }
  return zoneName;
}
