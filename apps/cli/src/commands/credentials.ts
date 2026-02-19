/**
 * Credentials Command
 *
 * Credential management.
 */

import type { ApiClient } from "../lib/api.js";

/**
 * Credentials command action
 */
export type CredentialsAction = "list" | "add" | "remove";

/**
 * Run credentials command
 */
export async function runCredentials(
  api: ApiClient,
  action: CredentialsAction,
  name?: string,
): Promise<void> {
  switch (action) {
    case "list": {
      const result = await api.getCredentials();
      if (result.success && result.data) {
        if (result.data.length === 0) {
          console.log("No credentials stored");
        } else {
          console.log("Stored credentials:");
          for (const cred of result.data) {
            console.log(`  - ${cred}`);
          }
        }
      } else {
        console.error("Failed to list credentials:", result.error);
      }
      break;
    }

    case "add": {
      if (!name) {
        console.error("Error: credential name is required for 'add' action");
        return;
      }
      console.log(`Adding credential: ${name}`);
      console.log("Credential addition not yet implemented");
      // TODO: Prompt for credential value securely
      break;
    }

    case "remove": {
      if (!name) {
        console.error("Error: credential name is required for 'remove' action");
        return;
      }
      console.log(`Removing credential: ${name}`);
      console.log("Credential removal not yet implemented");
      break;
    }

    default: {
      console.log(`Unknown action: ${action}`);
    }
  }
}
