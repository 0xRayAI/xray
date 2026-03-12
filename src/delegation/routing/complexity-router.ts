/**
 * Complexity Router
 *
 * Extracted complexity-based routing logic from task-skill-router.ts
 * Phase 3 refactoring - Matching Logic Extraction
 */

import { RoutingResult, RoutingOptions } from '../config/types.js';
import { IRouter, ComplexityTier } from './interfaces.js';

/**
 * Complexity thresholds for routing decisions
 */
interface ComplexityThresholds {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  ENTERPRISE: number;
}

const DEFAULT_THRESHOLDS: ComplexityThresholds = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  ENTERPRISE: 100,
};

/**
 * Router that makes decisions based on task complexity scores
 */
export class ComplexityRouter implements IRouter {
  private thresholds: ComplexityThresholds;

  /**
   * Create a new ComplexityRouter
   * @param customThresholds - Optional custom thresholds
   */
  constructor(customThresholds?: Partial<ComplexityThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  }

  /**
   * Route based on complexity score
   * @param complexity - Complexity score (0-100)
   * @param options - Optional routing options
   * @returns Routing result
   */
  route(complexity: number, options?: RoutingOptions): RoutingResult {
    const tier = this.getTier(complexity);
    
    switch (tier) {
      case 'low':
        return {
          skill: 'code-review',
          agent: 'code-reviewer',
          confidence: 0.6,
          reason: 'Low complexity - direct agent',
        };
        
      case 'medium':
        return {
          skill: 'architecture-patterns',
          agent: 'architect',
          confidence: 0.6,
          reason: 'Medium complexity - architect review',
        };
        
      case 'high':
        return {
          skill: 'orchestrator',
          agent: 'orchestrator',
          confidence: 0.7,
          reason: 'High complexity - orchestrator needed',
        };
        
      case 'enterprise':
        return {
          skill: 'enterprise-coordination',
          agent: 'orchestrator',
          confidence: 0.9,
          reason: 'Enterprise complexity - full orchestration required',
        };
        
      default:
        // Fallback to medium tier
        return {
          skill: 'architecture-patterns',
          agent: 'architect',
          confidence: 0.5,
          reason: 'Unknown complexity - default to architect review',
        };
    }
  }

  /**
   * Get complexity tier for a given complexity score
   * @param complexity - Complexity score (0-100)
   * @returns Complexity tier category
   */
  getTier(complexity: number): ComplexityTier {
    if (complexity <= this.thresholds.LOW) {
      return 'low';
    } else if (complexity <= this.thresholds.MEDIUM) {
      return 'medium';
    } else if (complexity <= this.thresholds.HIGH) {
      return 'high';
    } else {
      return 'enterprise';
    }
  }

  /**
   * Get the confidence level for a given complexity
   * @param complexity - Complexity score
   * @returns Confidence level (0-1)
   */
  getConfidence(complexity: number): number {
    const tier = this.getTier(complexity);
    
    switch (tier) {
      case 'low':
        return 0.6;
      case 'medium':
        return 0.6;
      case 'high':
        return 0.7;
      case 'enterprise':
        return 0.9;
      default:
        return 0.5;
    }
  }

  /**
   * Get recommended agent for a complexity tier
   * @param tier - Complexity tier
   * @returns Agent name
   */
  getAgentForTier(tier: ComplexityTier): string {
    switch (tier) {
      case 'low':
        return 'code-reviewer';
      case 'medium':
        return 'architect';
      case 'high':
      case 'enterprise':
        return 'orchestrator';
      default:
        return 'orchestrator';
    }
  }

  /**
   * Get recommended skill for a complexity tier
   * @param tier - Complexity tier
   * @returns Skill name
   */
  getSkillForTier(tier: ComplexityTier): string {
    switch (tier) {
      case 'low':
        return 'code-review';
      case 'medium':
        return 'architecture-patterns';
      case 'high':
        return 'orchestrator';
      case 'enterprise':
        return 'enterprise-coordination';
      default:
        return 'orchestrator';
    }
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
   * @param thresholds - New threshold values
   */
  setThresholds(thresholds: Partial<ComplexityThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   * @returns Current threshold values
   */
  getThresholds(): ComplexityThresholds {
    return { ...this.thresholds };
  }
}
