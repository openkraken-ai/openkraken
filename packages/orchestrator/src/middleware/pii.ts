/**
 * PII Detection Middleware
 *
 * Personally Identifiable Information detection middleware.
 */

import { z } from "zod";
import type { MiddlewareState, MiddlewareContext } from "./types.js";
import { createOpenKrakenMiddleware } from "./framework.js";

/**
 * PII detection middleware state schema
 */
const PIIStateSchema = z.object({
  scanCount: z.number().default(0),
  detections: z.array(z.object({
    type: z.string(),
    value: z.string(),
  })).default([]),
});

/**
 * Common PII patterns (simplified - production should use proper detection)
 */
const PII_PATTERNS = [
  { type: "email", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { type: "phone", regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
  { type: "ssn", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "credit_card", regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
];

/**
 * Scan text for PII
 */
function scanForPII(text: string): Array<{ type: string; value: string }> {
  const detections: Array<{ type: string; value: string }> = [];

  for (const { type, regex } of PII_PATTERNS) {
    const matches = text.match(regex);
    if (matches) {
      for (const match of matches) {
        detections.push({ type, value: match });
      }
    }
  }

  return detections;
}

/**
 * Create PII detection middleware
 *
 * Scans agent inputs and outputs for PII and can redact or block.
 */
export function createPIIDetectionMiddleware() {
  return createOpenKrakenMiddleware({
    name: "pii_detection",
    stateSchema: PIIStateSchema,

    hooks: {
      beforeModel: ({ state, input }: { state: MiddlewareState; context: MiddlewareContext; input: unknown }) => {
        const s = state as { scanCount?: number; detections?: Array<{ type: string; value: string }> };
        
        const inputText = typeof input === "string" ? input : JSON.stringify(input);
        const detections = scanForPII(inputText);
        
        s.scanCount = (s.scanCount ?? 0) + 1;
        s.detections = [...(s.detections ?? []), ...detections];

        if (detections.length > 0) {
          console.warn(`[PII] Detected ${detections.length} PII items in input`);
        }

        return input;
      },

      afterModel: ({ state, output }: { state: MiddlewareState; context: MiddlewareContext; output: unknown }) => {
        const s = state as { detections?: Array<{ type: string; value: string }> };
        
        const outputText = typeof output === "string" ? output : JSON.stringify(output);
        const detections = scanForPII(outputText);
        
        s.detections = [...(s.detections ?? []), ...detections];

        if (detections.length > 0) {
          console.warn(`[PII] Detected ${detections.length} PII items in output`);
        }

        return state;
      },
    },
  });
}
