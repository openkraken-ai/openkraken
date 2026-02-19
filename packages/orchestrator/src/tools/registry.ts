/**
 * Tool Registry
 *
 * Manages registration and lookup of agent tools.
 */

import type { Tool } from "@langchain/core/tools";
import type { ToolRegistration } from "./types.js";

/**
 * Tool registry for managing available tools
 */
export class ToolRegistry {
  private tools: Map<string, ToolRegistration> = new Map();

  /**
   * Register a new tool
   */
  register(tool: Tool, metadata?: Record<string, unknown>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, {
      tool,
      enabled: true,
      metadata,
    });
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    const registration = this.tools.get(name);
    return registration?.enabled ? registration.tool : undefined;
  }

  /**
   * List all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values())
      .filter((r) => r.enabled)
      .map((r) => r.tool);
  }

  /**
   * Enable or disable a tool
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const registration = this.tools.get(name);
    if (!registration) {
      return false;
    }
    registration.enabled = enabled;
    return true;
  }

  /**
   * Check if a tool exists and is enabled
   */
  has(name: string): boolean {
    const registration = this.tools.get(name);
    return registration !== undefined && registration.enabled;
  }

  /**
   * Check if a tool is registered (regardless of enabled state)
   */
  isRegistered(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Check if a tool is enabled
   */
  isEnabled(name: string): boolean {
    const registration = this.tools.get(name);
    return registration?.enabled ?? false;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get tool count
   */
  size(): number {
    return Array.from(this.tools.values()).filter((r) => r.enabled).length;
  }
}

/**
 * Create a new tool registry instance
 */
export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
