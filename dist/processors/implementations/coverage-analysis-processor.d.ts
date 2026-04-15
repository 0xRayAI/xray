/**
 * Coverage Analysis Processor
 *
 * Analyzes test coverage for modified files and reports coverage gaps.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
import { ProcessorContext } from "../processor-types.js";
export declare class CoverageAnalysisProcessor extends PostProcessor {
    readonly name = "coverageAnalysis";
    readonly priority = 45;
    protected run(context: ProcessorContext): Promise<unknown>;
    private analyzeCoverage;
    private findRelatedTestFiles;
    private countSourceLines;
    private countTestLines;
}
export declare const coverageAnalysisProcessor: CoverageAnalysisProcessor;
//# sourceMappingURL=coverage-analysis-processor.d.ts.map