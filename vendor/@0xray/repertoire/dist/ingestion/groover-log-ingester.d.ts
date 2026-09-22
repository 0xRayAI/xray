import { CuratedSignalsManager } from '../registry/CuratedSignalsManager.js';
import { InferenceStateManager } from '../registry/InferenceStateManager.js';
export interface GrooverIngesterOptions {
    sourceDir: string;
    targetDir?: string;
    signalsManager?: CuratedSignalsManager;
    stateManager?: InferenceStateManager;
    promoteAfterIngest?: boolean;
    /** Preview counts only — no log append, observation writes, or promotion. */
    dryRun?: boolean;
}
export interface GrooverIngestResult {
    imported: number;
    skipped: number;
    promoted: string[];
}
export declare class GrooverLogIngester {
    private readonly sourceDir;
    private readonly targetDir;
    private readonly signalsManager;
    private readonly stateManager;
    private readonly promoteAfterIngest;
    private readonly dryRun;
    constructor(options: GrooverIngesterOptions);
    ingest(): GrooverIngestResult;
    private recordObservations;
    private markState;
    private loadExistingIds;
}
//# sourceMappingURL=groover-log-ingester.d.ts.map