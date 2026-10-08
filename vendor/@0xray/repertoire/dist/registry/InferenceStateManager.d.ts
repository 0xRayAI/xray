import type { InferenceState } from '../types.js';
export declare class InferenceStateManager {
    private readonly filePath;
    constructor(filePath?: string);
    load(): InferenceState;
    /** Remember a failed model attempt without marking entries processed or touching lastRun. */
    recordModelFailure(failedAt: string): void;
    clearModelBackoff(): void;
    save(state: InferenceState): void;
    isProcessed(id: string): boolean;
    markProcessed(ids: string[], kind?: 'comment' | 'session' | 'post'): void;
    countProcessed(): number;
    private createEmpty;
}
//# sourceMappingURL=InferenceStateManager.d.ts.map