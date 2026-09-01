import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
export class OrchestratorFeedbackIngester {
    targetDir;
    constructor(targetDir = 'logs/orchestrator-feedback') {
        this.targetDir = targetDir;
    }
    ingest(entry) {
        if (!existsSync(this.targetDir)) {
            mkdirSync(this.targetDir, { recursive: true });
        }
        const date = entry.timestamp.split('T')[0];
        const filePath = join(this.targetDir, `${date}.jsonl`);
        appendFileSync(filePath, JSON.stringify(entry) + '\n');
        return filePath;
    }
}
//# sourceMappingURL=orchestrator-feedback-ingester.js.map