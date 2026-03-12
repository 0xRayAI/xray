/**
 * Routing Interfaces
 *
 * Core interfaces for routing components extracted from task-skill-router.ts
 * as part of Phase 3 refactoring - Matching Logic Extraction.
 */

import { RoutingMapping, RoutingResult, RoutingOptions } from '../config/types.js';

/**
 * Matcher interface for keyword and history-based matching
 */
export interface IMatcher {
  /**
   * Match a task description or task ID
   * @param input - Task description or task ID to match
   * @param options - Optional routing options
   * @returns Routing result or null if no match
   */
  match(input: string, options?: RoutingOptions): RoutingResult | null;
}

/**
 * Router interface for complexity-based routing
 */
export interface IRouter {
  /**
   * Route based on complexity score
   * @param complexity - Complexity score (0-100)
   * @param options - Optional routing options
   * @returns Routing result
   */
  route(complexity: number, options?: RoutingOptions): RoutingResult;
}

/**
 * Keyword match with additional metadata
 */
export interface KeywordMatch {
  /** The matched keyword */
  keyword: string;
  /** The routing mapping that contains this keyword */
  mapping: RoutingMapping;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * History entry for tracking routing outcomes
 */
export interface HistoryEntry {
  /** The agent that was routed to */
  agent: string;
  /** The skill that was used */
  skill: string;
  /** Number of successful outcomes */
  successCount: number;
  /** Total number of attempts */
  totalAttempts: number;
  /** Last time this entry was used */
  lastUsed: Date;
}

/**
 * Configuration for routing components
 */
export interface RoutingComponentConfig {
  /** Minimum confidence threshold for accepting a match */
  minConfidenceThreshold: number;
  /** Minimum success rate for history-based routing */
  minHistorySuccessRate: number;
  /** Whether to escalate to LLM on low confidence */
  escalateOnLowConfidence: boolean;
}

/**
 * Release workflow detection result
 */
export interface ReleaseDetectionResult {
  /** Whether this is a release task */
  isRelease: boolean;
  /** Version bump type (major, minor, patch) */
  bumpType: 'major' | 'minor' | 'patch';
  /** Whether to create a git tag */
  createTag: boolean;
  /** Release workflow steps */
  workflow: string[];
}

/**
 * Statistics for history tracking
 */
export interface HistoryStats {
  /** Task ID */
  taskId: string;
  /** Success rate (0-1) */
  successRate: number;
  /** Total number of attempts */
  count: number;
  /** Agent used */
  agent: string;
}

/**
 * Complexity tier categories
 */
export type ComplexityTier = 'low' | 'medium' | 'high' | 'enterprise';
