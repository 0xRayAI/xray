import { PreProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class ErrorBoundaryProcessor extends PreProcessor {
    name = "errorBoundary";
    priority = 5;
    async run(context) {
        const startTime = Date.now();
        const errors = [];
        try {
            const priorResults = context
                .priorResults;
            if (priorResults) {
                for (const result of priorResults) {
                    if (!result.success && result.error) {
                        errors.push(result.error);
                        frameworkLogger.log("error-boundary-processor", "caught-prior-error", "warning", { error: result.error, processor: result.processorName });
                    }
                }
            }
            if (errors.length > 0) {
                frameworkLogger.log("error-boundary-processor", "errors-bounded", "warning", { errorCount: errors.length });
            }
            return {
                success: errors.length === 0,
                data: {
                    boundaries: true,
                    errorsBounded: errors.length,
                    errors,
                },
                duration: Date.now() - startTime,
                processorName: this.name,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error boundary failed: ${error instanceof Error ? error.message : String(error)}`,
                data: { boundaries: false, errorsBounded: 0, errors: [] },
                duration: Date.now() - startTime,
                processorName: this.name,
            };
        }
    }
}
//# sourceMappingURL=error-boundary-processor.js.map