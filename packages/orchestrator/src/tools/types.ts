/**
 * Tool Type Definitions
 *
 * Core type definitions for OpenKraken tools.
 */

import type { Tool } from "@langchain/core/tools";

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  name: string;
  description: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  default?: unknown;
  enum?: string[];
}

/**
 * Tool result
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Tool registration
 */
export interface ToolRegistration {
  tool: Tool;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Terminal command result
 */
export interface TerminalResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * File operations result
 */
export interface FileOperationResult {
  success: boolean;
  path?: string;
  content?: string;
  error?: string;
}

/**
 * Directory listing entry
 */
export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
}
