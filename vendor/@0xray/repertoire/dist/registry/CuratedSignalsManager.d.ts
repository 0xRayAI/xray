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
/** One outcome moves routing. A 0.002 nudge on a floor average does not. */
export declare const FEEDBACK_SUCCESS_CONFIDENCE_BOOST = 0.1;
export declare const FEEDBACK_FAILURE_CONFIDENCE_PENALTY = 0.1;
/** Failure may drop below the promotion gate so the law leaves the next decision. */
export declare const FEEDBACK_MIN_CONFIDENCE = 0;
/** Consecutive definition content words that count as a paraphrase of the law. */
export declare const LAW_CLAUSE_SPAN = 4;
export declare function isConfidenceFloor(value: number, gate?: number): boolean;
export declare function clauseTokens(text: string): string[];
/**
 * A paraphrase is four consecutive definition content words, in order, inside a
 * short query window (twice the clause). Two stray words are not a clause.
 * The same words scattered through a long diary are not a clause.
 */
export declare function lawClauseInText(definition: string, text: string, span?: number): boolean;
export declare function isAboveConfidenceFloor(value: number, gate?: number): boolean;
/** Hot lines kept on a law. Older lines leave only after their task id is in the ledger. */
export declare const LESSON_LINE_CAP = 20;
/**
 * Aged task ids kept so a replay does not step the average.
 * Insertion order, oldest first. Same size as the hot window: past this cap the oldest id leaves.
 * Alphabetical order is not age, so the ledger is not sorted.
 */
export declare const RETAINED_LESSON_ID_CAP = 20;
/**
 * Proposed signals minted from speech (`tags` includes `learned`).
 * One lesson-window of room past the hot lines, so unnamed speech can land and then the
 * lowest confidence leaves, then the oldest last_seen. Factory signals and anything not
 * proposed-and-learned stay.
 */
export declare const LEARNED_SIGNAL_CAP = 24;
export declare const LESSON_TEXT_CAP = 400;
/**
 * The diary names a law only when it contains the signal id, or the id with
 * hyphens read as spaces. A repo tail, leftover tokens, and two definition
 * words are not the name.
 */
export declare function signalNameInText(text: string, name: string): boolean;
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
    learnedConvictionPath(): string;
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
     * Score text against signals. A hit is the signal id, the id with hyphens
     * read as spaces, or a consecutive definition clause. Two definition words
     * are not a match.
     */
    matchByText(text: string, minScore?: number): SignalMatch[];
    matchInferenceEntry(inference: string): SignalMatch[];
    /**
     * Mark names the diary already matched. Does not append a confidence sample.
     * Missing names are left absent. Heat must not mint a law.
     */
    touchLastSeen(names: string[]): string[];
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
    /**
     * Shed proposed speech mints past LEARNED_SIGNAL_CAP.
     * Lowest confidence leaves first, then the oldest last_seen. Factory laws stay.
     */
    private evictSpeechMints;
    private dropLearnedConviction;
    /**
     * Append one graded line. A task id already on the law, or still in the capped
     * ledger, does not move the average and does not append again.
     * Past the hot cap, the oldest line leaves only after its id is in the ledger.
     * Past the ledger cap, the oldest id leaves. Order is recency, not alphabetical.
     */
    private rememberLesson;
    /**
     * Conviction that left the 0.55 floor. Not the observation counter.
     * Graded lines sit beside the average. A wake that copies the overlay floor
     * back onto dest restores both.
     */
    private writeLearnedConviction;
    /**
     * Averages already above the floor survive a flatten even when no new
     * feedback has run. Floor names, including float dust at 0.55, stay out.
     */
    private seedLearnedConviction;
    private readLearnedConvictionFile;
    private writeLearnedConvictionFile;
    restoreLearnedConviction(): string[];
    private createEmptyFile;
}
//# sourceMappingURL=CuratedSignalsManager.d.ts.map