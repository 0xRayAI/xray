import type { SynthesisReport } from '../types.js';
export interface MetaInferenceEngineOptions {
    logDir?: string;
    statePath?: string;
    reportPath?: string;
    batchSize?: number;
    maxEntries?: number;
    hermesCommand?: (prompt: string) => string;
}
export declare class MetaInferenceEngine {
    private readonly logDir;
    private readonly stateManager;
    private readonly reportPath;
    private readonly batchSize;
    private readonly maxEntries;
    private readonly promptBuilder;
    private readonly runHermes;
    constructor(options?: MetaInferenceEngineOptions);
    run(): Promise<SynthesisReport | null>;
    private loadUnprocessedEntries;
    private appendReport;
    private defaultHermesCommand;
}
//# sourceMappingURL=meta-inference-engine.d.ts.map