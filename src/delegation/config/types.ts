/**
 * Routing Types
 *
 * Type definitions for task-skill routing system.
 */

/**
 * Individual routing mapping that maps keywords to an agent/skill
 */
export interface RoutingMapping {
  /** Keywords to match against task descriptions */
  keywords: string[];
  /** Skill to invoke */
  skill: string;
  /** Agent to route to */
  agent: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Category for organization */
  category?: string;
  /** Priority level */
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Result of a routing operation
 */
export interface RoutingResult {
  skill: string;
  agent: string;
  confidence: number;
  matchedKeyword?: string;
  fromHistory?: boolean;
  reason?: string;
  operation?: string;
  context?: Record<string, unknown>;
  escalateToLlm?: boolean;
  isRelease?: boolean;
}

/**
 * Routing options
 */
export interface RoutingOptions {
  complexity?: number;
  taskId?: string;
  useHistoricalData?: boolean;
  sessionId?: string;
  stateManager?: any;
}

/**
 * Validation result for mappings
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  duplicateCount: number;
}
