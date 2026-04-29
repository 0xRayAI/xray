import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
import { frameworkLogger } from "../../core/framework-logger.js";

export class RefactoringLoggingProcessorWrapper extends PreProcessor {
  readonly name = "refactoringLogging";
  readonly priority = 8;

  protected async run(context: ProcessorContext): Promise<Record<string, unknown>> {
    try {
      const { RefactoringLoggingProcessor } = await import("./refactoring-logging-processor.js");
      const processor = new RefactoringLoggingProcessor();

      if (
        (context as any).agentName &&
        (context as any).task &&
        typeof (context as any).startTime === "number"
      ) {
        const result = await processor.execute(context as any);
        return {
          logged: result.logged || false,
          success: true,
          message: result.logged ? "Agent completion logged" : "No logging needed",
        };
      }

      return { logged: false, success: true, message: "Not an agent task completion context" };
    } catch (error) {
      frameworkLogger.log("refactoring-logging-processor", "failed", "error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        logged: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
