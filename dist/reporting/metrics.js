export function calculateTimeRange(logs, timeRange) {
    if (logs.length === 0) {
        return { start: new Date(), end: new Date() };
    }
    const timestamps = logs.map((log) => log.timestamp);
    return {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps)),
    };
}
export function calculateMetrics(logs) {
    const agentUsage = new Map();
    const complexityDistribution = new Map();
    const commandUsage = new Map();
    const toolSuccessRate = new Map();
    let totalDelegations = 0;
    let contextOperations = 0;
    let enhancementFailures = 0;
    let enhancementSuccesses = 0;
    let fileOperations = 0;
    let searchOperations = 0;
    let terminalOperations = 0;
    let analysisOperations = 0;
    let orchestrationOperations = 0;
    const responseTimes = [];
    for (const log of logs) {
        if (log.agent) {
            agentUsage.set(log.agent, (agentUsage.get(log.agent) || 0) + 1);
        }
        if (log.action === "delegation decision made") {
            totalDelegations++;
            orchestrationOperations++;
        }
        if (log.component.includes("context") || log.component.includes("ast")) {
            contextOperations++;
            analysisOperations++;
        }
        if (log.action === "context-enhancement-failed") {
            enhancementFailures++;
        }
        if (log.component === "complexity-analyzer" && log.status === "success") {
            enhancementSuccesses++;
        }
        if (log.component === "framework-activity") {
            const toolName = log.details?.tool || log.action;
            commandUsage.set(toolName, (commandUsage.get(toolName) || 0) + 1);
            if (!toolSuccessRate.has(toolName)) {
                toolSuccessRate.set(toolName, { success: 0, total: 0, rate: 0 });
            }
            const toolStats = toolSuccessRate.get(toolName);
            toolStats.total++;
            if (log.status === "success") {
                toolStats.success++;
            }
            toolStats.rate =
                toolStats.total > 0 ? (toolStats.success / toolStats.total) * 100 : 0;
            if (["write", "edit", "read"].includes(toolName)) {
                fileOperations++;
            }
            else if (["grep", "glob"].includes(toolName)) {
                searchOperations++;
            }
            else if (toolName === "bash") {
                terminalOperations++;
            }
        }
        if (log.component.includes("analyzer") ||
            log.action.includes("analysis")) {
            analysisOperations++;
        }
    }
    toolSuccessRate.forEach((stats) => {
        stats.rate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
    });
    const successLogs = logs.filter((log) => log.status === "success");
    const errorLogs = logs.filter((log) => log.status === "error");
    const successRate = logs.length > 0 ? (successLogs.length / logs.length) * 100 : 100;
    const enhancementSuccessRate = enhancementSuccesses + enhancementFailures > 0
        ? (enhancementSuccesses /
            (enhancementSuccesses + enhancementFailures)) *
            100
        : 100;
    let mostUsedTool = "";
    let maxUsage = 0;
    for (const [tool, count] of commandUsage) {
        if (count > maxUsage) {
            maxUsage = count;
            mostUsedTool = tool;
        }
    }
    return {
        totalDelegations,
        agentUsage,
        complexityDistribution,
        successRate,
        averageResponseTime: responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b) / responseTimes.length
            : 0,
        contextOperations,
        enhancementSuccessRate,
        commandUsage,
        toolExecutionStats: {
            totalCommands: Array.from(commandUsage.values()).reduce((sum, count) => sum + count, 0),
            uniqueTools: commandUsage.size,
            mostUsedTool,
            toolSuccessRate,
        },
        systemOperationDetails: {
            fileOperations,
            searchOperations,
            terminalOperations,
            analysisOperations,
            orchestrationOperations,
        },
    };
}
export function calculatePeakActivity(logs) {
    const minuteGroups = new Map();
    for (const log of logs) {
        const minute = new Date(log.timestamp).toISOString().slice(0, 16);
        minuteGroups.set(minute, (minuteGroups.get(minute) || 0) + 1);
    }
    let peakMinute = "";
    let peakCount = 0;
    for (const [minute, count] of minuteGroups) {
        if (count > peakCount) {
            peakCount = count;
            peakMinute = minute;
        }
    }
    return {
        timestamp: peakMinute ? new Date(peakMinute + ":00Z") : new Date(),
        eventsPerMinute: peakCount,
    };
}
export function calculateHealthScore(logs) {
    const successCount = logs.filter((log) => log.status === "success").length;
    const errorCount = logs.filter((log) => log.status === "error").length;
    if (successCount + errorCount === 0)
        return 100;
    return (successCount / (successCount + errorCount)) * 100;
}
export function generateInsights(logs, metrics) {
    const insights = [];
    if (metrics.totalDelegations > 0) {
        insights.push(`Successfully orchestrated ${metrics.totalDelegations} agent delegations`);
    }
    if (metrics.contextOperations > 0) {
        insights.push(`Performed ${metrics.contextOperations} context awareness operations`);
    }
    if (metrics.successRate > 95) {
        insights.push(`Excellent system health with ${metrics.successRate.toFixed(1)}% success rate`);
    }
    const mostUsedAgent = Array.from(metrics.agentUsage.entries()).sort((a, b) => b[1] - a[1])[0];
    if (mostUsedAgent) {
        insights.push(`Primary agent: ${mostUsedAgent[0]} (${mostUsedAgent[1]} invocations)`);
    }
    return insights;
}
export function generateRecommendations(metrics) {
    const recommendations = [];
    if (metrics.successRate < 95) {
        recommendations.push("Investigate and resolve error conditions to improve system reliability");
    }
    if (metrics.totalDelegations === 0) {
        recommendations.push("Consider running delegation scenarios to test agent orchestration");
    }
    if (metrics.contextOperations === 0) {
        recommendations.push("Enable context awareness features for enhanced intelligence");
    }
    if (metrics.agentUsage.size === 0) {
        recommendations.push("Run agent-based operations to populate usage analytics");
    }
    return recommendations;
}
export function generateAlerts(logs) {
    const alerts = [];
    const recentErrors = logs
        .filter((log) => log.status === "error")
        .slice(0, 3);
    for (const error of recentErrors) {
        alerts.push(`${error.component}:${error.action} failed`);
    }
    const highFrequencyComponents = getHighFrequencyComponents(logs);
    for (const component of highFrequencyComponents) {
        alerts.push(`High activity detected in ${component}`);
    }
    return alerts;
}
export function getHighFrequencyComponents(logs) {
    const componentCounts = new Map();
    const timeWindowMs = 5 * 60 * 1000;
    const cutoffTime = Date.now() - timeWindowMs;
    for (const log of logs) {
        if (log.timestamp > cutoffTime) {
            componentCounts.set(log.component, (componentCounts.get(log.component) || 0) + 1);
        }
    }
    return Array.from(componentCounts.entries())
        .filter(([, count]) => count > 10)
        .map(([component]) => component);
}
//# sourceMappingURL=metrics.js.map