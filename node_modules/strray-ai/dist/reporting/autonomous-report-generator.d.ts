/**
 * Autonomous Report Generation System (Simplified)
 *
 * Automatically generates comprehensive diagnostic reports from framework logs
 * and activity data for self-directed monitoring and improvement.
 * This version works without advanced-features dependencies for initial deployment.
 *
 * @version 2.0.0
 * @since 2026-01-24
 */
export interface DiagnosticReport {
    reportId: string;
    timestamp: number;
    sessionDuration: number;
    totalLogEntries: number;
    newEntries: number;
    activityRate: number;
    agentsInvolved: AgentActivity[];
    pipelinesUsed: PipelineActivity[];
    testResults?: TestExecutionSummary;
    systemHealth: SystemHealthAssessment;
    criticalIssues: CriticalIssue[];
    cycleAnalysis?: CycleAnalysis;
    recommendations: Recommendation[];
    summary: SessionSummary;
}
export interface AgentActivity {
    agentType: string;
    invocations: number;
    executionMode: string;
    skillsTriggered?: string[];
    status: "success" | "warning" | "error";
    notes?: string;
}
export interface PipelineActivity {
    pipeline: string;
    purpose: string;
    executions: number;
    status: "active" | "inactive" | "error";
    notes?: string;
}
export interface TestExecutionSummary {
    category: string;
    tests: number;
    status: "passed" | "failed" | "partial";
    cycleTrend?: string;
    notes?: string;
}
export interface SystemHealthAssessment {
    memoryUsage: ComponentHealth;
    memoryAlerts: ComponentHealth;
    performanceBudget: ComponentHealth;
    frameworkInitialization: ComponentHealth;
    statePersistence: ComponentHealth;
    trends: HealthTrend[];
}
export interface ComponentHealth {
    status: "stable" | "warning" | "critical";
    currentIssues?: string;
    changeFromPrevious?: string;
    impact?: string;
}
export interface HealthTrend {
    metric: string;
    status: "improving" | "stable" | "worsening";
    description: string;
}
export interface CriticalIssue {
    id: string;
    category: "memory" | "performance" | "stability" | "security";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    rootCause?: string;
    impact: string;
    resolutionStatus: "resolved" | "partial" | "unresolved";
    recommendations: string[];
}
export interface CycleAnalysis {
    cycleNumber: number;
    testsPassed: number;
    memoryAlerts: number;
    keyIssues: string[];
    status: "improving" | "stable" | "worsening";
    trendAnalysis: string[];
}
export interface Recommendation {
    priority: "immediate" | "short-term" | "long-term";
    category: "investigation" | "fix" | "optimization" | "architecture";
    description: string;
    rationale: string;
    estimatedImpact: string;
    implementationComplexity: "low" | "medium" | "high";
}
export interface SessionSummary {
    overallStatus: "healthy" | "warning" | "critical";
    keyAchievements: string[];
    criticalUnresolvedIssues: string[];
    nextSteps: string[];
    recommendation: string;
}
/**
 * Simplified Autonomous Report Generation System
 *
 * Generates diagnostic reports without advanced-features dependencies
 * for initial deployment and testing.
 */
export declare class AutonomousReportGenerator {
    private reportHistory;
    private maxHistorySize;
    /**
     * Generate comprehensive diagnostic report automatically
     */
    generateDiagnosticReport(sessionId?: string): Promise<DiagnosticReport>;
    /**
     * Analyze framework logs for session metrics (simplified)
     */
    private analyzeLogs;
    /**
     * Analyze agent activities (simplified)
     */
    private analyzeAgentActivities;
    /**
     * Analyze pipeline operations (simplified)
     */
    private analyzePipelineOperations;
    /**
     * Assess system health (simplified)
     */
    private assessSystemHealth;
    /**
     * Identify critical issues (based on known problems)
     */
    private identifyCriticalIssues;
    /**
     * Perform cycle analysis
     */
    private performCycleAnalysis;
    /**
     * Generate recommendations
     */
    private generateRecommendations;
    /**
     * Generate session summary
     */
    private generateSessionSummary;
    /**
     * Store report in history
     */
    private storeReport;
    /**
     * Get report history
     */
    getReportHistory(): DiagnosticReport[];
    /**
     * Get latest report
     */
    getLatestReport(): DiagnosticReport | null;
    /**
     * Export report as formatted text (matches the format from bug-triage-specialist)
     */
    exportReportAsText(report: DiagnosticReport): string;
    /**
     * Schedule automatic report generation
     */
    scheduleAutomaticReports(intervalMinutes?: number): void;
}
/**
 * Export singleton instance
 */
export declare const autonomousReportGenerator: AutonomousReportGenerator;
//# sourceMappingURL=autonomous-report-generator.d.ts.map