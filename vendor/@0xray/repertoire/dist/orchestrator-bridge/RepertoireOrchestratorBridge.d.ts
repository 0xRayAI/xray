import type { AgentCapability, ExecutionPlan, OrchestrationTask, RepertoireInheritedContext, RepertoireRoutingContext, SynthesisCollocatedContext, TaskConfidenceContext } from '../types.js';
import { CuratedSignalsManager } from '../registry/CuratedSignalsManager.js';
export declare class RepertoireOrchestratorBridge {
    private readonly signalsManager;
    private readonly enhancer;
    private readonly injector;
    constructor(signalsManager: CuratedSignalsManager);
    enhanceAgentCapabilities(baseCapabilities: Map<string, AgentCapability>): Map<string, AgentCapability>;
    buildRoutingContext(operation: string): RepertoireRoutingContext;
    getConfidenceForTask(task: OrchestrationTask): TaskConfidenceContext;
    injectSignalsIntoTasks(tasks: OrchestrationTask[]): OrchestrationTask[];
    buildInheritedContext(tasks: OrchestrationTask[]): RepertoireInheritedContext;
    buildSynthesisContext(projectRoot: string, dueReason?: string | null): SynthesisCollocatedContext;
    enrichExecutionPlan(plan: ExecutionPlan, tasks: OrchestrationTask[]): ExecutionPlan;
    selectAgentForTask(capabilities: Map<string, AgentCapability>, requiredCapabilities: string[], complexity: number, operationDescription: string, task?: OrchestrationTask): string | null;
    /**
     * High-confidence trap tasks route to recommendedAgent (default architect)
     * without applying complexityThreshold — boost is for scoring, not exclusion.
     */
    resolveTrapCapableAgent(confidenceContext: TaskConfidenceContext, capabilities: Map<string, AgentCapability>): string | null;
    resolveThinDispatchAgent(baseAgent: string, operation: string, complexityScore: number): {
        agent: string;
        adjustedScore: number;
        repertoireContext: RepertoireRoutingContext;
    };
}
//# sourceMappingURL=RepertoireOrchestratorBridge.d.ts.map