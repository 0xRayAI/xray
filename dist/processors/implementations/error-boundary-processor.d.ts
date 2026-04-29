import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
export declare class ErrorBoundaryProcessor extends PreProcessor {
    readonly name = "errorBoundary";
    readonly priority = 5;
    protected run(_context: ProcessorContext): Promise<Record<string, string>>;
}
//# sourceMappingURL=error-boundary-processor.d.ts.map