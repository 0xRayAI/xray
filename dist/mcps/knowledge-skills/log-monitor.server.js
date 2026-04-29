/**
 * Log Monitor MCP Server
 *
 * Comprehensive log analysis, pattern detection, and alerting system.
 * Monitors application logs for errors, anomalies, security threats,
 * and performance issues in real-time.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
class LogMonitorServer {
    server;
    patternLibrary = [
        {
            id: "memory-leak",
            name: "Memory Leak Detection",
            pattern: "(?:memory|heap|out of memory|OOM)",
            severity: "critical",
            description: "Potential memory leak detected",
            occurrences: 0,
            lastSeen: "",
        },
        {
            id: "unhandled-exception",
            name: "Unhandled Exception",
            pattern: "(?:unhandled|uncaught|exception|error)",
            severity: "high",
            description: "Unhandled exception in application",
            occurrences: 0,
            lastSeen: "",
        },
        {
            id: "slow-query",
            name: "Slow Database Query",
            pattern: "(?:sql|slow query|database.*timeout)",
            severity: "medium",
            description: "Slow database query detected",
            occurrences: 0,
            lastSeen: "",
        },
        {
            id: "auth-failure",
            name: "Authentication Failure",
            pattern: "(?:auth|fail|invalid.*token|unauthorized)",
            severity: "high",
            description: "Authentication failure detected",
            occurrences: 0,
            lastSeen: "",
        },
        {
            id: "rate-limit",
            name: "Rate Limiting",
            pattern: "(?:rate.*limit|too.*many.*request|429)",
            severity: "medium",
            description: "Rate limit exceeded",
            occurrences: 0,
            lastSeen: "",
        },
    ];
    constructor() {
        this.server = new Server({ name: "log-monitor", version: "1.22.47" }, { capabilities: { tools: {} } });
        this.setupToolHandlers();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "analyze_logs",
                    description: "Analyze log entries to identify patterns, errors, and anomalies",
                    inputSchema: {
                        type: "object",
                        properties: {
                            logs: {
                                type: "array",
                                items: { type: "string" },
                                description: "Log entries to analyze",
                            },
                            options: {
                                type: "object",
                                properties: {
                                    detectPatterns: { type: "boolean", default: true },
                                    findAnomalies: { type: "boolean", default: true },
                                    timeRange: {
                                        type: "string",
                                        description: "Time range to analyze",
                                    },
                                },
                            },
                        },
                        required: ["logs"],
                    },
                },
                {
                    name: "detect_patterns",
                    description: "Detect specific patterns in logs using regex or predefined patterns",
                    inputSchema: {
                        type: "object",
                        properties: {
                            logs: { type: "array", items: { type: "string" } },
                            customPatterns: { type: "array", items: { type: "string" } },
                            sensitivity: {
                                type: "number",
                                minimum: 0,
                                maximum: 100,
                                default: 80,
                            },
                        },
                        required: ["logs"],
                    },
                },
                {
                    name: "alert_on_issues",
                    description: "Generate alerts based on log analysis thresholds",
                    inputSchema: {
                        type: "object",
                        properties: {
                            analysis: {
                                type: "object",
                                description: "Results from analyze_logs",
                            },
                            thresholds: {
                                type: "object",
                                properties: {
                                    errorRate: { type: "number" },
                                    warnRate: { type: "number" },
                                    criticalPatterns: {
                                        type: "array",
                                        items: { type: "string" },
                                    },
                                },
                            },
                        },
                        required: ["analysis"],
                    },
                },
                {
                    name: "correlate_events",
                    description: "Correlate log entries across multiple sources to find related events",
                    inputSchema: {
                        type: "object",
                        properties: {
                            logSets: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        source: { type: "string" },
                                        logs: { type: "array", items: { type: "string" } },
                                    },
                                },
                            },
                            timeWindow: {
                                type: "number",
                                description: "Time window in seconds",
                            },
                        },
                        required: ["logSets"],
                    },
                },
                {
                    name: "generate_report",
                    description: "Generate a comprehensive log analysis report",
                    inputSchema: {
                        type: "object",
                        properties: {
                            analysis: { type: "object" },
                            format: {
                                type: "string",
                                enum: ["json", "markdown", "html"],
                                default: "json",
                            },
                        },
                        required: ["analysis"],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args = {} } = request.params;
            try {
                const params = args;
                switch (name) {
                    case "analyze_logs": {
                        const result = this.analyzeLogs(params.logs || [], params.options || {});
                        return {
                            content: [
                                { type: "text", text: JSON.stringify(result, null, 2) },
                            ],
                        };
                    }
                    case "detect_patterns": {
                        const result = this.detectPatterns(params.logs || [], params.customPatterns || [], params.sensitivity || 80);
                        return {
                            content: [
                                { type: "text", text: JSON.stringify(result, null, 2) },
                            ],
                        };
                    }
                    case "alert_on_issues": {
                        const result = this.alertOnIssues(params.analysis, params.thresholds || {});
                        return {
                            content: [
                                { type: "text", text: JSON.stringify(result, null, 2) },
                            ],
                        };
                    }
                    case "correlate_events": {
                        const result = this.correlateEvents(params.logSets ||
                            [], params.timeWindow || 60);
                        return {
                            content: [
                                { type: "text", text: JSON.stringify(result, null, 2) },
                            ],
                        };
                    }
                    case "generate_report": {
                        const result = this.generateReport(params.analysis, params.format || "json");
                        return {
                            content: [
                                { type: "text", text: JSON.stringify(result, null, 2) },
                            ],
                        };
                    }
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [{ type: "text", text: `Error: ${error}` }],
                    isError: true,
                };
            }
        });
    }
    analyzeLogs(logs, options) {
        const entries = logs.map(this.parseLogEntry);
        const summary = {
            totalEntries: entries.length,
            errorCount: entries.filter((e) => e.level === "error").length,
            warnCount: entries.filter((e) => e.level === "warn").length,
            infoCount: entries.filter((e) => e.level === "info").length,
            timeRange: {
                start: entries[0]?.timestamp || new Date().toISOString(),
                end: entries[entries.length - 1]?.timestamp || new Date().toISOString(),
            },
        };
        const patterns = this.detectPatternsInLogs(entries);
        const anomalies = this.detectAnomalies(entries, summary);
        const recommendations = this.generateRecommendations(summary, patterns, anomalies);
        return { summary, patterns, anomalies, recommendations };
    }
    detectPatterns(logs, customPatterns, sensitivity) {
        const entries = logs.map(this.parseLogEntry);
        const matched = this.detectPatternsInLogs(entries);
        const custom = customPatterns.map((pattern, idx) => {
            const regex = new RegExp(pattern, "i");
            const matches = entries.filter((e) => regex.test(e.message));
            return {
                id: `custom-${idx}`,
                pattern,
                matches: matches.length,
                examples: matches.slice(0, 3).map((m) => m.message),
            };
        });
        return { matched, custom };
    }
    alertOnIssues(analysis, thresholds) {
        const alerts = [];
        if (thresholds.errorRate) {
            const errorRate = (analysis.summary.errorCount / analysis.summary.totalEntries) * 100;
            if (errorRate > thresholds.errorRate) {
                alerts.push({
                    severity: "critical",
                    message: `Error rate (${errorRate.toFixed(1)}%) exceeds threshold (${thresholds.errorRate}%)`,
                    action: "Investigate recent errors immediately",
                });
            }
        }
        if (thresholds.criticalPatterns) {
            const criticalFound = analysis.patterns.filter((p) => thresholds.criticalPatterns.includes(p.id) && p.occurrences > 0);
            criticalFound.forEach((p) => {
                alerts.push({
                    severity: "critical",
                    message: `Critical pattern detected: ${p.name} (${p.occurrences} times)`,
                    action: p.description,
                });
            });
        }
        const criticalPatterns = analysis.patterns.filter((p) => p.severity === "critical" && p.occurrences > 0);
        if (criticalPatterns.length > 0) {
            alerts.push({
                severity: "high",
                message: `${criticalPatterns.length} critical pattern(s) detected`,
                action: "Review patterns and take immediate action",
            });
        }
        return {
            triggered: alerts.length > 0,
            alerts,
            summary: alerts.length > 0
                ? "Immediate action required"
                : "All thresholds passed",
        };
    }
    correlateEvents(logSets, timeWindow) {
        const allEntries = [];
        logSets.forEach((set) => {
            set.logs.forEach((log) => {
                allEntries.push({ ...this.parseLogEntry(log), source: set.source });
            });
        });
        allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const correlations = [];
        const errorEntries = allEntries.filter((e) => e.level === "error");
        errorEntries.forEach((error) => {
            const errorTime = new Date(error.timestamp).getTime();
            const related = allEntries.filter((e) => {
                const entryTime = new Date(e.timestamp).getTime();
                return (Math.abs(entryTime - errorTime) <= timeWindow * 1000 && e !== error);
            });
            if (related.length > 0) {
                correlations.push({
                    time: error.timestamp,
                    events: [
                        { source: error.source, message: error.message },
                        ...related
                            .slice(0, 5)
                            .map((e) => ({ source: e.source, message: e.message })),
                    ],
                    severity: "high",
                    description: `Found ${related.length + 1} related events within ${timeWindow}s`,
                });
            }
        });
        return {
            totalEvents: allEntries.length,
            correlations: correlations.slice(0, 10),
            summary: {
                total: correlations.length,
                bySeverity: correlations.reduce((acc, c) => {
                    acc[c.severity] = (acc[c.severity] || 0) + 1;
                    return acc;
                }, {}),
            },
        };
    }
    generateReport(analysis, format) {
        if (format === "markdown") {
            return {
                format: "markdown",
                content: `# Log Analysis Report

## Summary
- Total Entries: ${analysis.summary.totalEntries}
- Errors: ${analysis.summary.errorCount}
- Warnings: ${analysis.summary.warnCount}

## Patterns Detected
${analysis.patterns.map((p) => `- **${p.name}**: ${p.occurrences} occurrences`).join("\n")}

## Anomalies
${analysis.anomalies.map((a) => `- ${a.severity}: ${a.description}`).join("\n")}

## Recommendations
${analysis.recommendations.map((r) => `- ${r}`).join("\n")}
`,
            };
        }
        return analysis;
    }
    // Helper methods
    parseLogEntry(log) {
        const match = log.match(/^(\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\]?)\s*\[?(\w+)\]?\s*(.+)/);
        return match && match[2] && match[3] && match[4]
            ? {
                timestamp: match[2],
                level: match[3].toLowerCase() || "info",
                message: match[4],
            }
            : {
                timestamp: new Date().toISOString(),
                level: "info",
                message: log,
            };
    }
    detectPatternsInLogs(entries) {
        return this.patternLibrary.map((pattern) => {
            const regex = new RegExp(pattern.pattern, "i");
            const matches = entries.filter((e) => regex.test(e.message));
            return {
                ...pattern,
                occurrences: matches.length,
                lastSeen: matches[0]?.timestamp || "",
            };
        });
    }
    detectAnomalies(entries, summary) {
        const anomalies = [];
        // Spike detection
        if (summary.errorCount > summary.totalEntries * 0.1) {
            anomalies.push({
                type: "error_spike",
                description: "Error rate is abnormally high",
                severity: "critical",
                count: summary.errorCount,
            });
        }
        // Unusual patterns
        const uniqueMessages = new Set(entries.map((e) => e.message));
        if (uniqueMessages.size < entries.length * 0.1) {
            anomalies.push({
                type: "repeating_errors",
                description: "Same error occurring repeatedly",
                severity: "high",
                count: entries.length - uniqueMessages.size,
            });
        }
        return anomalies;
    }
    generateRecommendations(summary, patterns, anomalies) {
        const recs = [];
        if (summary.errorCount > summary.totalEntries * 0.1) {
            recs.push("Investigate error spike immediately - check recent deployments");
        }
        const critical = patterns.filter((p) => p.severity === "critical" && p.occurrences > 0);
        if (critical.length > 0) {
            recs.push(`Address critical patterns: ${critical.map((c) => c.name).join(", ")}`);
        }
        const high = patterns.filter((p) => p.severity === "high" && p.occurrences > 0);
        if (high.length > 0) {
            recs.push(`Review high severity issues: ${high.map((h) => h.name).join(", ")}`);
        }
        if (recs.length === 0) {
            recs.push("No critical issues detected - continue monitoring");
        }
        return recs;
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}
const server = new LogMonitorServer();
server.run();
//# sourceMappingURL=log-monitor.server.js.map