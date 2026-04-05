/**
 * Log Protection Processor
 *
 * Prevents deletion of critical inference log files that are essential
 * for the tuning engines and pattern learning system.
 *
 * Protected files:
 * - routing-outcomes.json (routing analytics - NEVER delete)
 * - activity.log (framework activity - NEVER delete)
 * - strray-plugin-*.log (plugin logs)
 *
 * Archival flow is ALLOWED:
 * - framework-activity-*.log.gz (archived/compressed logs)
 * - Copy operations to create new archive files
 *
 * @module processors/implementations
 * @version 1.1.0
 */
import { PreProcessor } from "../processor-interfaces.js";
import { ProcessorContext } from "../processor-types.js";
export declare class LogProtectionProcessor extends PreProcessor {
    readonly name = "logProtection";
    readonly priority = 10;
    protected run(context: ProcessorContext): Promise<unknown>;
    private isDeleteOperation;
    private isArchiveCleanup;
    private getActiveLogFile;
    private getOperation;
}
export declare const logProtectionProcessor: LogProtectionProcessor;
//# sourceMappingURL=log-protection-processor.d.ts.map