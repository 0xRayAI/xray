/**
 * Regression Testing Processor
 *
 * Executes regression tests after file modifications to ensure
 * existing functionality is not broken.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
import { ProcessorContext } from "../processor-types.js";
export declare class RegressionTestingProcessor extends PostProcessor {
    readonly name = "regressionTesting";
    readonly priority = 50;
    protected run(context: ProcessorContext): Promise<unknown>;
    private runRegressionTests;
    private findRelatedTestFiles;
    private executeTestFile;
}
export declare const regressionTestingProcessor: RegressionTestingProcessor;
//# sourceMappingURL=regression-testing-processor.d.ts.map