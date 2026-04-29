import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
export declare class RefactoringLoggingProcessorWrapper extends PreProcessor {
    readonly name = "refactoringLogging";
    readonly priority = 8;
    protected run(context: ProcessorContext): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=refactoring-logging-processor-wrapper.d.ts.map