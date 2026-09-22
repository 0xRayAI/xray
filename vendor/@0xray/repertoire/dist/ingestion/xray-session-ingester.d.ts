import { CuratedSignalsManager } from '../registry/CuratedSignalsManager.js';
import { InferenceStateManager } from '../registry/InferenceStateManager.js';
export interface XraySessionPattern {
    type?: string;
    name?: string;
    description?: string;
    confidence?: number;
}
export interface XraySessionFile {
    sessionId: string;
    timestamp: string;
    problems?: string[];
    approaches?: string[];
    wrongTurns?: string[];
    solutions?: string[];
    patterns?: XraySessionPattern[];
    matched_primitives?: string[];
    match_confidence?: Record<string, number>;
}
export interface XraySessionIngesterOptions {
    sourceDir: string;
    targetDir?: string;
    signalsManager?: CuratedSignalsManager;
    stateManager?: InferenceStateManager;
    repoPrimitive?: string;
}
export interface XraySessionIngestResult {
    imported: number;
    skipped: number;
    promoted: string[];
}
export declare class XraySessionIngester {
    private readonly sourceDir;
    private readonly targetDir;
    private readonly signalsManager;
    private readonly stateManager;
    private readonly repoPrimitive;
    constructor(options: XraySessionIngesterOptions);
    ingest(): XraySessionIngestResult;
    private recordObservations;
    private extractMatches;
    private sessionToInferenceEntry;
    private loadExistingSessionIds;
}
//# sourceMappingURL=xray-session-ingester.d.ts.map