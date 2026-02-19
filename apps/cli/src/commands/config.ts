/**
 * Config Command
 *
 * Configuration management for OpenKraken.
 */

import type { ApiClient } from "../lib/api.js";

/**
 * Config command action
 */
export type ConfigAction = "get" | "set" | "list" | "delete";

/**
 * Run config command
 */
export async function runConfig(
  api: ApiClient,
  action: ConfigAction,
  key?: string,
  value?: string,
): Promise<void> {
  switch (action) {
    case "list": {
      const result = await api.getConfig();
      if (result.success && result.data) {
        console.log("Current configuration:");
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.error("Failed to get config:", result.error);
      }
      break;
    }

    case "get": {
      if (!key) {
        console.error("Error: key is required for 'get' action");
        return;
      }
      const result = await api.getConfig();
      if (result.success && result.data) {
        const value = result.data[key];
        if (value !== undefined) {
          console.log(`${key} = ${JSON.stringify(value)}`);
        } else {
          console.log(`Key '${key}' not found`);
        }
      } else {
        console.error("Failed to get config:", result.error);
      }
      break;
    }

    case "set": {
      if (!key || value === undefined) {
        console.error("Error: key and value are required for 'set' action");
        return;
      }
      const parsedValue = JSON.parse(value);
      const result = await api.setConfig(key, parsedValue);
      if (result.success) {
        console.log(`Configuration updated: ${key} = ${value}`);
      } else {
        console.error("Failed to set config:", result.error);
      }
      break;
    }

    case "delete": {
      console.log("Delete action not yet implemented");
      break;
    }

    default: {
      console.log(`Unknown action: ${action}`);
    }
  }
}
