import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
export declare class RegressionTestingProcessor extends PostProcessor {
    readonly name = "regressionTesting";
    readonly priority = 15;
    protected run(_context: ProcessorContext): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=regression-testing-processor.d.ts.map