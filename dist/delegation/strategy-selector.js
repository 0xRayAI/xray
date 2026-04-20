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
 * @version 1.0.0
 * @since 2026-04-16
 */
const DEFAULT_STRATEGY_CONFIG = {
    simple: "majority_vote",
    moderate: "majority_vote",
    complex: "consensus",
    enterprise: "expert_priority",
    securityDominant: "expert_priority",
    architecturalDominant: "expert_priority",
};
const RISK_WEIGHT_MAP = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
};
const SECURITY_DOMAINS = ["security", "audit", "vulnerability", "access-control"];
const ARCHITECTURAL_DOMAINS = ["architecture", "design", "planning", "system-design"];
export class AdaptiveStrategySelector {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_STRATEGY_CONFIG, ...config };
    }
    selectStrategy(context) {
        const { complexity, riskLevel, participantCount, hasSecurityConcerns, hasArchitecturalImpact } = context;
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
    selectStrategyWithDefaults(complexity, riskLevel, hasSecurityConcerns = false, hasArchitecturalImpact = false, participantCount = 3) {
        return this.selectStrategy({
            complexity,
            riskLevel,
            participantCount,
            hasSecurityConcerns,
            hasArchitecturalImpact,
        });
    }
    getStrategyReasoning(context) {
        const strategy = this.selectStrategy(context);
        const reasons = [];
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
    isSecurityRelated(context) {
        if (context.hasSecurityConcerns)
            return true;
        return false;
    }
    isArchitecturalRelated(context) {
        if (context.hasArchitecturalImpact)
            return true;
        return false;
    }
    getComplexityTier(complexity) {
        if (complexity < 15)
            return "simple";
        if (complexity < 25)
            return "moderate";
        if (complexity < 50)
            return "complex";
        return "enterprise";
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}
export const adaptiveStrategySelector = new AdaptiveStrategySelector();
export function selectVotingStrategy(complexity, riskLevel, hasSecurityConcerns = false, hasArchitecturalImpact = false, participantCount = 3) {
    return adaptiveStrategySelector.selectStrategyWithDefaults(complexity, riskLevel, hasSecurityConcerns, hasArchitecturalImpact, participantCount);
}
//# sourceMappingURL=strategy-selector.js.map