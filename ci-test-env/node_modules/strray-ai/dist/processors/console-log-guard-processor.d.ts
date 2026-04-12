/**
 * Console Log Guard Processor
 *
 * Enforces codex term #33: Console Log Guard.
 * Scans code for forbidden console.log/warn/error/info/debug usage,
 * ensuring all logging goes through frameworkLogger instead.
 *
 * @version 1.0.0
 * @since 2026-03-28
 */
import type { PreValidateContext, ProcessorExecutionResult } from "./processor-types.js";
export interface ConsoleLogViolation {
    line: number;
    type: "log" | "warn" | "error" | "info" | "debug";
    matched: string;
}
export declare class ConsoleLogGuardProcessor {
    /**
     * Scan code content for forbidden console method calls.
     * Returns violations with line numbers.
     */
    checkCode(content: string, filePath?: string): ConsoleLogViolation[];
    /**
     * Determine if a file path points to a test file.
     */
    isTestFile(filePath: string): boolean;
    /**
     * Remove single-line (//) and multi-line comments from source code.
     * Preserves line structure so line numbers remain valid.
     */
    stripComments(content: string): string;
}
export declare function runConsoleLogGuard(context: PreValidateContext): Promise<ProcessorExecutionResult>;
//# sourceMappingURL=console-log-guard-processor.d.ts.map