import type { CuratedSignal } from '../types.js';
import { CuratedSignalsManager } from './CuratedSignalsManager.js';
export interface PruneOptions {
    minObservations?: number;
    maxStaleDays?: number;
    dryRun?: boolean;
}
export interface PruneResult {
    removed: string[];
    kept: number;
    dryRun: boolean;
}
export declare function shouldPruneSignal(signal: CuratedSignal, opts: PruneOptions, now?: Date): boolean;
export declare function pruneSignals(manager: CuratedSignalsManager, opts?: PruneOptions): PruneResult;
//# sourceMappingURL=signal-prune.d.ts.map