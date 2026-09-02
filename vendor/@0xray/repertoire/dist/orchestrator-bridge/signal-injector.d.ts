import type { OrchestrationTask, RepertoireInheritedContext, RepertoireRoutingContext, SynthesisCollocatedContext } from '../types.js';
import { CuratedSignalsManager } from '../registry/CuratedSignalsManager.js';
import { getConfidenceForTask } from './confidence-gate.js';
export declare class SignalInjector {
    private readonly signalsManager;
    private readonly projectRoot;
    private readonly synthesisReportPath?;
    constructor(signalsManager: CuratedSignalsManager, projectRoot?: string, synthesisReportPath?: string | undefined);
    buildRoutingContext(text: string): RepertoireRoutingContext;
    matchSignalsForTasks(tasks: OrchestrationTask[]): OrchestrationTask[];
    buildSynthesisContext(projectRoot: string, dueReason?: string | null): SynthesisCollocatedContext;
    buildInheritedContext(tasks: OrchestrationTask[]): RepertoireInheritedContext;
    /**
     * Signal-aware agent scoring — drop-in replacement logic for AgentCapabilitiesManager.
     */
    scoreAgent(agent: string, caps: {
        capabilities: string[];
        concurrentTasks: number;
        repertoireSignals?: string[];
        repertoireTags?: string[];
    }, requiredCapabilities: string[], repertoireContext: RepertoireRoutingContext, confidenceContext?: ReturnType<typeof getConfidenceForTask>): number;
    /**
     * Complexity adjustment for thinDispatch when Repertoire context is present.
     */
    adjustComplexityScore(baseScore: number, context: RepertoireRoutingContext, confidenceContext?: ReturnType<typeof getConfidenceForTask>): number;
    private resolveSynthesisReportPath;
    private getSynthesisExcerpt;
    private readCodexExcerpt;
    private readPlanExcerpt;
}
//# sourceMappingURL=signal-injector.d.ts.map