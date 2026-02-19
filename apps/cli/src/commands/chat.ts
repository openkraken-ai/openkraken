/**
 * Chat Command
 *
 * Interactive TUI conversation with the agent.
 */

import type { ApiClient } from "../lib/api.js";

/**
 * Chat command options
 */
export interface ChatOptions {
  sessionId?: string;
  continuous?: boolean;
}

/**
 * Run chat command
 */
export async function runChat(api: ApiClient, options: ChatOptions = {}): Promise<void> {
  console.log("OpenKraken Chat");
  console.log("================");
  console.log("Type 'exit' to quit\n");

  // TODO: Implement proper TUI using @opentui/core
  // For now, just show a placeholder
  console.log("Chat interface not yet implemented");
  console.log("Use the web UI for interactive conversations");

  // TODO: Connect to WebSocket for streaming responses
  // TODO: Handle user input loop
  // TODO: Display messages with proper formatting
}
