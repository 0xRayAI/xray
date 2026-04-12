/**
 * AGENTS.md Validation Processor
 *
 * Post-processor that validates the AGENTS.md file.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class AgentsMdValidationProcessor extends PostProcessor {
    name = "agentsMdValidation";
    priority = 70;
    async run(context) {
        const ctx = context;
        await frameworkLogger.log("agents-md-validation-processor", "validating", "info", {
            operation: ctx.operation,
            filePath: this.getFilePath(ctx)?.slice(0, 100),
        });
        try {
            // Import the existing AGENTS.md validation processor
            const { AgentsMdValidationProcessor } = await import("../agents-md-validation-processor.js");
            const processor = new AgentsMdValidationProcessor(process.cwd());
            const toolInputArgs = ctx.toolInput?.args;
            const executeContext = {
                tool: ctx.tool || "validate",
                operation: ctx.operation || "post-process",
            };
            if (toolInputArgs) {
                executeContext.args = toolInputArgs;
            }
            const result = await processor.execute(executeContext);
            return {
                success: result.success,
                blocked: result.blocked,
                message: result.message,
                errors: result.result?.errors || [],
                warnings: result.result?.warnings || [],
                checkedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            await frameworkLogger.log("agents-md-validation-processor", "error", "error", {
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                success: false,
                blocked: false,
                message: error instanceof Error ? error.message : "Unknown error",
                errors: [],
                warnings: [],
                checkedAt: new Date().toISOString(),
            };
        }
    }
}
//# sourceMappingURL=agents-md-validation-processor.js.map