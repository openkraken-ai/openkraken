/**
 * Agent Creation
 *
 * LangChain agent initialization for OpenKraken.
 */

import type { AgentConfig, AgentState, AgentCheckpointer } from "./types";

/**
 * OpenKraken agent runtime
 */
export interface AgentRuntime {
  /** Get current state */
  getState(): AgentState;
  /** Invoke with input */
  invoke(input: string): Promise<string>;
  /** Get available tools */
  getTools(): unknown[];
}

/**
 * Create an OpenKraken agent runtime
 *
 * @param options - Agent creation options
 * @returns Configured agent runtime
 */
export function createAgentRuntime(
  options: {
    config: AgentConfig;
    checkpointer?: AgentCheckpointer;
  },
): AgentRuntime {
  const { config, checkpointer: _checkpointer } = options;

  // TODO: Implement actual agent creation using LangChain
  // For now, return a stub runtime
  return {
    getState: () => ({
      messages: [],
      sessionId: config.id,
    }),
    invoke: (input: string): Promise<string> => {
      // TODO: Implement actual agent invocation
      console.log("Agent invoke:", input);
      return Promise.resolve("Agent response not yet implemented");
    },
    getTools: () => config.tools,
  };
}

/**
 * Default system prompt for OpenKraken agents
 */
export const DEFAULT_SYSTEM_PROMPT = `You are OpenKraken, a secure AI assistant running in a sandboxed environment.
You have access to a set of tools that allow you to interact with the outside world.
Always prioritize security and follow the guidelines provided by the owner.`;
