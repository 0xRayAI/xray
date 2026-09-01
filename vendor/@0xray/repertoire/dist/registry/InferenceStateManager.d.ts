import type { InferenceState } from '../types.js';
export declare class InferenceStateManager {
    private readonly filePath;
    constructor(filePath?: string);
    load(): InferenceState;
    save(state: InferenceState): void;
    isProcessed(id: string): boolean;
    markProcessed(ids: string[], kind?: 'comment' | 'session'): void;
    private createEmpty;
}
//# sourceMappingURL=InferenceStateManager.d.ts.map