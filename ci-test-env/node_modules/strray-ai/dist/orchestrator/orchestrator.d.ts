/**
 * Orchestrator Agent
 *
 * Coordinates multi-step tasks and delegates to specialized subagents.
 * Implements Sisyphus integration for relentless execution.
 *
 * @version 1.0.0
 * @since 2026-01-07
 */
export interface OrchestratorConfig {
    maxConcurrentTasks: number;
    taskTimeout: number;
    conflictResolutionStrategy: "majority_vote" | "expert_priority" | "consensus";
}
export interface TaskDefinition {
    id: string;
    description: string;
    subagentType: string;
    priority?: "high" | "medium" | "low";
    dependencies?: string[];
}
export interface TaskResult {
    success: boolean;
    result?: TaskExecutionResult;
    error?: string;
    duration: number;
    taskId?: string;
    taskType?: string;
    resolved?: boolean;
    resolutionStrategy?: string;
}
export interface TaskExecutionResult {
    fixesApplied?: number;
    testsOptimized?: number;
    performanceImprovement?: number;
    recommendations?: string[];
    [key: string]: unknown;
}
export interface TestFailureContext {
    failedTests: string[];
    timeoutIssues: string[];
    performanceIssues: string[];
    flakyTests: string[];
    errorLogs: string[];
    testExecutionTime: number;
    sessionId?: string;
}
export interface HealingStrategy {
    priorityLevel: "low" | "medium" | "high" | "critical";
    agentsNeeded: string[];
    estimatedTime: number;
    complexityScore: number;
    healingApproach: "simple" | "coordinated" | "enterprise";
}
export interface ConsolidationResult {
    success: boolean;
    fixesApplied: number;
    testsOptimized: number;
    performanceImprovement: number;
    recommendations: string[];
    summary: string;
}
export declare class StringRayOrchestrator {
    private config;
    private activeTasks;
    private taskToAgentMap;
    constructor(config?: Partial<OrchestratorConfig>);
    /**
     * Load orchestrator config from features.json
     */
    private loadOrchestratorConfig;
    /**
     * Map config key to enum value
     */
    private mapConflictResolution;
    /**
     * Execute a complex multi-step task
     */
    executeComplexTask(description: string, tasks: TaskDefinition[], sessionId?: string): Promise<TaskResult[]>;
    /**
     * Execute a single task by delegating to appropriate subagent
     */
    private executeSingleTask;
    /**
     * Auto-healing orchestration for test failures - coordinates multi-agent response
     */
    orchestrateTestAutoHealing(failureContext: TestFailureContext, sessionId?: string): Promise<{
        success: boolean;
        healingResult: any;
        agentCoordination: string[];
        performanceImprovement: number;
    }>;
    /**
     * Analyze test failure patterns to determine healing strategy
     */
    private analyzeTestFailurePatterns;
    /**
     * Create task definitions for healing orchestration
     */
    private createHealingTaskDefinitions;
    /**
     * Consolidate healing results from multiple agents
     */
    private consolidateHealingResults;
    /**
     * Delegate task to appropriate subagent using enhanced orchestration
     */
    private delegateToSubagent;
    /**
     * Resolve conflicts between subagent responses
     */
    resolveConflicts(conflicts: any[]): any;
    private resolveByMajorityVote;
    private resolveByExpertPriority;
    private resolveByConsensus;
    /**
     * Detect and resolve conflicts between task results in a batch.
     * This enables multi-agent governance by comparing results from parallel agents.
     *
     * Current implementation: Disabled by default - needs refinement to properly
     * detect actual conflicts vs. expected different results from different agent types.
     * Set ENABLE_CONFLICT_DETECTION=true to enable.
     */
    private detectAndResolveConflicts;
    /**
     * Populate expertiseScore based on agent type for expert_priority resolution.
     * This maps agent types to expertise levels for conflict resolution.
     */
    private populateExpertiseScore;
    /**
     * Get orchestrator status
     */
    getStatus(): {
        activeTasks: number;
        config: OrchestratorConfig;
    };
}
export declare const strRayOrchestrator: StringRayOrchestrator;
//# sourceMappingURL=orchestrator.d.ts.map