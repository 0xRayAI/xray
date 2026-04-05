/**
 * PostProcessor Chain Validator
 *
 * Validates postprocessor execution chain integrity.
 * Checks that all registered postprocessors executed without errors,
 * validates priority ordering, and detects skipped or crashed processors.
 *
 * @version 1.0.0
 * @since 2026-03-28
 */
import type { PostValidateContext, ProcessorExecutionResult } from "./processor-types.js";
export interface ChainValidationResult {
    valid: boolean;
    issues: ChainIssue[];
}
export interface ChainIssue {
    severity: "error" | "warning";
    processorName: string;
    message: string;
}
export interface ChainReport {
    totalProcessors: number;
    successful: number;
    failed: number;
    skipped: number;
    issues: ChainIssue[];
    averageDuration: number;
    executedInPriorityOrder: boolean;
}
export declare class PostProcessorChainValidator {
    private chainReport;
    /**
     * Validate the postprocessor execution chain.
     */
    validateChain(results: Array<{
        name: string;
        success: boolean;
        duration: number;
        priority?: number;
    }>): ChainValidationResult;
    /**
     * Get the chain report from the most recent validation.
     */
    getChainReport(): ChainReport;
}
export declare function runPostProcessorChainValidation(context: PostValidateContext): Promise<ProcessorExecutionResult>;
//# sourceMappingURL=postprocessor-chain-validator.d.ts.map