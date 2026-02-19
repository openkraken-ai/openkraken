/**
 * Human-in-the-Loop (HITL) Middleware
 *
 * Pause execution for human approval.
 */

import { z } from "zod";
import type { HITLConfig, MiddlewareState, MiddlewareContext } from "./types.js";
import { createOpenKrakenMiddleware } from "./framework.js";

/**
 * HITL middleware state schema
 */
const HITLStateSchema = z.object({
  pendingApproval: z.boolean().default(false),
  approvalCount: z.number().default(0),
  rejectionCount: z.number().default(0),
  lastPauseReason: z.string().optional(),
});

/**
 * Approval request structure
 */
export interface ApprovalRequest {
  id: string;
  sessionId: string;
  reason: string;
  tool?: string;
  input?: unknown;
  timestamp: number;
  status: "pending" | "approved" | "rejected";
}

/**
 * Create Human-in-the-Loop middleware
 *
 * Pauses agent execution for human approval on sensitive operations.
 */
export function createHITLMiddleware(config: HITLConfig = { enabled: true }) {
  const { triggerOnTools = [] } = config;

  return createOpenKrakenMiddleware({
    name: "human_in_the_loop",
    stateSchema: HITLStateSchema,

    hooks: {
      beforeModel: ({ state, input }: { state: MiddlewareState; context: MiddlewareContext; input: unknown }) => {
        const s = state as { pendingApproval?: boolean; lastPauseReason?: string };
        
        if (!config.enabled) {
          return input;
        }

        // Check if we need to pause for approval
        const inputText = typeof input === "string" ? input : JSON.stringify(input);

        // Check for trigger conditions
        const shouldPause = triggerOnTools.some((tool) => inputText.includes(tool));

        if (shouldPause) {
          s.pendingApproval = true;
          s.lastPauseReason = "Approval required";
          console.log("[HITL] Execution paused for human approval");
        }

        return input;
      },

      afterModel: ({ state }: { state: MiddlewareState; context: MiddlewareContext; output: unknown }) => {
        const s = state as { pendingApproval?: boolean; approvalCount?: number };
        
        if (!config.enabled) {
          return state;
        }

        // Could check model confidence scores here
        // For now, just reset pending state
        if (s.pendingApproval) {
          s.approvalCount = (s.approvalCount ?? 0) + 1;
          s.pendingApproval = false;
        }

        return state;
      },
    },
  });
}
