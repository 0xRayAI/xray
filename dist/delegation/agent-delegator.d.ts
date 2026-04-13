/**
 * Agent Delegator
 *
 * Intelligent agent delegation system that uses complexity analysis to determine
 * optimal task distribution strategies and conflict resolution.
 *
 * Integrates with TaskSkillRouter for keyword-based preprocessing.
 *
 * @version 1.1.0
 * @since 2026-01-07
 */
import { ComplexityScore } from "./complexity-analyzer.js";
import { StringRayStateManager } from "../state/state-manager.js";
import { strRayConfigLoader } from "../core/config-loader.js";
export interface AgentCapability {
    name: string;
    capabilities: string[];
    status: "active" | "inactive";
    [key: string]: string | string[] | boolean | number;
}
export interface DelegationContext {
    workingDirectory?: string;
    availableTools?: string[];
    isDelegated?: boolean;
    files?: string[];
    dependencies?: string[];
    changeVolume?: number;
    riskLevel?: string;
    [key: string]: unknown;
}
export interface DelegationResponse {
    agent: string;
    operation: string;
    description: string;
    capabilities: string[];
    mode: string;
    status: string;
    timestamp: string;
    message: string;
}
export interface DelegationRequest {
    operation: string;
    description: string;
    context?: DelegationContext;
    sessionId?: string;
}
export interface DelegationAnalysis {
    strategy: "single-agent" | "multi-agent" | "orchestrator-led";
    agents: string[];
    agentDetails: Array<{
        name: string;
        confidence: number;
        role: string;
    }>;
    complexity: ComplexityScore;
    conflictResolution: "majority_vote" | "expert_priority" | "consensus";
    estimatedDuration: number;
    metrics?: Record<string, string | number | boolean>;
}
export interface DelegationResult {
    success: boolean;
    results: Array<{
        agent: string;
        output: DelegationResponse;
        executionTime: number;
    }>;
    totalTime: number;
    errors?: string[] | undefined;
    agents?: string[];
}
export interface PerformanceMetrics {
    totalDelegations: number;
    successfulDelegations: number;
    failedDelegations: number;
    averageExecutionTime: number;
    averageResponseTime: number;
    averageComplexity: number;
    averageDuration: number;
    strategyUsage: Record<string, number>;
    agentUtilization: Record<string, number>;
}
export interface DelegationMetrics extends PerformanceMetrics {
    recentDelegations: Array<{
        timestamp: number;
        operation: string;
        strategy: string;
        success: boolean;
        totalTime: number;
    }>;
}
/**
 * AgentDelegator class for intelligent task delegation
 */
export declare class AgentDelegator {
    private complexityAnalyzer;
    private stateManager;
    private configLoader;
    private kernel;
    /** Minimum confidence for a learned mapping to override hardcoded routing. */
    private static readonly MAPPING_CONFIDENCE_THRESHOLD;
    constructor(stateManager: StringRayStateManager, configLoader: typeof strRayConfigLoader);
    /**
     * Load routing-mappings.json from disk (fresh each call — picks up tuner writes).
     * Same path resolution as inference-tuner.ts.
     */
    private loadRoutingMappings;
    /**
     * Match a task description against learned keyword mappings.
     * Returns the best matching mapping if any keyword hits above threshold.
     */
    private matchRoutingMappings;
    getAvailableAgents(): AgentCapability[];
    /**
     * Pre-process a task description using TaskSkillRouter
     * This extracts operation type and context from natural language descriptions
     * before running complexity analysis
     */
    preprocessTaskDescription(description: string, options?: {
        sessionId?: string;
        taskId?: string;
        complexity?: number;
    }): {
        operation: string;
        context: Record<string, unknown>;
        suggestedAgent: string;
        suggestedSkill: string;
        confidence: number;
    };
    analyzeDelegation(request: DelegationRequest): Promise<DelegationAnalysis>;
    private determineAgents;
    private mapOperationToType;
    /**
     * Record analysis results for learning system
     */
    private recordAnalysisForLearning;
    private determineConflictResolution;
    /**
   * Resolve the project directory for delegated agents
   * Ensures working directory is set correctly (src/ vs dist/ vs project root)
   */
    private resolveProjectDirectory;
    /**
     * Allowlist of valid agent names for dynamic imports
     * Prevents path traversal and unauthorized agent loading
     */
    private static readonly ALLOWED_AGENTS;
    /**
     * Validate agent name for security
     * @throws Error if agent name is invalid or not allowed
     */
    private validateAgentName;
    /**
     * Create a properly configured agent with full tool access and working directory context
     */
    private createProperlyConfiguredAgent;
    /**
     * Clear agent-stub creation and deprecated features
     * Remove this method if it exists in the future version
     */
    private clearDeprecatedStubAgent;
    executeDelegation(analysis: DelegationAnalysis, request: DelegationRequest): Promise<DelegationResult>;
    getPerformanceMetrics(): PerformanceMetrics;
    getDelegationMetrics(): DelegationMetrics;
    updateAgentCapability(agentName: string, capabilities: Partial<AgentCapability>): void;
}
export declare function createAgentDelegator(stateManager: StringRayStateManager, configLoader: typeof strRayConfigLoader): AgentDelegator;
//# sourceMappingURL=agent-delegator.d.ts.map