/**
 * Adaptive Strategy Selector
 *
 * Selects the optimal voting strategy based on:
 * - Complexity level of the task
 * - Risk level involved
 * - Security concerns
 * - Architectural impact
 * - Participant count
 *
 * @since 2026-04-16
 */

import type {
  VotingStrategy,
  StrategySelectionContext,
  AdaptiveStrategyConfig,
} from "./voting-types.js";

const DEFAULT_STRATEGY_CONFIG: AdaptiveStrategyConfig = {
  simple: "majority_vote",
  moderate: "majority_vote",
  complex: "consensus",
  enterprise: "expert_priority",
  securityDominant: "expert_priority",
  architecturalDominant: "expert_priority",
};

const RISK_WEIGHT_MAP: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const SECURITY_DOMAINS = ["security", "audit", "vulnerability", "access-control"];
const ARCHITECTURAL_DOMAINS = ["architecture", "design", "planning", "system-design"];

export class AdaptiveStrategySelector {
  private config: AdaptiveStrategyConfig;

  constructor(config: Partial<AdaptiveStrategyConfig> = {}) {
    this.config = { ...DEFAULT_STRATEGY_CONFIG, ...config };
  }

  selectStrategy(context: StrategySelectionContext): VotingStrategy {
    const { complexity, riskLevel, participantCount, hasSecurityConcerns, hasArchitecturalImpact } =
      context;

    if (hasSecurityConcerns || this.isSecurityRelated(context)) {
      return this.config.securityDominant;
    }

    if (hasArchitecturalImpact || this.isArchitecturalRelated(context)) {
      return this.config.architecturalDominant;
    }

    const riskScore = RISK_WEIGHT_MAP[riskLevel] ?? 1;

    if (complexity >= 50) {
      return riskScore >= 3 ? this.config.enterprise : this.config.complex;
    }

    if (complexity >= 25) {
      return riskScore >= 2 ? this.config.complex : this.config.moderate;
    }

    if (participantCount >= 4 && riskScore >= 2) {
      return this.config.moderate;
    }

    return this.config.simple;
  }

  selectStrategyWithDefaults(
    complexity: number,
    riskLevel: string,
    hasSecurityConcerns: boolean = false,
    hasArchitecturalImpact: boolean = false,
    participantCount: number = 3,
  ): VotingStrategy {
    return this.selectStrategy({
      complexity,
      riskLevel,
      participantCount,
      hasSecurityConcerns,
      hasArchitecturalImpact,
    });
  }

  getStrategyReasoning(context: StrategySelectionContext): string {
    const strategy = this.selectStrategy(context);
    const reasons: string[] = [];

    reasons.push(`Complexity: ${context.complexity} (${this.getComplexityTier(context.complexity)})`);
    reasons.push(`Risk: ${context.riskLevel}`);
    reasons.push(`Participants: ${context.participantCount}`);

    if (context.hasSecurityConcerns || this.isSecurityRelated(context)) {
      reasons.push("Security concerns detected");
    }

    if (context.hasArchitecturalImpact || this.isArchitecturalRelated(context)) {
      reasons.push("Architectural impact detected");
    }

    reasons.push(`Selected strategy: ${strategy}`);

    return reasons.join(" | ");
  }

  private isSecurityRelated(context: StrategySelectionContext): boolean {
    if (context.hasSecurityConcerns) return true;
    return false;
  }

  private isArchitecturalRelated(context: StrategySelectionContext): boolean {
    if (context.hasArchitecturalImpact) return true;
    return false;
  }

  private getComplexityTier(complexity: number): string {
    if (complexity < 15) return "simple";
    if (complexity < 25) return "moderate";
    if (complexity < 50) return "complex";
    return "enterprise";
  }

  getConfig(): AdaptiveStrategyConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AdaptiveStrategyConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const adaptiveStrategySelector = new AdaptiveStrategySelector();

export function selectVotingStrategy(
  complexity: number,
  riskLevel: string,
  hasSecurityConcerns: boolean = false,
  hasArchitecturalImpact: boolean = false,
  participantCount: number = 3,
): VotingStrategy {
  return adaptiveStrategySelector.selectStrategyWithDefaults(
    complexity,
    riskLevel,
    hasSecurityConcerns,
    hasArchitecturalImpact,
    participantCount,
  );
}