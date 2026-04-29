/**
 * Performance Budget Processor
 *
 * Enforces codex term #28: Performance Budgets.
 * Checks code content against configurable size, function-length, nesting-depth,
 * and parameter-count budgets. Returns structured violation lists.
 *
 * @version 1.0.0
 * @since 2026-03-28
 */
import type { PreValidateContext, ProcessorExecutionResult } from "../processor-types.js";
export type PerformanceViolationType = "fileTooLarge" | "functionTooLong" | "nestingTooDeep" | "tooManyParameters";
export interface PerformanceViolation {
    type: PerformanceViolationType;
    filePath: string;
    line?: number;
    message: string;
    actual: number;
    limit: number;
}
export interface PerformanceBudgetConfig {
    maxFileSizeBytes: number;
    maxFunctionLines: number;
    maxNestingDepth: number;
    maxParameters: number;
}
export declare const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudgetConfig;
export declare class PerformanceBudgetProcessor {
    private readonly config;
    constructor(config?: Partial<PerformanceBudgetConfig>);
    /**
     * Check a file against all budget rules.
     */
    checkFile(filePath: string, content: string): PerformanceViolation[];
    /**
     * Analyse every function body in `content` and check complexity budgets.
     */
    checkFunctionComplexity(content: string): PerformanceViolation[];
    /**
     * Regex-based extraction of named functions / methods / arrow functions.
     * Does NOT require a full AST – keeps the processor zero-dependency.
     */
    private extractFunctions;
    /**
     * Measure the maximum nesting depth by tracking control-flow keywords
     * (if / for / while / switch / try) inside the function body.
     */
    private measureMaxNesting;
}
export declare function runPerformanceBudgetCheck(context: PreValidateContext): Promise<ProcessorExecutionResult>;
//# sourceMappingURL=performance-budget-processor.d.ts.map