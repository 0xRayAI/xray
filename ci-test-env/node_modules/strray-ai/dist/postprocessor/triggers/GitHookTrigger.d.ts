/**
 * Git Hook Trigger for Post-Processor
 */
import { PostProcessor } from "../PostProcessor.js";
import { PostProcessorContext } from "../types.js";
interface LogArchiveConfig {
    archiveDirectory: string;
    maxFileSizeMB: number;
    rotationIntervalHours: number;
    compressionEnabled: boolean;
    maxAgeHours: number;
    directories: string[];
    excludePatterns: string[];
}
export { cleanupLogFiles };
export { archiveLogFiles };
/**
 * Archive and rotate log files to prevent unbounded growth
 */
declare function archiveLogFiles(config: LogArchiveConfig): Promise<{
    archived: number;
    errors: string[];
}>;
declare function cleanupLogFiles(config: any): Promise<{
    cleaned: number;
    errors: string[];
}>;
export declare class GitHookTrigger {
    private postProcessor;
    private initialized;
    constructor(postProcessor: PostProcessor);
    initialize(): Promise<void>;
    private installHook;
    private generateHookScript;
    private activateGitHooks;
    private backupExistingHook;
    triggerPostProcessor(context: PostProcessorContext): Promise<void>;
}
//# sourceMappingURL=GitHookTrigger.d.ts.map