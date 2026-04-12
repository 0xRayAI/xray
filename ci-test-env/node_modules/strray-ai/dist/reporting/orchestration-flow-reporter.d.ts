export interface OrchestrationFlowReport {
    jobId: string;
    sessionId: string;
    timestamp: string;
    agents: {
        agent: string;
        activities: string[];
        status: string;
        jobCorrelation: string;
    }[];
    pipelines: {
        pipeline: string;
        executions: number;
        status: string;
        jobCorrelation: string;
    }[];
    performance: {
        executionTime: number;
        successRate: number;
        memoryUsage: number;
        agentPerformance: Record<string, number>;
    };
}
export declare class OrchestrationFlowReporter {
    /**
     * Generate comprehensive orchestration flow report with job correlation
     */
    generateOrchestrationReport(jobId?: string): Promise<OrchestrationFlowReport>;
    private getSampleAgentActivities;
    private getSamplePipelineData;
    private getSamplePerformanceMetrics;
    exportReportAsText(report: OrchestrationFlowReport): Promise<string>;
}
export declare const orchestrationFlowReporter: OrchestrationFlowReporter;
//# sourceMappingURL=orchestration-flow-reporter.d.ts.map