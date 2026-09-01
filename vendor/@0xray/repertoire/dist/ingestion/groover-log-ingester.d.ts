import { CuratedSignalsManager } from '../registry/CuratedSignalsManager.js';
export interface GrooverIngesterOptions {
    sourceDir: string;
    targetDir?: string;
    signalsManager?: CuratedSignalsManager;
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
    private readonly promoteAfterIngest;
    private readonly dryRun;
    constructor(options: GrooverIngesterOptions);
    ingest(): GrooverIngestResult;
    private recordObservations;
    private loadExistingIds;
}
//# sourceMappingURL=groover-log-ingester.d.ts.map