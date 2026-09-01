/**
 * Repertoire implementation of the 0xRay MemoryRoutingProvider contract.
 *
 * Loaded dynamically by 0xRay via features.json memory_routing.module_path.
 * Other providers can follow the same createMemoryRoutingProvider() export pattern.
 */
/** Mirrors 0xRay memory-routing/types.ts — kept local to avoid compile-time coupling */
export interface MemoryAgentCapability {
    capabilities: string[];
    complexityThreshold: number;
    concurrentTasks: number;
    memorySignals?: string[];
    memoryTags?: string[];
}
export interface MemoryOrchestrationTask {
    id: string;
    description: string;
    type: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    dependencies?: string[];
    estimatedComplexity?: number;
    metadata?: Record<string, unknown>;
}
export interface MemoryTaskConfidence {
    signals: Array<{
        name: string;
        confidence: number;
    }>;
    matchedSignals: string[];
    avgConfidence: number;
    maxConfidence: number;
    highConfidenceTrapPresent: boolean;
    ontologicalTrapDetected: boolean;
    complexityBoost: number;
    recommendedAgent: string | null;
}
export interface MemoryRoutingContext {
    providerId: string;
    matchedSignals: string[];
    matchedTags: string[];
    flags: Record<string, boolean>;
    synthesisAvailable: boolean;
    signalConfidences?: Record<string, number>;
    avgMatchConfidence?: number;
}
export interface MemoryInheritedContext {
    providerId: string;
    matchedSignals: Array<{
        name: string;
        definition: string;
        priority: string;
    }>;
    synthesisExcerpt?: string;
    flags: Record<string, boolean>;
}
export interface MemoryThinDispatchResult {
    agent: string;
    adjustedScore: number;
    context: MemoryRoutingContext;
}
export interface OrchestratorFeedbackEntry {
    timestamp: string;
    sessionId: string;
    taskId: string;
    assignedAgent: string;
    memorySignals: string[];
    complexity: number;
    success: boolean;
    durationMs: number;
    dynamoResult?: Record<string, unknown>;
}
export interface MemoryRoutingProviderConfig {
    dataDir?: string;
    signalsPath?: string;
    logDir?: string;
    statePath?: string;
    feedbackDir?: string;
    projectRoot?: string;
}
export interface MemoryRoutingProvider {
    readonly id: string;
    readonly name: string;
    isAvailable(): boolean;
    buildRoutingContext(operation: string): MemoryRoutingContext;
    enhanceAgentCapabilities(base: Map<string, MemoryAgentCapability>): Map<string, MemoryAgentCapability>;
    enrichTasks(tasks: MemoryOrchestrationTask[]): MemoryOrchestrationTask[];
    buildInheritedContext(tasks: MemoryOrchestrationTask[]): MemoryInheritedContext;
    selectAgent(capabilities: Map<string, MemoryAgentCapability>, requiredCapabilities: string[], complexity: number, operation: string): string | null;
    resolveThinDispatch(baseAgent: string, operation: string, complexityScore: number): MemoryThinDispatchResult;
    getTaskConfidence?(task: MemoryOrchestrationTask): MemoryTaskConfidence;
    ingestFeedback?(entry: OrchestratorFeedbackEntry): void;
    buildSynthesisContext?(opts: {
        projectRoot: string;
        dueReason?: string | null;
    }): Record<string, unknown> | null;
    refreshMetaInference?(): Promise<{
        refreshed: boolean;
    }>;
}
export type ProviderAvailabilityReason = 'ok' | 'empty_registry' | 'signals_unreadable' | 'signals_missing';
export interface ProviderAvailabilityStatus {
    available: boolean;
    reason: ProviderAvailabilityReason;
    signalCount: number;
    signalsPath: string;
}
export { resolveReadableConfigPath as resolveProviderConfigPath } from '../paths.js';
export declare class RepertoireMemoryRoutingProvider implements MemoryRoutingProvider {
    readonly id = "repertoire";
    readonly name = "Repertoire (deep memory + primitive registry)";
    private readonly service;
    readonly signalsPath: string;
    constructor(config?: MemoryRoutingProviderConfig);
    getAvailabilityStatus(): ProviderAvailabilityStatus;
    isAvailable(): boolean;
    buildRoutingContext(operation: string): MemoryRoutingContext;
    enhanceAgentCapabilities(base: Map<string, MemoryAgentCapability>): Map<string, MemoryAgentCapability>;
    enrichTasks(tasks: MemoryOrchestrationTask[]): MemoryOrchestrationTask[];
    buildInheritedContext(tasks: MemoryOrchestrationTask[]): MemoryInheritedContext;
    selectAgent(capabilities: Map<string, MemoryAgentCapability>, requiredCapabilities: string[], complexity: number, operation: string): string | null;
    resolveThinDispatch(baseAgent: string, operation: string, complexityScore: number): MemoryThinDispatchResult;
    getTaskConfidence(task: MemoryOrchestrationTask): MemoryTaskConfidence;
    ingestFeedback(entry: OrchestratorFeedbackEntry): {
        logPath: string;
        updatedSignals: Array<{
            signalName: string;
            previousAvgConfidence: number | null;
            updatedAvgConfidence: number | null;
        }>;
    };
    buildSynthesisContext(opts: {
        projectRoot: string;
        dueReason?: string | null;
    }): Record<string, unknown> | null;
    refreshMetaInference(): Promise<{
        refreshed: boolean;
    }>;
}
/** Factory export — 0xRay provider-loader calls this by name */
export declare function createMemoryRoutingProvider(config?: MemoryRoutingProviderConfig): MemoryRoutingProvider;
//# sourceMappingURL=memory-routing-provider.d.ts.map