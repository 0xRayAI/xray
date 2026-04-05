/**
 * Predictive Analytics for Optimal Agent Routing
 *
 * Predicts the best agent to route a task to based on historical
 * success rates using simple keyword overlap scoring.
 *
 * @version 1.0.0
 */
import { routingOutcomeTracker } from '../delegation/analytics/outcome-tracker.js';
/**
 * Calculate keyword overlap score between a task description and a set of
 * historical task descriptions routed to a specific agent.
 */
function keywordOverlapScore(description, historicalDescriptions) {
    const descWords = new Set(description.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    if (descWords.size === 0 || historicalDescriptions.length === 0)
        return 0;
    let totalScore = 0;
    let matchCount = 0;
    for (const hist of historicalDescriptions) {
        const histWords = new Set(hist.toLowerCase().split(/\W+/).filter(w => w.length > 2));
        let overlap = 0;
        for (const w of descWords) {
            if (histWords.has(w))
                overlap++;
        }
        if (overlap > 0) {
            totalScore += overlap / Math.max(descWords.size, histWords.size);
            matchCount++;
        }
    }
    return matchCount > 0 ? totalScore / matchCount : 0;
}
export const predictiveAnalytics = {
    /**
     * Predict the optimal agent for a given task description.
     *
     * Loads outcomes from routingOutcomeTracker, groups by agent,
     * and picks the agent with the best historical success rate
     * among those that have keyword overlap with the task.
     */
    async predict(taskDescription) {
        await routingOutcomeTracker.reloadFromDisk();
        const outcomes = routingOutcomeTracker.getOutcomes();
        // Filter to outcomes that have a resolved success field
        const resolved = outcomes.filter((o) => o.success !== undefined && o.taskDescription);
        if (resolved.length === 0)
            return null;
        // Group outcomes by agent
        const agentMap = new Map();
        for (const o of resolved) {
            const list = agentMap.get(o.routedAgent) || [];
            list.push(o);
            agentMap.set(o.routedAgent, list);
        }
        let bestPrediction = null;
        let bestScore = -1;
        for (const [agent, agentOutcomes] of agentMap.entries()) {
            const descriptions = agentOutcomes.map(o => o.taskDescription);
            const overlap = keywordOverlapScore(taskDescription, descriptions);
            if (overlap <= 0)
                continue; // skip agents with no keyword overlap
            const successes = agentOutcomes.filter(o => o.success).length;
            const successRate = successes / agentOutcomes.length;
            // Weighted score: 70% keyword overlap, 30% success rate
            const score = (overlap * 0.7) + (successRate * 0.3);
            if (score > bestScore) {
                bestScore = score;
                bestPrediction = {
                    agent,
                    confidence: Math.min(score, 1),
                    historicalSuccessRate: successRate,
                    sampleSize: agentOutcomes.length,
                };
            }
        }
        return bestPrediction;
    },
    /**
     * Predict the globally optimal agent regardless of task description.
     *
     * Returns the agent with the highest success rate that has at least
     * 3 historical samples.
     */
    async predictOptimalAgent() {
        await routingOutcomeTracker.reloadFromDisk();
        const stats = routingOutcomeTracker.getStats();
        // Filter to agents with >= 3 samples
        const qualified = stats.filter(s => s.total >= 3);
        if (qualified.length === 0)
            return null;
        // Sort by success rate descending, then by total samples descending
        qualified.sort((a, b) => {
            if (b.successRate !== a.successRate)
                return b.successRate - a.successRate;
            return b.total - a.total;
        });
        const top = qualified[0];
        return {
            agent: top.agent,
            confidence: top.successRate,
            historicalSuccessRate: top.successRate,
            sampleSize: top.total,
        };
    },
    /**
     * Synchronous prediction — uses in-memory outcome data without disk reload.
     * Suitable for hot-path usage in agent-delegator.
     */
    predictSync(taskDescription) {
        const stats = routingOutcomeTracker.getStats();
        const outcomes = routingOutcomeTracker.getOutcomes();
        if (stats.length === 0 || outcomes.length === 0)
            return null;
        // Group outcomes by agent
        const byAgent = new Map();
        for (const o of outcomes) {
            const arr = byAgent.get(o.routedAgent) || [];
            arr.push(o);
            byAgent.set(o.routedAgent, arr);
        }
        let bestAgent = null;
        let bestScore = -1;
        let bestRate = 0;
        let bestSamples = 0;
        for (const [agent, agentOutcomes] of byAgent) {
            const descriptions = agentOutcomes.map(o => o.taskDescription);
            const overlap = keywordOverlapScore(taskDescription, descriptions);
            const agentStat = stats.find(s => s.agent === agent);
            const successRate = agentStat?.successRate ?? 0;
            const total = agentStat?.total ?? 0;
            // Weighted score: 70% keyword overlap + 30% historical success rate
            const score = (0.7 * overlap) + (0.3 * successRate);
            if (score > bestScore && total >= 3) {
                bestScore = score;
                bestAgent = agent;
                bestRate = successRate;
                bestSamples = total;
            }
        }
        if (!bestAgent || bestScore < 0.3)
            return null;
        return {
            agent: bestAgent,
            confidence: Math.min(bestScore, 1.0),
            historicalSuccessRate: bestRate,
            sampleSize: bestSamples,
        };
    },
};
//# sourceMappingURL=predictive-analytics.js.map