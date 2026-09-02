import type { OrchestratorFeedbackEntry } from '../types.js';
export declare class OrchestratorFeedbackIngester {
    private readonly targetDir;
    constructor(targetDir?: string);
    ingest(entry: OrchestratorFeedbackEntry): string;
}
//# sourceMappingURL=orchestrator-feedback-ingester.d.ts.map