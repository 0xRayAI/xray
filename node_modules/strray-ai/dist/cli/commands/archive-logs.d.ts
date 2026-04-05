#!/usr/bin/env node
/**
 * Standalone Log Archive CLI
 *
 * Archives log files without requiring framework boot.
 * Used by git hooks to prevent log truncation.
 *
 * @version 1.0.0
 */
interface ArchiveResult {
    archived: number;
    errors: string[];
}
interface LogArchiveConfig {
    maxFileSizeMB: number;
    rotationIntervalHours: number;
    compressionEnabled: boolean;
    maxArchives: number;
}
/**
 * Archive log files without framework dependencies
 */
export declare function archiveLogFiles(config?: LogArchiveConfig, jobId?: string): Promise<ArchiveResult>;
export {};
//# sourceMappingURL=archive-logs.d.ts.map