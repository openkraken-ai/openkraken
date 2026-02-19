/**
 * Summarization Middleware
 *
 * Message summarization middleware.
 */

import { z } from "zod";
import type { MiddlewareState, MiddlewareContext } from "./types.js";
import { createOpenKrakenMiddleware } from "./framework.js";

/**
 * Summarization middleware state schema
 */
const SummarizationStateSchema = z.object({
  messageCount: z.number().default(0),
  summaryCount: z.number().default(0),
  lastSummaryLength: z.number().default(0),
});

/**
 * Create summarization middleware
 *
 * Summarizes long message histories to manage context window.
 */
export function createSummarizationMiddleware(options: { maxLength?: number; strategy?: "truncate" | "extract" | "compress" } = {}) {
  const { maxLength: _maxLength = 2000, strategy: _strategy = "truncate" } = options;

  return createOpenKrakenMiddleware({
    name: "summarization",
    stateSchema: SummarizationStateSchema,

    hooks: {
      beforeAgent: ({ state, context }: { state: MiddlewareState; context: MiddlewareContext }) => {
        const s = state as { messageCount?: number; summaryCount?: number };
        const threshold = (context as { threshold?: number }).threshold ?? 10;

        if ((s.messageCount ?? 0) >= threshold) {
          // TODO: Use LLM for intelligent summarization
          // For now, just reset the counter
          s.summaryCount = (s.summaryCount ?? 0) + 1;
          s.messageCount = 0;
          console.log(`[Summarization] Summary ${s.summaryCount} triggered`);
        }

        return state;
      },

      afterAgent: ({ state, output }: { state: MiddlewareState; context: MiddlewareContext; output: unknown }) => {
        const s = state as { lastSummaryLength?: number };
        
        // Track output length
        if (typeof output === "string") {
          s.lastSummaryLength = output.length;
        }

        return state;
      },
    },
  });
}
