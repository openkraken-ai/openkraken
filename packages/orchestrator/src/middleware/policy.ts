/**
 * Policy Middleware
 *
 * Security policy enforcement middleware.
 */

import { z } from "zod";
import type { PolicyMiddlewareConfig, MiddlewareState, MiddlewareContext } from "./types.js";
import { createOpenKrakenMiddleware } from "./framework.js";

/**
 * Policy middleware state schema
 */
const PolicyStateSchema = z.object({
  requestCount: z.number().default(0),
  windowStart: z.number().default(() => Date.now()),
  blocked: z.boolean().default(false),
});

/**
 * Create policy middleware
 *
 * Enforces rate limiting and command/domain allowlisting.
 */
export function createPolicyMiddleware(config: PolicyMiddlewareConfig = {}) {
  const { rateLimit, allowedCommands = [] } = config;

  return createOpenKrakenMiddleware({
    name: "policy",
    stateSchema: PolicyStateSchema,

    hooks: {
      beforeAgent: ({ state }: { state: MiddlewareState; context: MiddlewareContext }) => {
        const s = state as { requestCount?: number; windowStart?: number; blocked?: boolean };
        
        // Check rate limiting
        if (rateLimit) {
          const now = Date.now();
          const windowMs = rateLimit.windowMs;
          const windowStart = s.windowStart ?? Date.now();

          if (now - windowStart > windowMs) {
            // Reset window
            s.windowStart = now;
            s.requestCount = 0;
          }

          s.requestCount = (s.requestCount ?? 0) + 1;

          if (s.requestCount > rateLimit.maxRequests) {
            s.blocked = true;
            throw new Error(`Rate limit exceeded: ${rateLimit.maxRequests} requests per ${windowMs}ms`);
          }
        }

        return state;
      },

      beforeModel: ({ input }: { state: MiddlewareState; context: MiddlewareContext; input: unknown }) => {
        // Check command allowlist
        if (allowedCommands.length > 0 && input && typeof input === "object") {
          const toolCalls = (input as { toolCalls?: Array<{ name: string }> }).toolCalls;
          if (toolCalls) {
            for (const toolCall of toolCalls) {
              if (!allowedCommands.includes(toolCall.name)) {
                throw new Error(`Command not allowed: ${toolCall.name}`);
              }
            }
          }
        }

        return input;
      },
    },
  });
}
