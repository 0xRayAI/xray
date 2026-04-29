import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
interface RegressionResult {
    regressions: number;
    issues: RegressionIssue[];
    baseline: string | null;
    current: string | null;
}
interface RegressionIssue {
    type: "new_failure" | "coverage_drop" | "performance_degradation";
    description: string;
    file?: string;
}
export declare class RegressionTestingProcessor extends PostProcessor {
    readonly name = "regressionTesting";
    readonly priority = 15;
    protected run(context: ProcessorContext): Promise<RegressionResult>;
    private getCurrentTestCount;
}
export {};
//# sourceMappingURL=regression-testing-processor.d.ts.map