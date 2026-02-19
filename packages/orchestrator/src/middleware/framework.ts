/**
 * Middleware Framework
 *
 * Middleware composition framework for OpenKraken.
 */

import { z } from "zod";
import type { MiddlewareState, MiddlewareContext } from "./types.js";

/**
 * Default middleware state schema
 */
export const MiddlewareStateSchema = z.object({
  requestCount: z.number().default(0),
  lastRequestTime: z.number().default(0),
  blocked: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

/**
 * Default middleware context schema
 */
export const MiddlewareContextSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  timestamp: z.number().default(() => Date.now()),
});

/**
 * Middleware hook functions
 */
export interface MiddlewareHooks {
  beforeAgent?: (params: { state: MiddlewareState; context: MiddlewareContext }) => MiddlewareState | Promise<MiddlewareState>;
  beforeModel?: (params: { state: MiddlewareState; context: MiddlewareContext; input: unknown }) => unknown | Promise<unknown>;
  afterModel?: (params: { state: MiddlewareState; context: MiddlewareContext; output: unknown }) => MiddlewareState | Promise<MiddlewareState>;
  afterAgent?: (params: { state: MiddlewareState; context: MiddlewareContext; output: unknown }) => MiddlewareState | Promise<MiddlewareState>;
}

/**
 * OpenKraken middleware definition
 */
export interface OpenKrakenMiddleware {
  name: string;
  hooks: MiddlewareHooks;
  stateSchema?: z.ZodType<MiddlewareState>;
  contextSchema?: z.ZodType<MiddlewareContext>;
}

/**
 * Create a middleware with standard OpenKraken configuration
 */
export function createOpenKrakenMiddleware(
  options: {
    name: string;
    hooks: MiddlewareHooks;
    stateSchema?: z.ZodType<MiddlewareState>;
    contextSchema?: z.ZodType<MiddlewareContext>;
  },
): OpenKrakenMiddleware {
  return options;
}

/**
 * Middleware composition utility
 */
export class MiddlewareFramework {
  private middleware: Array<{
    name: string;
    priority: number;
    enabled: boolean;
  }> = [];

  /**
   * Add middleware to the framework
   */
  use(name: string, priority = 100): this {
    this.middleware.push({ name, priority, enabled: true });
    this.middleware.sort((a, b) => a.priority - b.priority);
    return this;
  }

  /**
   * Remove middleware from the framework
   */
  remove(name: string): this {
    this.middleware = this.middleware.filter((m) => m.name !== name);
    return this;
  }

  /**
   * Enable or disable middleware
   */
  setEnabled(name: string, enabled: boolean): this {
    const middleware = this.middleware.find((m) => m.name === name);
    if (middleware) {
      middleware.enabled = enabled;
    }
    return this;
  }

  /**
   * Get ordered middleware list
   */
  getMiddleware(): Array<{ name: string; priority: number; enabled: boolean }> {
    return [...this.middleware];
  }
}

/**
 * Create a new middleware framework
 */
export function createMiddlewareFramework(): MiddlewareFramework {
  return new MiddlewareFramework();
}
