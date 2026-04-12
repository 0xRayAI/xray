/**
 * Coverage Analysis Processor
 *
 * Post-processor that analyzes test coverage.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
export declare class CoverageAnalysisProcessor extends PostProcessor {
    readonly name = "coverageAnalysis";
    readonly priority = 65;
    protected run(context: unknown): Promise<unknown>;
}
//# sourceMappingURL=coverage-analysis-processor.d.ts.map