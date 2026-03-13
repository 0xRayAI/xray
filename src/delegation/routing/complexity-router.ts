/**
 * Complexity Router
 *
 * Extracted complexity-based routing logic from task-skill-router.ts
 * Phase 3 refactoring - Matching Logic Extraction
 *
 * REFACTORED: Now uses complexity-core.ts for shared logic
 * @version 1.1.0
 */

import { RoutingResult, RoutingOptions } from '../config/types.js';
import { IRouter, ComplexityTier } from './interfaces.js';
import {
  ComplexityThresholds as CoreThresholds,
  DEFAULT_THRESHOLDS as CORE_DEFAULTS,
  getTierFromScore,
  getConfidenceForTier,
  getAgentForTier,
  getSkillForTier,
} from '../complexity-core.js';

/**
 * Legacy threshold interface for backward compatibility
 * Uses uppercase property names as expected by existing code
 */
export interface ComplexityThresholds {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  ENTERPRISE: number;
}

/**
 * Convert legacy thresholds to core format
 */
function toCoreThresholds(thresholds: Partial<ComplexityThresholds>): Partial<CoreThresholds> {
  const result: Partial<CoreThresholds> = {};
  if (thresholds.LOW !== undefined) result.simple = thresholds.LOW;
  if (thresholds.MEDIUM !== undefined) result.moderate = thresholds.MEDIUM;
  if (thresholds.HIGH !== undefined) result.complex = thresholds.HIGH;
  if (thresholds.ENTERPRISE !== undefined) result.enterprise = thresholds.ENTERPRISE;
  return result;
}

/**
 * Convert core thresholds to legacy format
 */
function toLegacyThresholds(thresholds: CoreThresholds): ComplexityThresholds {
  return {
    LOW: thresholds.simple,
    MEDIUM: thresholds.moderate,
    HIGH: thresholds.complex,
    ENTERPRISE: thresholds.enterprise,
  };
}

/**
 * Router that makes decisions based on task complexity scores
 */
export class ComplexityRouter implements IRouter {
  private thresholds: CoreThresholds;

  /**
   * Create a new ComplexityRouter
   * @param customThresholds - Optional custom thresholds (legacy format with uppercase names)
   */
  constructor(customThresholds?: Partial<ComplexityThresholds>) {
    const coreCustom = customThresholds ? toCoreThresholds(customThresholds) : {};
    this.thresholds = { ...CORE_DEFAULTS, ...coreCustom };
  }

  /**
   * Route based on complexity score
   * @param complexity - Complexity score (0-100)
   * @param options - Optional routing options
   * @returns Routing result
   */
  route(complexity: number, _options?: RoutingOptions): RoutingResult {
    const tier = this.getTier(complexity);
    const confidence = getConfidenceForTier(tier);
    const agent = getAgentForTier(tier);
    const skill = getSkillForTier(tier);

    return {
      skill,
      agent,
      confidence,
      reason: this.getReasonForTier(tier),
    };
  }

  /**
   * Get complexity tier for a given complexity score
   * @param complexity - Complexity score (0-100)
   * @returns Complexity tier category
   */
  getTier(complexity: number): ComplexityTier {
    return getTierFromScore(complexity, this.thresholds);
  }

  /**
   * Get the confidence level for a given complexity
   * @param complexity - Complexity score
   * @returns Confidence level (0-1)
   */
  getConfidence(complexity: number): number {
    const tier = this.getTier(complexity);
    return getConfidenceForTier(tier);
  }

  /**
   * Get recommended agent for a complexity tier
   * @param tier - Complexity tier
   * @returns Agent name
   */
  getAgentForTier(tier: ComplexityTier): string {
    return getAgentForTier(tier);
  }

  /**
   * Get recommended skill for a complexity tier
   * @param tier - Complexity tier
   * @returns Skill name
   */
  getSkillForTier(tier: ComplexityTier): string {
    return getSkillForTier(tier);
  }

  /**
   * Get routing reason for a tier
   * @param tier - Complexity tier
   * @returns Human-readable reason
   */
  private getReasonForTier(tier: ComplexityTier): string {
    const reasons: Record<ComplexityTier, string> = {
      low: 'Low complexity - direct agent',
      medium: 'Medium complexity - architect review',
      high: 'High complexity - orchestrator needed',
      enterprise: 'Enterprise complexity - full orchestration required',
    };
    return reasons[tier];
  }

  /**
   * Check if complexity is within a specific tier
   * @param complexity - Complexity score
   * @param tier - Tier to check against
   * @returns True if complexity matches the tier
   */
  isInTier(complexity: number, tier: ComplexityTier): boolean {
    return this.getTier(complexity) === tier;
  }

  /**
   * Update thresholds
   * @param thresholds - New threshold values (legacy format with uppercase names)
   */
  setThresholds(thresholds: Partial<ComplexityThresholds>): void {
    const coreThresholds = toCoreThresholds(thresholds);
    this.thresholds = { ...this.thresholds, ...coreThresholds };
  }

  /**
   * Get current thresholds
   * @returns Current threshold values (legacy format with uppercase names)
   */
  getThresholds(): ComplexityThresholds {
    return toLegacyThresholds(this.thresholds);
  }
}
