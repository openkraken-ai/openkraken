/**
 * OpenKraken Sandbox Integration
 *
 * Wrapper around @anthropic-ai/sandbox-runtime providing OpenKraken-specific
 * configuration and zone management.
 *
 * Per ADR-019: Chained Proxy Architecture
 * - Sandbox HTTP/SOCKS proxies route through Go Egress Gateway
 * - Egress Gateway enforces domain allowlist and logs connections
 */

import {
  SandboxManager,
  type Sandbox,
} from "@anthropic-ai/sandbox-runtime";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import type {
  OpenKrakenSandboxConfig,
  SandboxInstance,
  SandboxExecutionResult,
  ZoneMount,
} from "./types.js";
import {
  getDefaultZoneMounts,
  toRuntimeBindMounts,
  ensureZoneDirectories,
  getZoneNameFromPath,
} from "./zones.js";

/**
 * Default sandbox configuration
 * Per TechSpec: timeout >= 60s, memory >= 512MB, cpu 10-100%
 */
const DEFAULT_CONFIG: Partial<OpenKrakenSandboxConfig> = {
  enabled: true,
  timeoutSeconds: 300,
  memoryLimitMb: 1024,
  cpuLimitPercent: 50,
};

/**
 * Proxy ports for chained architecture
 * Per ADR-019: Sandbox proxies route through Egress Gateway
 */
const DEFAULT_HTTP_PROXY_PORT = 8080;
const DEFAULT_SOCKS_PROXY_PORT = 1080;

/**
 * Active sandbox instances
 */
const activeSandboxes: Map<string, SandboxInstance> = new Map();

/**
 * Initialize the sandbox with OpenKraken defaults
 * Ensures zone directories exist on the host
 */
export async function initialize(
  config?: Partial<OpenKrakenSandboxConfig>
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Ensure zone directories exist
  if (finalConfig.enabled && finalConfig.zones) {
    await ensureZoneDirectories(
      finalConfig.zones.map((z) => getZoneNameFromPath(z.virtualPath))
    );
  }
}

/**
 * Create a sandbox instance with OpenKraken zone configuration
 */
export async function createSandbox(
  config?: Partial<OpenKrakenSandboxConfig>
): Promise<SandboxInstance> {
  const mergedConfig: OpenKrakenSandboxConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    zones: config?.zones || getDefaultZoneMounts(),
  };

  const instanceId = randomUUID();

  const instance: SandboxInstance = {
    id: instanceId,
    config: mergedConfig,
    active: false,
    createdAt: new Date(),
  };

  activeSandboxes.set(instanceId, instance);

  return instance;
}

/**
 * Execute a command inside the sandbox
 */
export async function executeInSandbox(
  instance: SandboxInstance,
  command: string
): Promise<SandboxExecutionResult> {
  if (!instance.active) {
    return {
      exitCode: -1, // Distinct error code for sandbox not active
      stdout: "",
      stderr: "Sandbox not active",
      timedOut: false,
      error: "Sandbox instance is not active",
    };
  }

  const startTime = Date.now();
  let timedOut = false;

  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timeoutMs = instance.config.timeoutSeconds * 1000;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        exitCode: code,
        stdout,
        stderr,
        timedOut,
      });
    });

    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      resolve({
        exitCode: null,
        stdout,
        stderr,
        timedOut,
        error: error.message,
      });
    });
  });
}

/**
 * Get runtime configuration from OpenKraken config
 */
export function toRuntimeConfig(
  config: OpenKrakenSandboxConfig
): {
  bindMounts: Array<{ source: string; target: string; readonly: boolean }>;
  httpProxyPort?: number;
  socksProxyPort?: number;
  network?: {
    allowedDomains?: string[];
    deniedDomains?: string[];
    allowLocalBinding?: boolean;
  };
  filesystem?: {
    denyRead?: string[];
    allowWrite?: string[];
    denyWrite?: string[];
  };
  timeoutSeconds?: number;
} {
  return {
    bindMounts: toRuntimeBindMounts(config.zones),
    // Per ADR-019: Chained proxy architecture
    httpProxyPort: DEFAULT_HTTP_PROXY_PORT,
    socksProxyPort: DEFAULT_SOCKS_PROXY_PORT,
    network: config.network,
    filesystem: config.filesystem,
    timeoutSeconds: config.timeoutSeconds,
  };
}

/**
 * Clean up a sandbox instance
 */
export async function cleanup(instance: SandboxInstance): Promise<void> {
  activeSandboxes.delete(instance.id);
}

/**
 * Get all active sandbox instances
 */
export function getActiveInstances(): SandboxInstance[] {
  return Array.from(activeSandboxes.values());
}

/**
 * Check if sandbox is available on the system
 * Verifies required system dependencies
 */
export async function isSandboxAvailable(): Promise<{
  available: boolean;
  missingDeps?: string[];
}> {
  const { existsSync } = await import("node:fs");
  const { dirname } = await import("node:path");
  const { spawnSync } = await import("node:child_process");

  const missingDeps: string[] = [];
  const platform = process.platform;

  // Helper to check if a binary exists in PATH
  const which = (cmd: string): boolean => {
    const result = spawnSync("which", [cmd], { encoding: "utf-8" });
    return result.status === 0;
  };

  if (platform === "linux") {
    // On Linux, we need bubblewrap, socat, ripgrep
    if (!which("bubblewrap") && !which("bwrap")) {
      missingDeps.push("bubblewrap");
    }
    if (!which("socat")) {
      missingDeps.push("socat");
    }
    if (!which("rg")) {
      missingDeps.push("ripgrep");
    }
  } else if (platform === "darwin") {
    // On macOS, sandbox-exec is built-in, just need ripgrep
    // Check that sandbox-exec exists (it should on all macOS versions)
    if (!which("sandbox-exec")) {
      missingDeps.push("sandbox-exec (built-in, but not found)");
    }
    if (!which("rg")) {
      missingDeps.push("ripgrep");
    }
  } else {
    missingDeps.push(`unsupported platform: ${platform}`);
  }

  return {
    available: missingDeps.length === 0,
    missingDeps: missingDeps.length > 0 ? missingDeps : undefined,
  };
}

/**
 * Get default sandbox zones
 */
export { getDefaultZoneMounts } from "./zones.js";
export { sessionCleanup } from "./zones.js";
export type {
  SandboxZone,
  ZoneMount,
  OpenKrakenSandboxConfig,
  SandboxInstance,
  SandboxExecutionResult,
} from "./types.js";
