/**
 * Agent Type Definitions
 *
 * Core type definitions for the OpenKraken agent runtime.
 */

import type { BaseLanguageModel } from "@langchain/core/language_models/base";
import type { StructuredTool } from "@langchain/core/tools";

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Unique identifier for the agent */
  id: string;
  /** Human-readable name */
  name: string;
  /** LLM model to use */
  model: BaseLanguageModel;
  /** Tools available to the agent */
  tools: StructuredTool[];
  /** System prompt */
  systemPrompt?: string;
  /** Maximum iterations */
  maxIterations?: number;
  /** Callback handlers */
  callbacks?: AgentCallbacks;
}

/**
 * Agent runtime state
 */
export interface AgentState {
  /** Current conversation messages */
  messages: Array<{ role: string; content: string }>;
  /** Session ID for persistence */
  sessionId: string;
  /** Checkpoint metadata */
  checkpoint?: CheckpointMetadata;
  /** Custom state data */
  [key: string]: unknown;
}

/**
 * Checkpoint metadata for state persistence
 */
export interface CheckpointMetadata {
  /** Checkpoint ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Parent checkpoint ID (for versioning) */
  parentId?: string;
}

/**
 * Agent callback handlers
 */
export interface AgentCallbacks {
  onToolStart?: (tool: string, input: unknown) => void;
  onToolEnd?: (tool: string, output: unknown) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: { role: string; content: string }) => void;
}

/**
 * Agent checkpointer interface
 */
export interface AgentCheckpointer {
  get(threadId: string): Promise<unknown>;
  put(threadId: string, checkpoint: unknown): Promise<void>;
}
