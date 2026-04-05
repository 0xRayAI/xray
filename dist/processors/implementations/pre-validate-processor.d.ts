/**
 * Pre-Validation Processor
 *
 * Validates input before processing begins.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PreProcessor } from "../processor-interfaces.js";
export declare class PreValidateProcessor extends PreProcessor {
    readonly name = "preValidate";
    readonly priority = 10;
    protected run(context: unknown): Promise<unknown>;
}
//# sourceMappingURL=pre-validate-processor.d.ts.map