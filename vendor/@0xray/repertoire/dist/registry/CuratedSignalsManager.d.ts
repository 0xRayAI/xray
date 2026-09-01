import type { CuratedSignal, CuratedSignalsFile, OrchestratorFeedbackEntry, PrimitiveMatch, SignalMatch, SignalPriority, SignalStatus } from '../types.js';
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
export interface FeedbackOutcomeResult {
    signalName: string;
    previousAvgConfidence: number | null;
    updatedAvgConfidence: number | null;
    feedbackStats: NonNullable<CuratedSignal['feedback_stats']>;
}
export declare class CuratedSignalsManager {
    private readonly filePath;
    constructor(filePath?: string);
    load(): CuratedSignalsFile;
    save(data: CuratedSignalsFile): void;
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
    getSignalsAboveConfidence(minAvgConfidence?: number): CuratedSignal[];
    /**
     * Record orchestrator routing outcome against signals used for the task.
     * Successful outcomes nudge avg_confidence up slightly; failures nudge down.
     */
    recordFeedbackOutcome(entry: OrchestratorFeedbackEntry): FeedbackOutcomeResult[];
    private createEmptyFile;
}
//# sourceMappingURL=CuratedSignalsManager.d.ts.map