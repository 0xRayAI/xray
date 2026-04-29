import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext, ProcessorResult } from "../processor-types.js";
import { frameworkLogger } from "../../core/framework-logger.js";

interface ErrorBoundaryResult {
  boundaries: boolean;
  errorsBounded: number;
  errors: string[];
}

export class ErrorBoundaryProcessor extends PreProcessor {
  readonly name = "errorBoundary";
  readonly priority = 5;

  protected async run(context: ProcessorContext): Promise<ProcessorResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const priorResults = (context as Record<string, unknown>)
        .priorResults as ProcessorResult[] | undefined;

      if (priorResults) {
        for (const result of priorResults) {
          if (!result.success && result.error) {
            errors.push(result.error);
            frameworkLogger.log(
              "error-boundary-processor",
              "caught-prior-error",
              "warning",
              { error: result.error, processor: result.processorName },
            );
          }
        }
      }

      if (errors.length > 0) {
        frameworkLogger.log(
          "error-boundary-processor",
          "errors-bounded",
          "warning",
          { errorCount: errors.length },
        );
      }

      return {
        success: errors.length === 0,
        data: {
          boundaries: true,
          errorsBounded: errors.length,
          errors,
        } satisfies ErrorBoundaryResult,
        duration: Date.now() - startTime,
        processorName: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error boundary failed: ${error instanceof Error ? error.message : String(error)}`,
        data: { boundaries: false, errorsBounded: 0, errors: [] } satisfies ErrorBoundaryResult,
        duration: Date.now() - startTime,
        processorName: this.name,
      };
    }
  }
}
