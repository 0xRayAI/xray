/**
 * State Validation Processor
 *
 * Validates state after operations to ensure consistency.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class StateValidationProcessor extends PostProcessor {
    name = "stateValidation";
    priority = 50;
    async run(context) {
        const ctx = context;
        const operation = ctx.operation || "modify";
        const filePath = this.getFilePath(ctx);
        await frameworkLogger.log("state-validation-processor", "validating state", "info", { operation, filePath: filePath?.slice(0, 100) });
        // Access state manager from context or through global
        let stateValid = true;
        let stateDetails = {};
        try {
            // Try to get state manager from context
            const stateManager = ctx.stateManager;
            if (stateManager && typeof stateManager.get === "function") {
                const currentState = stateManager.get("session:active");
                stateValid = !!currentState;
                stateDetails = {
                    hasActiveSession: stateValid,
                    sessionState: currentState,
                };
            }
            else {
                // Check global state manager if available
                const globalState = globalThis
                    .strRayStateManager;
                if (globalState && typeof globalState.get === "function") {
                    const currentState = globalState.get("session:active");
                    stateValid = !!currentState;
                    stateDetails = {
                        hasActiveSession: stateValid,
                        sessionState: currentState,
                    };
                }
            }
        }
        catch (error) {
            await frameworkLogger.log("state-validation-processor", "state validation error", "error", { error: error instanceof Error ? error.message : String(error) });
            stateValid = false;
            stateDetails = { error: error instanceof Error ? error.message : String(error) };
        }
        await frameworkLogger.log("state-validation-processor", "state validation completed", stateValid ? "info" : "warning", { stateValid, ...stateDetails });
        return {
            stateValid,
            operation,
            filePath,
            details: stateDetails,
        };
    }
}
//# sourceMappingURL=state-validation-processor.js.map