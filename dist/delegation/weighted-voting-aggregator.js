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
import { getAgentExpertiseLevel, getVotingWeight, } from "./agent-expertise.js";
import { frameworkLogger } from "../core/framework-logger.js";
export const DEFAULT_HISTORICAL_CONFIG = {
    decayFactor: 0.95,
    minWeight: 0.1,
    maxWeight: 1.5,
    lookbackPeriod: 30 * 24 * 60 * 60 * 1000,
    successThreshold: 0.6,
};
export const DEFAULT_CONFIDENCE_CONFIG = {
    expertiseMultiplier: 1.0,
    confidenceMultiplier: 1.0,
    minConfidenceThreshold: 0.3,
    normalizeScores: true,
};
export class WeightedVotingAggregator {
    historicalConfig;
    confidenceConfig;
    agentPerformance;
    constructor(historicalConfig = {}, confidenceConfig = {}) {
        this.historicalConfig = { ...DEFAULT_HISTORICAL_CONFIG, ...historicalConfig };
        this.confidenceConfig = { ...DEFAULT_CONFIDENCE_CONFIG, ...confidenceConfig };
        this.agentPerformance = new Map();
    }
    calculateExpertiseWeight(agentName) {
        const expertiseLevel = getAgentExpertiseLevel(agentName);
        const baseWeight = getVotingWeight(agentName);
        return baseWeight * (expertiseLevel / 10);
    }
    calculateConfidenceWeight(agentName, voteConfidence) {
        if (voteConfidence < this.confidenceConfig.minConfidenceThreshold) {
            return 0;
        }
        const expertiseLevel = getAgentExpertiseLevel(agentName);
        const expertiseBonus = (expertiseLevel / 10) * this.confidenceConfig.expertiseMultiplier;
        const confidenceImpact = voteConfidence * this.confidenceConfig.confidenceMultiplier;
        return expertiseBonus * confidenceImpact;
    }
    calculateHistoricalWeight(agentName) {
        const performance = this.agentPerformance.get(agentName);
        if (!performance) {
            return 1.0;
        }
        const { totalVotes, correctVotes, weightedScore, lastActivity } = performance;
        const daysSinceActive = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);
        const decay = Math.pow(this.historicalConfig.decayFactor, daysSinceActive);
        const successRate = totalVotes > 0 ? correctVotes / totalVotes : 0.5;
        const minSuccess = this.historicalConfig.successThreshold;
        let historicalWeight;
        if (successRate >= minSuccess) {
            historicalWeight = 1 + (successRate - minSuccess) * 0.5;
        }
        else {
            historicalWeight = 0.5 + (successRate / minSuccess) * 0.5;
        }
        historicalWeight *= decay;
        historicalWeight *= (weightedScore / 100);
        return Math.max(this.historicalConfig.minWeight, Math.min(this.historicalConfig.maxWeight, historicalWeight));
    }
    calculateTotalVoteWeight(agentName, voteConfidence) {
        const expertiseWeight = this.calculateExpertiseWeight(agentName);
        const confidenceWeight = this.calculateConfidenceWeight(agentName, voteConfidence);
        const historicalWeight = this.calculateHistoricalWeight(agentName);
        return expertiseWeight * confidenceWeight * historicalWeight;
    }
    aggregateVotes(votes) {
        const aggregated = new Map();
        for (const vote of votes) {
            const expertiseWeight = this.calculateExpertiseWeight(vote.agentName);
            const confidenceWeight = this.calculateConfidenceWeight(vote.agentName, vote.confidence);
            const historicalWeight = this.calculateHistoricalWeight(vote.agentName);
            const totalWeight = expertiseWeight * confidenceWeight * historicalWeight;
            const existing = aggregated.get(vote.vote);
            if (existing) {
                existing.baseWeight += expertiseWeight;
                existing.confidenceWeight += confidenceWeight;
                existing.historicalWeight += historicalWeight;
                existing.totalWeight += totalWeight;
                existing.contributingAgents.push(vote.agentName);
            }
            else {
                aggregated.set(vote.vote, {
                    option: vote.vote,
                    baseWeight: expertiseWeight,
                    expertiseWeight: expertiseWeight,
                    confidenceWeight,
                    historicalWeight,
                    totalWeight,
                    contributingAgents: [vote.agentName],
                });
            }
        }
        if (this.confidenceConfig.normalizeScores) {
            const totalWeight = Array.from(aggregated.values()).reduce((sum, agg) => sum + agg.totalWeight, 0);
            if (totalWeight > 0) {
                for (const agg of aggregated.values()) {
                    agg.totalWeight = agg.totalWeight / totalWeight;
                }
            }
        }
        return Array.from(aggregated.values()).sort((a, b) => b.totalWeight - a.totalWeight);
    }
    updateAgentPerformance(agentName, decision, votedFor, wasCorrect, confidence) {
        let performance = this.agentPerformance.get(agentName);
        if (!performance) {
            performance = {
                agentName,
                totalVotes: 0,
                correctVotes: 0,
                averageConfidence: 0,
                weightedScore: 50,
                lastActivity: Date.now(),
                streakCount: 0,
                domainPerformance: {},
            };
            this.agentPerformance.set(agentName, performance);
        }
        performance.totalVotes++;
        performance.lastActivity = Date.now();
        if (wasCorrect) {
            performance.correctVotes++;
            performance.streakCount++;
        }
        else {
            performance.streakCount = 0;
        }
        const newAvg = (performance.averageConfidence * (performance.totalVotes - 1) + confidence) /
            performance.totalVotes;
        performance.averageConfidence = newAvg;
        const successRate = performance.correctVotes / performance.totalVotes;
        const confidenceFactor = newAvg;
        const streakBonus = Math.min(performance.streakCount * 0.05, 0.2);
        performance.weightedScore = Math.max(0, Math.min(100, successRate * 50 + confidenceFactor * 30 + streakBonus * 20 + 20));
        frameworkLogger.log("WeightedVotingAggregator", "agent-performance-updated", "debug", {
            agentName,
            totalVotes: performance.totalVotes,
            correctVotes: performance.correctVotes,
            successRate: successRate.toFixed(2),
            weightedScore: performance.weightedScore.toFixed(2),
        });
    }
    getAgentPerformance(agentName) {
        return this.agentPerformance.get(agentName);
    }
    getAllPerformance() {
        return Array.from(this.agentPerformance.values());
    }
    loadPerformance(performance) {
        this.agentPerformance = new Map(performance);
    }
    reset() {
        this.agentPerformance.clear();
    }
}
export const createWeightedVotingAggregator = (historicalConfig, confidenceConfig) => {
    return new WeightedVotingAggregator(historicalConfig, confidenceConfig);
};
export function createDetailedVotingResult(votes, aggregator) {
    const aggregated = aggregator.aggregateVotes(votes);
    const winner = aggregated[0] ?? null;
    let confidence = 0;
    if (winner && aggregated.length > 1) {
        const secondPlace = aggregated[1];
        if (secondPlace) {
            const total = winner.totalWeight + secondPlace.totalWeight;
            confidence = total > 0 ? winner.totalWeight / total : 0;
        }
        else {
            confidence = 1;
        }
    }
    else if (winner) {
        confidence = 1;
    }
    const details = votes.map((vote) => ({
        agentName: vote.agentName,
        expertiseLevel: getAgentExpertiseLevel(vote.agentName),
        vote: vote.vote,
        weight: aggregator.calculateTotalVoteWeight(vote.agentName, vote.confidence),
        contributed: vote.vote === winner?.option,
    }));
    return { aggregated, winner, confidence, details };
}
//# sourceMappingURL=weighted-voting-aggregator.js.map