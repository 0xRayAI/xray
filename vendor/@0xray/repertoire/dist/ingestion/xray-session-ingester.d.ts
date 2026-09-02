import { CuratedSignalsManager } from '../registry/CuratedSignalsManager.js';
export interface XraySessionFile {
    sessionId: string;
    timestamp: string;
    problems?: string[];
    approaches?: string[];
    wrongTurns?: string[];
    solutions?: string[];
    patterns?: Array<{
        type: string;
        description: string;
    }>;
}
export interface XraySessionIngesterOptions {
    sourceDir: string;
    targetDir?: string;
    signalsManager?: CuratedSignalsManager;
}
export declare class XraySessionIngester {
    private readonly sourceDir;
    private readonly targetDir;
    private readonly signalsManager;
    constructor(options: XraySessionIngesterOptions);
    ingest(): {
        imported: number;
        skipped: number;
    };
    private sessionToInferenceEntry;
    private loadExistingSessionIds;
}
//# sourceMappingURL=xray-session-ingester.d.ts.map