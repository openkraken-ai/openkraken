/**
 * Logs Command
 *
 * Observability data retrieval.
 */

import type { ApiClient } from "../lib/api.js";

/**
 * Logs command options
 */
export interface LogsOptions {
  limit?: number;
  level?: string;
}

/**
 * Run logs command
 */
export async function runLogs(api: ApiClient, options: LogsOptions = {}): Promise<void> {
  console.log("OpenKraken Logs");
  console.log("==============\n");

  const result = await api.getLogs(options);

  if (result.success && result.data) {
    if (result.data.length === 0) {
      console.log("No logs available");
      return;
    }

    for (const log of result.data) {
      const timestamp = new Date(log.timestamp).toISOString();
      const level = log.level.padEnd(5);
      console.log(`[${timestamp}] ${level} ${log.message}`);
    }

    console.log(`\nTotal: ${result.data.length} log entries`);
  } else {
    console.error("Failed to fetch logs:", result.error);
  }
}
