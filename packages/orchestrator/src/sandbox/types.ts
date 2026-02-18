/**
 * OpenKraken Sandbox Types
 *
 * Type definitions for the Anthropic Sandbox Runtime integration.
 * Zones and configuration align with PRD/TechSpec requirements.
 */

import type {
  SandboxRuntimeConfig,
  NetworkConfig,
  FilesystemConfig,
} from "@anthropic-ai/sandbox-runtime";

/**
 * Sandbox zones as defined in PRD and TechSpec
 */
export type SandboxZone = "skills" | "inputs" | "work" | "outputs";

/**
 * Zone mount configuration
 * Maps virtual sandbox paths to host paths with permissions
 */
export interface ZoneMount {
  /** Virtual path inside the sandbox (e.g., /sandbox/skills/) */
  virtualPath: string;
  /** Actual host path to mount */
  hostPath: string;
  /** Whether this mount is read-only */
  readonly: boolean;
}

/**
 * OpenKraken sandbox configuration
 * Extends the Anthropic Sandbox Runtime config with zone support
 */
export interface OpenKrakenSandboxConfig {
  /** Enable/disable sandbox */
  enabled: boolean;
  /** Timeout for sandboxed command execution in seconds */
  timeoutSeconds: number;
  /** Memory limit in megabytes */
  memoryLimitMb: number;
  /** CPU limit as percentage (10-100) */
  cpuLimitPercent: number;
  /** Zone mounts for filesystem isolation */
  zones: ZoneMount[];
  /** Network configuration */
  network?: {
    /** Allowed domains for HTTP/HTTPS */
    allowedDomains?: string[];
    /** Denied domains (takes precedence over allowed) */
    deniedDomains?: string[];
    /** Allow binding to local ports */
    allowLocalBinding?: boolean;
  };
  /** Filesystem configuration */
  filesystem?: {
    /** Paths to deny read access */
    denyRead?: string[];
    /** Paths to allow write access */
    allowWrite?: string[];
    /** Paths to deny write within allowed paths */
    denyWrite?: string[];
  };
}

/**
 * Zone-specific configuration defaults
 */
export const ZONE_DEFAULTS: Record<SandboxZone, Omit<ZoneMount, "hostPath">> = {
  skills: {
    virtualPath: "/sandbox/skills/",
    readonly: true,
  },
  inputs: {
    virtualPath: "/sandbox/inputs/",
    readonly: true,
  },
  work: {
    virtualPath: "/sandbox/work/",
    readonly: false,
  },
  outputs: {
    virtualPath: "/sandbox/outputs/",
    readonly: false,
  },
};

/**
 * Default zone paths on the host system
 * Per TechSpec: /var/lib/openkraken/{zone} on Linux
 * On macOS: ~/Library/Application Support/OpenKraken/{zone}
 */
export const LINUX_HOST_PATHS: Record<SandboxZone, string> = {
  skills: "/var/lib/openkraken/skills",
  inputs: "/var/lib/openkraken/inputs",
  work: "/var/lib/openkraken/work",
  outputs: "/var/lib/openkraken/outputs",
};

export const DARWIN_HOST_PATHS: Record<SandboxZone, string> = {
  skills: "~/Library/Application Support/OpenKraken/skills",
  inputs: "~/Library/Application Support/OpenKraken/inputs",
  work: "~/Library/Application Support/OpenKraken/work",
  outputs: "~/Library/Application Support/OpenKraken/outputs",
};

/**
 * Get default host paths based on platform
 * Respects OPENKRAKEN_HOME environment variable for custom data directory
 */
export function getDefaultHostPaths(): Record<SandboxZone, string> {
  const platform = process.platform;
  const basePaths = platform === "darwin" ? DARWIN_HOST_PATHS : LINUX_HOST_PATHS;

  // Allow override via OPENKRAKEN_HOME environment variable
  const homeOverride = process.env.OPENKRAKEN_HOME;
  if (homeOverride) {
    return {
      skills: `${homeOverride}/skills`,
      inputs: `${homeOverride}/inputs`,
      work: `${homeOverride}/work`,
      outputs: `${homeOverride}/outputs`,
    };
  }

  // On macOS, expand ~ to actual home directory
  if (platform === "darwin") {
    const home = process.env.HOME || "";
    return {
      skills: basePaths.skills.replace("~", home),
      inputs: basePaths.inputs.replace("~", home),
      work: basePaths.work.replace("~", home),
      outputs: basePaths.outputs.replace("~", home),
    };
  }

  return basePaths;
}

// Default export for backwards compatibility
export const DEFAULT_HOST_PATHS = LINUX_HOST_PATHS;

/**
 * Sandbox instance state
 */
export interface SandboxInstance {
  /** Unique identifier for this sandbox instance */
  id: string;
  /** Configuration used to create this sandbox */
  config: OpenKrakenSandboxConfig;
  /** Whether the sandbox is currently active */
  active: boolean;
  /** Timestamp when sandbox was created */
  createdAt: Date;
}

/**
 * Result of a sandboxed command execution
 */
export interface SandboxExecutionResult {
  /** Exit code of the command */
  exitCode: number | null;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Whether the command was killed due to timeout */
  timedOut: boolean;
  /** Error message if execution failed */
  error?: string;
}
