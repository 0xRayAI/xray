/**
 * Refactoring Logging Processor
 *
 * Logs refactoring operations for tracking and auditing.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
export declare class RefactoringLoggingProcessor extends PostProcessor {
    readonly name = "refactoringLogging";
    readonly priority = 55;
    private logPath;
    constructor();
    private ensureLogDirectory;
    protected run(context: unknown): Promise<unknown>;
    private createLogEntry;
    private appendToLog;
}
//# sourceMappingURL=refactoring-logging-processor.d.ts.map