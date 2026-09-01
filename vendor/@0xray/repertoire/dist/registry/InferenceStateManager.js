import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export class InferenceStateManager {
    filePath;
    constructor(filePath = 'data/inference-state.json') {
        this.filePath = filePath;
    }
    load() {
        if (!existsSync(this.filePath)) {
            return this.createEmpty();
        }
        const raw = JSON.parse(readFileSync(this.filePath, 'utf8'));
        return {
            processedCommentIds: raw.processedCommentIds ?? [],
            processedSessionIds: raw.processedSessionIds ?? [],
            lastRun: raw.lastRun ?? null,
        };
    }
    save(state) {
        const dir = dirname(this.filePath);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        writeFileSync(this.filePath, JSON.stringify(state, null, 2));
    }
    isProcessed(id) {
        const state = this.load();
        return state.processedCommentIds.includes(id) || state.processedSessionIds.includes(id);
    }
    markProcessed(ids, kind = 'comment') {
        const state = this.load();
        const target = kind === 'comment' ? state.processedCommentIds : state.processedSessionIds;
        for (const id of ids) {
            if (!target.includes(id))
                target.push(id);
        }
        state.lastRun = new Date().toISOString();
        this.save(state);
    }
    createEmpty() {
        return { processedCommentIds: [], processedSessionIds: [], lastRun: null };
    }
}
//# sourceMappingURL=InferenceStateManager.js.map