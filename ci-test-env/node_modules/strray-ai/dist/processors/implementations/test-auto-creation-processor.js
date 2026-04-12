/**
 * Test Auto-Creation Processor
 *
 * Post-processor that automatically creates test files for new code.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class TestAutoCreationProcessor extends PostProcessor {
    name = "testAutoCreation";
    priority = 60;
    async run(context) {
        const ctx = context;
        await frameworkLogger.log("test-auto-creation-processor", "executing", "info", {
            operation: ctx.operation,
            filePath: this.getFilePath(ctx)?.slice(0, 100),
        });
        try {
            // Import the existing test auto-creation processor
            const { testAutoCreationProcessor } = await import("../test-auto-creation-processor.js");
            // Execute the processor
            const result = await testAutoCreationProcessor.execute(context);
            return {
                success: result.success,
                processorName: result.processorName,
                duration: result.duration,
                data: result.data,
            };
        }
        catch (error) {
            await frameworkLogger.log("test-auto-creation-processor", "error", "error", {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}
//# sourceMappingURL=test-auto-creation-processor.js.map