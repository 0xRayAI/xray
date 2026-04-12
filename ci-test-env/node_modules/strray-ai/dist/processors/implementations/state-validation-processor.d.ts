/**
 * State Validation Processor
 *
 * Validates state after operations to ensure consistency.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
export declare class StateValidationProcessor extends PostProcessor {
    readonly name = "stateValidation";
    readonly priority = 50;
    protected run(context: unknown): Promise<unknown>;
}
//# sourceMappingURL=state-validation-processor.d.ts.map