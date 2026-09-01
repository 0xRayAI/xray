import { CuratedSignalsManager } from '../registry/CuratedSignalsManager.js';
import type { OrchestrationTask, TaskConfidenceContext } from '../types.js';
export declare const DEFAULT_MIN_CONFIDENCE_GATE = 0.55;
export declare const TRAP_CAPABLE_AGENTS: readonly ["architect", "security-auditor", "researcher"];
export declare function resolveSignalConfidence(signalName: string, signalsManager: CuratedSignalsManager, metadataConfidence?: number): number | null;
export declare function getConfidenceForTask(task: OrchestrationTask, signalsManager: CuratedSignalsManager): TaskConfidenceContext;
export declare function confidenceWeightedAgentBoost(agent: string, context: TaskConfidenceContext): number;
export declare function applyConfidenceComplexityBoost(baseComplexity: number, context: TaskConfidenceContext): number;
//# sourceMappingURL=confidence-gate.d.ts.map