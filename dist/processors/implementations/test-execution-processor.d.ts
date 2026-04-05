/**
 * Test Execution Processor
 *
 * Post-processor that executes tests after operations.
 * Automatically runs relevant tests based on the operation context.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
export declare class TestExecutionProcessor extends PostProcessor {
    readonly name = "testExecution";
    readonly priority = 40;
    protected run(context: unknown): Promise<unknown>;
    private buildTypeScriptTestCommand;
    private buildGenericTestCommand;
    private parseTestCount;
}
//# sourceMappingURL=test-execution-processor.d.ts.map