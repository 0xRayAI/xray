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
import type { VotingStrategy, StrategySelectionContext, AdaptiveStrategyConfig } from "./voting-types.js";
export declare class AdaptiveStrategySelector {
    private config;
    constructor(config?: Partial<AdaptiveStrategyConfig>);
    selectStrategy(context: StrategySelectionContext): VotingStrategy;
    selectStrategyWithDefaults(complexity: number, riskLevel: string, hasSecurityConcerns?: boolean, hasArchitecturalImpact?: boolean, participantCount?: number): VotingStrategy;
    getStrategyReasoning(context: StrategySelectionContext): string;
    private isSecurityRelated;
    private isArchitecturalRelated;
    private getComplexityTier;
    getConfig(): AdaptiveStrategyConfig;
    updateConfig(config: Partial<AdaptiveStrategyConfig>): void;
}
export declare const adaptiveStrategySelector: AdaptiveStrategySelector;
export declare function selectVotingStrategy(complexity: number, riskLevel: string, hasSecurityConcerns?: boolean, hasArchitecturalImpact?: boolean, participantCount?: number): VotingStrategy;
//# sourceMappingURL=strategy-selector.d.ts.map