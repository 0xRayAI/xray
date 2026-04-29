import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext, ProcessorResult } from "../processor-types.js";
export declare class ErrorBoundaryProcessor extends PreProcessor {
    readonly name = "errorBoundary";
    readonly priority = 5;
    protected run(context: ProcessorContext): Promise<ProcessorResult>;
}
//# sourceMappingURL=error-boundary-processor.d.ts.map