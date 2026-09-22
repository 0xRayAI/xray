import { CuratedSignalsManager, type FeedbackOutcomeResult } from './registry/CuratedSignalsManager.js';
import { InferenceStateManager } from './registry/InferenceStateManager.js';
import { MetaInferenceEngine } from './synthesis/meta-inference-engine.js';
import { OrchestratorFeedbackIngester } from './ingestion/orchestrator-feedback-ingester.js';
import { RepertoireOrchestratorBridge } from './orchestrator-bridge/RepertoireOrchestratorBridge.js';
import { OntologicalTrapEnforcer, type GovernWithSolarFn } from './governance/ontological-trap-enforcer.js';
import { type KernelDiaryCollect, type OpProcReload } from './paths.js';
import type { AgentCapability, CuratedSignal, ExecutionPlan, OrchestrationTask, OrchestratorFeedbackEntry, RepertoireInheritedContext, RepertoireRoutingContext, SynthesisReport, TaskConfidenceContext } from './types.js';
export interface RepertoireServiceOptions {
    dataDir?: string;
    logDir?: string;
    signalsPath?: string;
    statePath?: string;
    feedbackDir?: string;
    projectRoot?: string;
    /** Grow dest from sibling field JSONL. Default on outside Vitest. */
    syncField?: boolean;
    /** Grow dest from 0xRay session-capture + sibling repo map. Default on outside Vitest. */
    syncXray?: boolean;
}
export declare class RepertoireService {
    readonly signalsManager: CuratedSignalsManager;
    readonly stateManager: InferenceStateManager;
    readonly orchestratorBridge: RepertoireOrchestratorBridge;
    readonly metaInference: MetaInferenceEngine;
    readonly feedbackIngester: OrchestratorFeedbackIngester;
    private readonly logDir;
    private readonly projectRoot;
    constructor(options?: RepertoireServiceOptions);
    syncFieldMemory(sourceDirs?: string[]): {
        imported: number;
        skipped: number;
        promoted: string[];
        sources: string[];
    };
    ingestGrooverLogs(sourceDir: string, options?: {
        dryRun?: boolean;
    }): {
        imported: number;
        skipped: number;
        promoted: string[];
    };
    ingestXraySessions(sourceDir: string, options?: {
        repoPrimitive?: string;
    }): {
        imported: number;
        skipped: number;
        promoted: string[];
    };
    syncXrayMemory(sourceDirs?: string[]): {
        imported: number;
        skipped: number;
        promoted: string[];
        sources: string[];
    };
    syncWorkspaceRepos(): {
        observed: string[];
        fleshed: string[];
        sources: string[];
    };
    /**
     * Heat existing dest names from kernel diary text. No new names.
     * Colon pattern ids like `architect:architect_skill` never become dest keys.
     */
    heatKernelDiary(collected?: KernelDiaryCollect): {
        heated: string[];
        sources: string[];
    };
    reloadOpProc(): OpProcReload;
    ingestOrchestratorFeedback(entry: OrchestratorFeedbackEntry): {
        logPath: string;
        updatedSignals: FeedbackOutcomeResult[];
    };
    runMetaInference(): Promise<SynthesisReport | null>;
    enhanceCapabilities(base: Map<string, AgentCapability>): Map<string, AgentCapability>;
    buildRoutingContext(operation: string): RepertoireRoutingContext;
    enrichTasks(tasks: OrchestrationTask[]): OrchestrationTask[];
    enrichPlan(plan: ExecutionPlan, tasks: OrchestrationTask[]): ExecutionPlan;
    buildInheritedContext(tasks: OrchestrationTask[]): RepertoireInheritedContext;
    buildSynthesisContext(projectRoot: string, dueReason?: string | null): import("./types.js").SynthesisCollocatedContext;
    selectAgent(capabilities: Map<string, AgentCapability>, requiredCapabilities: string[], complexity: number, operation: string): string | null;
    resolveThinDispatch(baseAgent: string, operation: string, complexityScore: number): {
        agent: string;
        adjustedScore: number;
        repertoireContext: RepertoireRoutingContext;
    };
    createTrapEnforcer(governFn: GovernWithSolarFn): OntologicalTrapEnforcer;
    getHighConfidenceSignals(options?: {
        minConfidence?: number;
        tags?: string[];
        limit?: number;
    }): Array<CuratedSignal & {
        effectiveConfidence: number;
    }>;
    getTaskConfidence(input: {
        description: string;
        type?: string;
        id?: string;
    }): TaskConfidenceContext;
    searchPrimitives(query: string, options?: {
        minConfidence?: number;
        limit?: number;
    }): Array<{
        name: string;
        confidence: number;
        priority: string;
        definition: string;
        tags: string[];
        status?: string;
        observationCount: number;
    }>;
}
//# sourceMappingURL=RepertoireService.d.ts.map