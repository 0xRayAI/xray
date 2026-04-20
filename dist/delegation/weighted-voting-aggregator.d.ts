/**
 * Weighted Voting Aggregator
 *
 * Advanced voting system with:
 * - Confidence-weighted voting where agent confidence affects their vote weight
 * - History-weighted voting that considers past successful votes
 * - Multiple aggregation strategies for different decision scenarios
 *
 * @version 1.0.0
 * @since 2026-04-17
 */
import type { VoteChoice, VotingResultDetail, HistoricalWeightConfig, AgentHistoricalPerformance, ConfidenceWeightConfig, WeightedVoteAggregation } from "./voting-types.js";
export declare const DEFAULT_HISTORICAL_CONFIG: HistoricalWeightConfig;
export declare const DEFAULT_CONFIDENCE_CONFIG: ConfidenceWeightConfig;
export declare class WeightedVotingAggregator {
    private historicalConfig;
    private confidenceConfig;
    private agentPerformance;
    constructor(historicalConfig?: Partial<HistoricalWeightConfig>, confidenceConfig?: Partial<ConfidenceWeightConfig>);
    calculateExpertiseWeight(agentName: string): number;
    calculateConfidenceWeight(agentName: string, voteConfidence: number): number;
    calculateHistoricalWeight(agentName: string): number;
    calculateTotalVoteWeight(agentName: string, voteConfidence: number): number;
    aggregateVotes(votes: VoteChoice[]): WeightedVoteAggregation[];
    updateAgentPerformance(agentName: string, decision: string, votedFor: string, wasCorrect: boolean, confidence: number): void;
    getAgentPerformance(agentName: string): AgentHistoricalPerformance | undefined;
    getAllPerformance(): AgentHistoricalPerformance[];
    loadPerformance(performance: Map<string, AgentHistoricalPerformance>): void;
    reset(): void;
}
export declare const createWeightedVotingAggregator: (historicalConfig?: Partial<HistoricalWeightConfig>, confidenceConfig?: Partial<ConfidenceWeightConfig>) => WeightedVotingAggregator;
export declare function createDetailedVotingResult(votes: VoteChoice[], aggregator: WeightedVotingAggregator): {
    aggregated: WeightedVoteAggregation[];
    winner: WeightedVoteAggregation | null;
    confidence: number;
    details: VotingResultDetail[];
};
//# sourceMappingURL=weighted-voting-aggregator.d.ts.map