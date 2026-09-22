import type { CuratedSignal, CuratedSignalsFile, OrchestratorFeedbackEntry, PrimitiveMatch, SignalMatch, SignalPriority, SignalStatus } from '../types.js';
import { type DecayOptions } from './confidence-decay.js';
export interface PromotionGateOptions {
    minAvgConfidence?: number;
    minObservations?: number;
    fromStatus?: SignalStatus;
    toStatus?: SignalStatus;
}
export declare const DEFAULT_PROMOTION_MIN_CONFIDENCE = 0.55;
export declare const DEFAULT_PROMOTION_MIN_OBSERVATIONS = 2;
export declare const FEEDBACK_SUCCESS_CONFIDENCE_BOOST = 0.002;
export declare const FEEDBACK_FAILURE_CONFIDENCE_PENALTY = 0.005;
export declare const FEEDBACK_MIN_CONFIDENCE = 0.55;
/** Enriched JSONL names only — not June heading dumps (`phase-3-…`, `7-final-statement`). */
export declare function isFieldPrimitiveName(name: string): boolean;
/** Slug a session/pattern/package label into a dest name, or null. */
export declare function slugFieldPrimitiveName(raw: string): string | null;
/** Workspace map name — `repo-xray`, not a June heading. */
export declare function repoPrimitiveName(pkgName: string, dirName?: string): string | null;
export declare function proposeFieldObservedSignal(name: string, now: string): CuratedSignal;
export interface FeedbackOutcomeResult {
    signalName: string;
    previousAvgConfidence: number | null;
    updatedAvgConfidence: number | null;
    feedbackStats: NonNullable<CuratedSignal['feedback_stats']>;
}
export declare class CuratedSignalsManager {
    readonly filePath: string;
    constructor(filePath?: string);
    load(): CuratedSignalsFile;
    save(data: CuratedSignalsFile): void;
    /**
     * Replace a generic field-observed stub with live sibling flesh.
     * Keeps observation stats. Refuses overlay/subject definitions already written.
     */
    fleshGenericRepoSignal(name: string, definition: string, snippet?: string): boolean;
    addSignal(signal: CuratedSignal): void;
    getByName(name: string): CuratedSignal | undefined;
    getByTag(tag: string): CuratedSignal[];
    getHighPrioritySignals(): CuratedSignal[];
    getByPriority(priority: SignalPriority): CuratedSignal[];
    /**
     * Score text against all signals using name, tags, definition, criteria, and snippet.
     */
    matchByText(text: string, minScore?: number): SignalMatch[];
    matchInferenceEntry(inference: string): SignalMatch[];
    recordPrimitiveObservations(matches: PrimitiveMatch[], options?: {
        governanceForced?: boolean;
        minConfidence?: number;
    }): string[];
    shouldPromoteSignal(signal: CuratedSignal, options?: PromotionGateOptions): boolean;
    promoteQualifiedSignals(options?: PromotionGateOptions): string[];
    getSignalsAboveConfidence(minAvgConfidence?: number, options?: DecayOptions): CuratedSignal[];
    /**
     * Demote project-local validated signals whose raw (unfloored) decay
     * dropped below the gate. Factory-scale corpora (≥100 observations) stay.
     */
    demoteStaleValidatedSignals(options?: DecayOptions): string[];
    /**
     * Record orchestrator routing outcome against signals used for the task.
     * Successful outcomes nudge avg_confidence up slightly; failures nudge down.
     */
    recordFeedbackOutcome(entry: OrchestratorFeedbackEntry): FeedbackOutcomeResult[];
    private createEmptyFile;
}
//# sourceMappingURL=CuratedSignalsManager.d.ts.map