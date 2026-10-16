import type { SynthesisReport } from '../types.js';
export type MetaInferenceModel = (prompt: string) => unknown;
export type MetaInferenceFailureReason = 'model_unavailable' | 'model_call_failed' | 'model_output_invalid' | 'model_backoff' | 'state_error';
/** First wait after a failed model attempt. Doubles until MODEL_BACKOFF_CAP_MS. */
export declare const MODEL_BACKOFF_BASE_MS: number;
/** Upper bound so a dead hermes CLI cannot push the wait without limit. */
export declare const MODEL_BACKOFF_CAP_MS: number;
export declare function modelBackoffDelayMs(failures: number): number;
export declare function formatMetaInferenceFailure(error: unknown): string;
/** Raised when synthesis cannot be produced by a model. Callers must not treat it as a report. */
export declare class MetaInferenceModelError extends Error {
    readonly reason: MetaInferenceFailureReason;
    constructor(reason: MetaInferenceFailureReason, message: string, options?: {
        cause?: unknown;
    });
}
export interface MetaInferenceEngineOptions {
    logDir?: string;
    statePath?: string;
    reportPath?: string;
    batchSize?: number;
    maxEntries?: number;
    /**
     * Model call. Omit to use the hermes CLI.
     * `null` means no model is configured — the run fails closed and does not call out.
     */
    hermesCommand?: MetaInferenceModel | null;
    /** Pinned in tests. Defaults to the system clock. */
    now?: () => Date;
}
export declare class MetaInferenceEngine {
    private readonly logDir;
    private readonly stateManager;
    private readonly reportPath;
    private readonly batchSize;
    private readonly maxEntries;
    private readonly promptBuilder;
    private readonly now;
    private model;
    constructor(options?: MetaInferenceEngineOptions);
    /** `null` configures no model. The next run fails closed instead of calling the hermes CLI. */
    configureModel(command: MetaInferenceModel | null): void;
    run(): Promise<SynthesisReport | null>;
    private loadUnprocessedEntries;
    private loadState;
    private throwIfBackingOff;
    /**
     * A missing, failed, or junk model result must not produce a synthesis report.
     * Entries stay unprocessed so a later run can retry them.
     */
    private callModelOrRecord;
    private callModel;
    private noteModelFailure;
    private fail;
    private logFailure;
    private appendReport;
    private defaultHermesCommand;
}
//# sourceMappingURL=meta-inference-engine.d.ts.map