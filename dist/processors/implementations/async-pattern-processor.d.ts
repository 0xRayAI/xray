/**
 * Async Pattern Processor
 *
 * Enforces codex term #31: Async Pattern Detection.
 * Detects anti-patterns in async code: callback patterns, long promise chains,
 * missing await inside async functions, and mixed callback/promise styles.
 *
 * @version 1.0.0
 * @since 2026-03-28
 */
import type { PreValidateContext, ProcessorExecutionResult } from "../processor-types.js";
export type AsyncViolationType = "callbackPattern" | "longPromiseChain" | "missingAwait" | "mixedCallbackAsync";
export interface AsyncViolation {
    type: AsyncViolationType;
    line?: number;
    message: string;
    snippet?: string;
}
export declare class AsyncPatternProcessor {
    /**
     * Run all async-pattern checks against `content`.
     */
    checkCode(content: string): AsyncViolation[];
    /**
     * Detect node-style callbacks: `function(err, ` or inline function callbacks.
     */
    hasCallbackPattern(content: string): boolean;
    /**
     * Detect promise chains with more than 3 .then() calls.
     */
    hasLongPromiseChain(content: string): boolean;
    /**
     * Detect async functions that contain .then() or `new Promise` without an
     * accompanying await in the same scope.
     */
    hasMissingAwait(content: string): boolean;
    /**
     * Detect callbacks used inside async functions.
     */
    hasMixedCallbackAsync(content: string): boolean;
    private countPromiseChains;
    /**
     * Within an async function body, check if .then() or new Promise is used
     * without await. If so, return a marker string; otherwise return original.
     */
    private _checkAsyncBodyForMissingAwait;
}
export declare function runAsyncPatternCheck(context: PreValidateContext): Promise<ProcessorExecutionResult>;
//# sourceMappingURL=async-pattern-processor.d.ts.map