/**
 * Metrics Collector
 *
 * Collects and aggregates orchestration metrics from:
 * - Activity logs
 * - Orchestrator state
 * - Agent spawning events
 * - Voting outcomes
 *
 * @version 1.0.0
 * @since 2026-04-17
 */
import * as fs from "fs";
import * as path from "path";
import { DEFAULT_DASHBOARD_CONFIG, } from "./dashboard-types.js";
import { frameworkLogger } from "../core/framework-logger.js";
export class MetricsCollector {
    cwd;
    logPath;
    reportPath;
    cachedMetrics = null;
    lastCollectTime = 0;
    trendsHistory = [];
    constructor(cwd = process.cwd()) {
        this.cwd = cwd;
        const logDir = path.join(cwd, "logs", "framework");
        this.logPath = path.join(logDir, "activity.log");
        this.reportPath = path.join(logDir, "activity-report.json");
    }
    async collectMetrics() {
        const startTime = Date.now();
        try {
            const [orchestrationMetrics, delegationAnalytics, votingAnalytics, votingOutcomes, historicalTrends, agentMetrics, complexityMetrics,] = await Promise.all([
                this.collectOrchestrationMetrics(),
                this.collectDelegationAnalytics(),
                this.collectVotingAnalytics(),
                this.collectVotingOutcomes(),
                this.collectHistoricalTrends(),
                this.collectAgentMetrics(),
                this.collectComplexityMetrics(),
            ]);
            const alerts = this.detectAnomalies(orchestrationMetrics, delegationAnalytics, votingAnalytics);
            this.cachedMetrics = {
                metrics: orchestrationMetrics,
                delegation: delegationAnalytics,
                voting: votingAnalytics,
                trends: historicalTrends,
                alerts,
                agents: agentMetrics,
                complexity: complexityMetrics,
                votingOutcomes,
                lastUpdated: Date.now(),
            };
            this.lastCollectTime = Date.now();
            frameworkLogger.log("metrics-collector", "metrics-collected", "debug", {
                duration: Date.now() - startTime,
                activeSessions: orchestrationMetrics.activeSessions,
                totalAgents: orchestrationMetrics.totalAgentsUsed,
            });
            return this.cachedMetrics;
        }
        catch (error) {
            frameworkLogger.log("metrics-collector", "collection-failed", "error", { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }
    async collectOrchestrationMetrics() {
        const logEntries = await this.readLogEntries();
        const reportData = await this.readReportData();
        const sessions = new Set();
        const completedSessions = new Set();
        const failedSessions = new Set();
        const agentSet = new Set();
        let totalTasks = 0;
        const sessionDurations = [];
        for (const entry of logEntries) {
            if (entry.category === "session") {
                sessions.add(entry.details?.sessionId || entry.timestamp);
                if (entry.action === "session-ended") {
                    completedSessions.add(entry.details?.sessionId || entry.timestamp);
                    if (entry.details?.duration) {
                        sessionDurations.push(entry.details.duration);
                    }
                }
            }
            if (entry.category === "agent") {
                if (entry.details?.agentType) {
                    agentSet.add(entry.details.agentType);
                }
                if (entry.action.includes("spawned") || entry.action.includes("completed")) {
                    totalTasks++;
                }
            }
            if (entry.level === "error") {
                failedSessions.add(entry.details?.sessionId || entry.timestamp);
            }
        }
        const successfulTasks = reportData.stats?.byCategory?.agent || 0;
        const totalAttempts = successfulTasks + (reportData.stats?.byLevel?.error || 0);
        return {
            totalSessions: sessions.size,
            activeSessions: sessions.size - completedSessions.size - failedSessions.size,
            completedSessions: completedSessions.size,
            failedSessions: failedSessions.size,
            avgSessionDuration: sessionDurations.length > 0
                ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
                : 0,
            totalAgentsUsed: agentSet.size,
            totalTasksExecuted: totalTasks,
            successRate: totalAttempts > 0 ? successfulTasks / totalAttempts : 1,
        };
    }
    async collectDelegationAnalytics() {
        const logEntries = await this.readLogEntries();
        const agentInvocations = {};
        const complexityByAgent = {};
        const durationByAgent = {};
        const successByAgent = {};
        const delegationDepth = {};
        for (const entry of logEntries) {
            if (entry.category === "agent") {
                const agentType = entry.details?.agentType || "unknown";
                const complexity = entry.details?.complexity || 50;
                const duration = entry.details?.duration || 0;
                const status = entry.action.includes("completed")
                    ? "success"
                    : entry.action.includes("failed")
                        ? "failed"
                        : "unknown";
                agentInvocations[agentType] = (agentInvocations[agentType] || 0) + 1;
                if (!complexityByAgent[agentType])
                    complexityByAgent[agentType] = [];
                complexityByAgent[agentType].push(complexity);
                if (!durationByAgent[agentType])
                    durationByAgent[agentType] = [];
                if (duration > 0)
                    durationByAgent[agentType].push(duration);
                if (!successByAgent[agentType])
                    successByAgent[agentType] = { success: 0, total: 0 };
                successByAgent[agentType].total++;
                if (status === "success")
                    successByAgent[agentType].success++;
                if (entry.details?.depth !== undefined) {
                    const depth = entry.details.depth;
                    delegationDepth[agentType] = Math.max(delegationDepth[agentType] || 0, depth);
                }
            }
        }
        const complexityByAgentAvg = {};
        for (const [agent, values] of Object.entries(complexityByAgent)) {
            complexityByAgentAvg[agent] = values.reduce((a, b) => a + b, 0) / values.length;
        }
        const successRateByAgent = {};
        for (const [agent, stats] of Object.entries(successByAgent)) {
            successRateByAgent[agent] = stats.total > 0 ? stats.success / stats.total : 0;
        }
        const avgDurationByAgent = {};
        for (const [agent, values] of Object.entries(durationByAgent)) {
            avgDurationByAgent[agent] = values.reduce((a, b) => a + b, 0) / values.length;
        }
        return {
            agentInvocations,
            complexityByAgent: complexityByAgentAvg,
            successRateByAgent,
            avgDurationByAgent,
            delegationChainDepth: delegationDepth,
        };
    }
    async collectVotingAnalytics() {
        const logEntries = await this.readLogEntries();
        const votingEntries = logEntries.filter((e) => e.category === "agent" && (e.action.includes("vote") || e.details?.strategy));
        let totalVotes = 0;
        let successfulVotes = 0;
        let failedVotes = 0;
        let totalConfidence = 0;
        const strategyUsage = {};
        const agentParticipation = {};
        let consensusCount = 0;
        let majorityCount = 0;
        for (const entry of votingEntries) {
            totalVotes++;
            if (entry.level === "success")
                successfulVotes++;
            if (entry.level === "error")
                failedVotes++;
            if (entry.details?.confidence) {
                totalConfidence += entry.details.confidence;
            }
            if (entry.details?.strategy) {
                const strategy = entry.details.strategy;
                strategyUsage[strategy] = (strategyUsage[strategy] || 0) + 1;
                if (strategy === "consensus")
                    consensusCount++;
                if (strategy === "majority_vote")
                    majorityCount++;
            }
            if (entry.details?.participants) {
                const participants = entry.details.participants;
                for (const agent of participants) {
                    agentParticipation[agent] = (agentParticipation[agent] || 0) + 1;
                }
            }
        }
        return {
            totalVotes,
            successfulVotes,
            failedVotes,
            avgConfidence: totalVotes > 0 ? totalConfidence / totalVotes : 0,
            strategyUsage,
            agentParticipation,
            consensusRate: totalVotes > 0 ? consensusCount / totalVotes : 0,
            majorityRate: totalVotes > 0 ? majorityCount / totalVotes : 0,
        };
    }
    async collectVotingOutcomes() {
        const logEntries = await this.readLogEntries();
        const outcomes = [];
        const votingEntries = logEntries.filter((e) => e.category === "agent" && (e.action.includes("vote") || e.details?.decision));
        for (const entry of votingEntries) {
            outcomes.push({
                sessionId: entry.details?.sessionId || entry.timestamp,
                timestamp: new Date(entry.timestamp).getTime(),
                topic: entry.details?.topic || entry.action,
                strategy: entry.details?.strategy || "majority_vote",
                participants: entry.details?.participants || [],
                decision: entry.details?.decision || entry.action,
                confidence: entry.details?.confidence || 0.5,
                votes: entry.details?.votes || [],
                tied: entry.details?.tied || false,
                executionTime: entry.details?.executionTime || 0,
            });
        }
        return outcomes.slice(-100);
    }
    async collectHistoricalTrends() {
        const logEntries = await this.readLogEntries();
        const sessionHistory = [];
        const agentUsageHistory = {};
        const successRateHistory = [];
        const complexityDistributionHistory = {};
        const hourlyBuckets = new Map();
        for (const entry of logEntries) {
            const timestamp = new Date(entry.timestamp).getTime();
            const hourBucket = Math.floor(timestamp / (60 * 60 * 1000)) * 60 * 60 * 1000;
            if (!hourlyBuckets.has(hourBucket)) {
                hourlyBuckets.set(hourBucket, {
                    sessions: 0,
                    agents: {},
                    complexity: {},
                    success: 0,
                    total: 0,
                });
            }
            const bucket = hourlyBuckets.get(hourBucket);
            if (entry.category === "session") {
                bucket.sessions++;
            }
            if (entry.category === "agent") {
                const agentType = entry.details?.agentType || "unknown";
                bucket.agents[agentType] = (bucket.agents[agentType] || 0) + 1;
                const complexity = entry.details?.complexity || 50;
                const complexityBucket = complexity < 25 ? "simple" : complexity < 50 ? "moderate" : complexity < 75 ? "complex" : "enterprise";
                bucket.complexity[complexityBucket] = (bucket.complexity[complexityBucket] || 0) + 1;
                if (entry.action.includes("completed")) {
                    bucket.success++;
                }
                bucket.total++;
            }
        }
        for (const [hour, data] of hourlyBuckets) {
            sessionHistory.push({
                timestamp: hour,
                value: data.sessions,
                label: new Date(hour).toLocaleTimeString(),
            });
            for (const [agent, count] of Object.entries(data.agents)) {
                if (!agentUsageHistory[agent])
                    agentUsageHistory[agent] = [];
                agentUsageHistory[agent].push({
                    timestamp: hour,
                    value: count,
                });
            }
            const successRate = data.total > 0 ? data.success / data.total : 0;
            successRateHistory.push({
                timestamp: hour,
                value: successRate,
            });
            for (const [complexity, count] of Object.entries(data.complexity)) {
                if (!complexityDistributionHistory[complexity])
                    complexityDistributionHistory[complexity] = [];
                complexityDistributionHistory[complexity].push({
                    timestamp: hour,
                    value: count,
                });
            }
        }
        return {
            sessionHistory: sessionHistory.sort((a, b) => a.timestamp - b.timestamp),
            agentUsageHistory,
            successRateHistory: successRateHistory.sort((a, b) => a.timestamp - b.timestamp),
            complexityDistributionHistory,
        };
    }
    async collectAgentMetrics() {
        const delegation = await this.collectDelegationAnalytics();
        const agents = [];
        for (const [agentName, invocations] of Object.entries(delegation.agentInvocations)) {
            agents.push({
                name: agentName,
                invocations,
                successRate: delegation.successRateByAgent[agentName] || 0,
                avgComplexity: delegation.complexityByAgent[agentName] || 0,
                avgDuration: delegation.avgDurationByAgent[agentName] || 0,
                lastInvoked: Date.now(),
                delegationCount: delegation.delegationChainDepth[agentName] || 0,
            });
        }
        return agents.sort((a, b) => b.invocations - a.invocations);
    }
    async collectComplexityMetrics() {
        const logEntries = await this.readLogEntries();
        const complexityBuckets = {
            simple: { count: 0, durations: [] },
            moderate: { count: 0, durations: [] },
            complex: { count: 0, durations: [] },
            enterprise: { count: 0, durations: [] },
        };
        let totalEntries = 0;
        for (const entry of logEntries) {
            if (entry.category === "agent") {
                const complexity = entry.details?.complexity || 50;
                const duration = entry.details?.duration || 0;
                let bucket;
                if (complexity < 25)
                    bucket = "simple";
                else if (complexity < 50)
                    bucket = "moderate";
                else if (complexity < 75)
                    bucket = "complex";
                else
                    bucket = "enterprise";
                complexityBuckets[bucket].count++;
                if (duration > 0)
                    complexityBuckets[bucket].durations.push(duration);
                totalEntries++;
            }
        }
        return Object.entries(complexityBuckets).map(([level, data]) => ({
            level: level,
            count: data.count,
            percentage: totalEntries > 0 ? data.count / totalEntries : 0,
            avgDuration: data.durations.length > 0
                ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
                : 0,
        }));
    }
    detectAnomalies(metrics, delegation, voting) {
        const alerts = [];
        const thresholds = DEFAULT_DASHBOARD_CONFIG.anomalyDetection.thresholds;
        if (metrics.successRate < thresholds.successRateMin) {
            alerts.push({
                id: `anomaly-success-rate-${Date.now()}`,
                severity: metrics.successRate < thresholds.successRateMin * 0.5 ? "critical" : "warning",
                category: "orchestration",
                title: "Low Success Rate",
                message: `Success rate (${(metrics.successRate * 100).toFixed(1)}%) is below threshold (${(thresholds.successRateMin * 100).toFixed(1)}%)`,
                timestamp: Date.now(),
                metric: "successRate",
                threshold: thresholds.successRateMin,
                actualValue: metrics.successRate,
                resolved: false,
            });
        }
        if (metrics.failedSessions > metrics.completedSessions * thresholds.errorRateMax) {
            alerts.push({
                id: `anomaly-error-rate-${Date.now()}`,
                severity: "error",
                category: "orchestration",
                title: "High Error Rate",
                message: `Failed sessions (${metrics.failedSessions}) exceed acceptable threshold`,
                timestamp: Date.now(),
                metric: "failedSessions",
                threshold: metrics.completedSessions * thresholds.errorRateMax,
                actualValue: metrics.failedSessions,
                resolved: false,
            });
        }
        const highComplexityAgents = Object.entries(delegation.complexityByAgent)
            .filter(([_, complexity]) => complexity > thresholds.delegationDepthMax * 10)
            .map(([agent]) => agent);
        if (highComplexityAgents.length > 0) {
            alerts.push({
                id: `anomaly-high-complexity-${Date.now()}`,
                severity: "warning",
                category: "delegation",
                title: "High Complexity Tasks",
                message: `Agents handling unusually high complexity: ${highComplexityAgents.join(", ")}`,
                timestamp: Date.now(),
                agentsInvolved: highComplexityAgents,
                resolved: false,
            });
        }
        if (voting.avgConfidence < thresholds.votingConfidenceMin) {
            alerts.push({
                id: `anomaly-voting-confidence-${Date.now()}`,
                severity: "warning",
                category: "voting",
                title: "Low Voting Confidence",
                message: `Average voting confidence (${(voting.avgConfidence * 100).toFixed(1)}%) is below threshold`,
                timestamp: Date.now(),
                metric: "avgConfidence",
                threshold: thresholds.votingConfidenceMin,
                actualValue: voting.avgConfidence,
                resolved: false,
            });
        }
        return alerts;
    }
    async readLogEntries() {
        const entries = [];
        if (!fs.existsSync(this.logPath)) {
            return entries;
        }
        try {
            const content = fs.readFileSync(this.logPath, "utf-8");
            const lines = content.split("\n").filter((l) => l.trim());
            for (const line of lines) {
                try {
                    const parts = line.split("|").map((p) => p.trim());
                    if (parts.length >= 4) {
                        entries.push({
                            timestamp: parts[0].trim(),
                            category: parts[1].trim(),
                            action: parts[2].trim(),
                            level: parts[3].trim(),
                            details: parts.length > 4 ? JSON.parse(parts[4]) : undefined,
                        });
                    }
                    else if (parts.length >= 3) {
                        const categoryAction = parts[1].split(" ");
                        entries.push({
                            timestamp: parts[0].trim(),
                            category: categoryAction[0] || "unknown",
                            action: categoryAction.slice(1).join(" ") || parts[1],
                            level: parts[2].trim(),
                        });
                    }
                }
                catch { /* skip malformed lines */ }
            }
        }
        catch (error) {
            frameworkLogger.log("metrics-collector", "read-log-failed", "error", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return entries.slice(-5000);
    }
    async readReportData() {
        if (!fs.existsSync(this.reportPath)) {
            return { sessions: [], activities: [], stats: { total: 0, byCategory: {}, byLevel: {} } };
        }
        try {
            const content = fs.readFileSync(this.reportPath, "utf-8");
            return JSON.parse(content);
        }
        catch {
            return { sessions: [], activities: [], stats: { total: 0, byCategory: {}, byLevel: {} } };
        }
    }
    getCachedMetrics() {
        return this.cachedMetrics;
    }
    getLastCollectTime() {
        return this.lastCollectTime;
    }
}
export const createMetricsCollector = (cwd) => {
    return new MetricsCollector(cwd);
};
//# sourceMappingURL=metrics-collector.js.map