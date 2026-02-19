/**
 * CLI Commands Index
 *
 * Command registry and dispatcher.
 */

import type { ApiClient } from "../lib/api.js";
import { runChat, type ChatOptions } from "./chat.js";
import { runConfig, type ConfigAction } from "./config.js";
import { runStatus } from "./status.js";
import { runCredentials, type CredentialsAction } from "./credentials.js";
import { runLogs, type LogsOptions } from "./logs.js";

/**
 * Command definitions
 */
export interface Command {
  name: string;
  description: string;
  execute: (api: ApiClient, ...args: string[]) => Promise<void>;
}

/**
 * Available commands
 */
export const commands: Record<string, Command> = {
  chat: {
    name: "chat",
    description: "Start an interactive conversation with the agent",
    execute: async (api: ApiClient, ...args: string[]) => {
      const options: ChatOptions = {};
      // TODO: Parse options
      await runChat(api, options);
    },
  },

  config: {
    name: "config",
    description: "Manage configuration (list, get, set, delete)",
    execute: async (api: ApiClient, ...args: string[]) => {
      const [action, key, value] = args as [ConfigAction, string, string];
      await runConfig(api, action, key, value);
    },
  },

  status: {
    name: "status",
    description: "Show system health and diagnostics",
    execute: async (api: ApiClient) => {
      await runStatus(api);
    },
  },

  credentials: {
    name: "credentials",
    description: "Manage credentials (list, add, remove)",
    execute: async (api: ApiClient, ...args: string[]) => {
      const [action, name] = args as [CredentialsAction, string];
      await runCredentials(api, action, name);
    },
  },

  logs: {
    name: "logs",
    description: "View observability logs",
    execute: async (api: ApiClient, ...args: string[]) => {
      const options: LogsOptions = {};
      // TODO: Parse options like --level, --limit
      await runLogs(api, options);
    },
  },
};

/**
 * Get command help text
 */
export function getHelp(): string {
  const lines = ["Available commands:", ""];
  for (const cmd of Object.values(commands)) {
    lines.push(`  ${cmd.name.padEnd(15)} - ${cmd.description}`);
  }
  return lines.join("\n");
}
