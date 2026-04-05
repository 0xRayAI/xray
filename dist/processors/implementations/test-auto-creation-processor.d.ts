/**
 * Test Auto-Creation Processor
 *
 * Post-processor that automatically creates test files for new code.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
export declare class TestAutoCreationProcessor extends PostProcessor {
    readonly name = "testAutoCreation";
    readonly priority = 60;
    protected run(context: unknown): Promise<unknown>;
}
//# sourceMappingURL=test-auto-creation-processor.d.ts.map