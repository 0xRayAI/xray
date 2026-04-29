import { PreProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class RefactoringLoggingProcessorWrapper extends PreProcessor {
    name = "refactoringLogging";
    priority = 8;
    async run(context) {
        try {
            const { RefactoringLoggingProcessor } = await import("../refactoring-logging-processor.js");
            const processor = new RefactoringLoggingProcessor();
            if (context.agentName &&
                context.task &&
                typeof context.startTime === "number") {
                const result = await processor.execute(context);
                return {
                    logged: result.logged || false,
                    success: true,
                    message: result.logged ? "Agent completion logged" : "No logging needed",
                };
            }
            return { logged: false, success: true, message: "Not an agent task completion context" };
        }
        catch (error) {
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
//# sourceMappingURL=refactoring-logging-processor-wrapper.js.map