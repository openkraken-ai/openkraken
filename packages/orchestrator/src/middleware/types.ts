/**
 * Middleware Type Definitions
 *
 * Type definitions for OpenKraken middleware.
 */

/**
 * Middleware state schema
 */
export type MiddlewareState = Record<string, unknown>;

/**
 * Middleware context schema
 */
export type MiddlewareContext = Record<string, unknown>;

/**
 * Middleware configuration options
 */
export interface MiddlewareConfig {
  /** Enable/disable middleware */
  enabled: boolean;
  /** Priority (lower = earlier execution) */
  priority?: number;
  /** Custom configuration */
  config?: Record<string, unknown>;
}

/**
 * Middleware output
 */
export interface MiddlewareOutput {
  status: "proceed" | "block" | "error";
  data?: unknown;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Policy middleware configuration
 */
export interface PolicyMiddlewareConfig {
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  allowedCommands?: string[];
  allowedDomains?: string[];
}

/**
 * PII detection result
 */
export interface PIIDetectionResult {
  hasPII: boolean;
  detections: Array<{
    type: string;
    value: string;
    start: number;
    end: number;
  }>;
}

/**
 * Summarization options
 */
export interface SummarizationOptions {
  maxLength?: number;
  strategy?: "truncate" | "extract" | "compress";
}

/**
 * HITL (Human-in-the-Loop) configuration
 */
export interface HITLConfig {
  enabled: boolean;
  triggerOnConfidenceBelow?: number;
  triggerOnTools?: string[];
  timeoutMs?: number;
}
