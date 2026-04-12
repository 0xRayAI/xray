/**
 * Regression Testing Processor
 *
 * Runs regression tests to detect performance degradation.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
export declare class RegressionTestingProcessor extends PostProcessor {
    readonly name = "regressionTesting";
    readonly priority = 45;
    protected run(context: unknown): Promise<unknown>;
}
//# sourceMappingURL=regression-testing-processor.d.ts.map