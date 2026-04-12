/**
 * Error Boundary Processor
 *
 * Pre-processor that sets up error boundaries for processor execution.
 * Provides graceful error handling and recovery mechanisms.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PreProcessor } from "../processor-interfaces.js";
export declare class ErrorBoundaryProcessor extends PreProcessor {
    readonly name = "errorBoundary";
    readonly priority = 30;
    protected run(context: unknown): Promise<unknown>;
}
//# sourceMappingURL=error-boundary-processor.d.ts.map