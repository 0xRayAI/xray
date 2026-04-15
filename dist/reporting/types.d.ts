export interface ParsedLogEntry {
    timestamp: number;
    component: string;
    action: string;
    message: string;
    level: string;
    status: string;
    agent: string;
    jobId: string | null;
    sessionId?: string | undefined;
    details?: Record<string, unknown> | undefined;
}
export interface ReportConfig {
    type: "orchestration" | "agent-usage" | "context-awareness" | "performance" | "full-analysis";
    sessionId?: string;
    jobId?: string;
    timeRange?: {
        start?: Date;
        end?: Date;
        lastHours?: number;
    };
    outputFormat: "markdown" | "json" | "html";
    outputPath?: string;
    includeCharts?: boolean;
    detailedMetrics?: boolean;
}
export interface OrchestrationMetrics {
    totalDelegations: number;
    agentUsage: Map<string, number>;
    complexityDistribution: Map<string, number>;
    successRate: number;
    averageResponseTime: number;
    contextOperations: number;
    enhancementSuccessRate: number;
    commandUsage: Map<string, number>;
    toolExecutionStats: {
        totalCommands: number;
        uniqueTools: number;
        mostUsedTool: string;
        toolSuccessRate: Map<string, {
            success: number;
            total: number;
            rate: number;
        }>;
    };
    systemOperationDetails: {
        fileOperations: number;
        searchOperations: number;
        terminalOperations: number;
        analysisOperations: number;
        orchestrationOperations: number;
    };
}
export interface ReportData {
    generatedAt: Date;
    timeRange: {
        start: Date;
        end: Date;
    };
    metrics: OrchestrationMetrics;
    chronologicalEvents: ParsedLogEntry[];
    insights: string[];
    recommendations: string[];
    summary: {
        totalEvents: number;
        activeComponents: string[];
        peakActivity: {
            timestamp: Date;
            eventsPerMinute: number;
        };
        healthScore: number;
    };
}
export interface RealtimeStatus {
    activeComponents: string[];
    recentActivity: ParsedLogEntry[];
    healthScore: number;
    alerts: string[];
}
export interface ScheduleConfig {
    frequency: "hourly" | "daily" | "weekly";
    types: ReportConfig["type"][];
    outputDir: string;
    retentionDays: number;
}
export interface CustomReportTemplate {
    name: string;
    filters: {
        components?: string[];
        actions?: string[];
        status?: string[];
        timeRange?: {
            start: Date;
            end: Date;
        };
    };
    aggregations: {
        groupBy: "component" | "action" | "status" | "hour";
        metrics: ("count" | "avgResponseTime" | "successRate")[];
    };
    visualizations: ("timeline" | "pie-chart" | "bar-chart")[];
}
//# sourceMappingURL=types.d.ts.map