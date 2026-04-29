import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
export declare class TestExecutionProcessor extends PreProcessor {
    readonly name = "testExecution";
    readonly priority = 10;
    protected run(context: ProcessorContext): Promise<Record<string, unknown>>;
    private executeTypeScriptTests;
    private executeGenericTests;
    private runTestCommand;
    private parseTestOutput;
}
//# sourceMappingURL=test-execution-processor.d.ts.map