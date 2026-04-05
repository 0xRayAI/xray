/**
 * TypeScript Compilation Processor
 *
 * Runs `tsc --noEmit` to catch type errors before writes land.
 * Parses TypeScript error lines from stderr and returns structured results.
 * Gracefully skips when no tsconfig.json exists.
 *
 * @version 1.0.0
 * @since 2026-03-28
 */
export interface TypeScriptCompilationResult {
    success: boolean;
    errors: string[];
    duration: number;
    fileCount: number;
    errorCount?: number;
    skipped?: boolean;
    reason?: string;
}
/**
 * Parse TypeScript error lines from stderr output.
 * Filters for lines containing "error TS" which is the standard TypeScript error format.
 */
export declare function parseTypeScriptErrors(stderr: string): string[];
/**
 * Run TypeScript compilation check (tsc --noEmit).
 *
 * @param cwd - Working directory for the command (defaults to process.cwd())
 * @param timeout - Maximum execution time in milliseconds (default 30000)
 * @returns Structured result with success status, errors, and timing
 */
export declare function runTypeScriptCompilation(cwd?: string, timeout?: number): TypeScriptCompilationResult;
export declare const typescriptCompilationProcessor: {
    name: string;
    priority: number;
    enabled: boolean;
    execute(context: Record<string, unknown>): Promise<TypeScriptCompilationResult>;
};
//# sourceMappingURL=typescript-compilation-processor.d.ts.map