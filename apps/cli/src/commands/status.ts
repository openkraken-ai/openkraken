/**
 * Status Command
 *
 * System health and diagnostics.
 */

import type { ApiClient } from "../lib/api.js";

/**
 * Run status command
 */
export async function runStatus(api: ApiClient): Promise<void> {
  console.log("OpenKraken System Status");
  console.log("=======================\n");

  // Check health
  const health = await api.health();
  if (health.success && health.data) {
    console.log(`Health: ${health.data.status}`);
  } else {
    console.log("Health: Unknown (orchestrator not reachable)");
  }

  // Check detailed status
  const status = await api.status();
  if (status.success && status.data) {
    console.log(`Status: ${status.data.status}`);
    console.log(`Uptime: ${formatUptime(status.data.uptime)}`);
  } else {
    console.log("Status: Unknown");
  }

  console.log("\n--- Additional Diagnostics ---");

  // TODO: Add more diagnostics
  // - Database connectivity
  // - Credential vault status
  // - Sandbox status
  // - Middleware health
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
