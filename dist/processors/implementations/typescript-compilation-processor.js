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
import { execSync } from "child_process";
import { existsSync } from "fs";
import { frameworkLogger } from "../../core/framework-logger.js";
/**
 * Parse TypeScript error lines from stderr output.
 * Filters for lines containing "error TS" which is the standard TypeScript error format.
 */
export function parseTypeScriptErrors(stderr) {
    return stderr
        .split("\n")
        .filter((line) => line.includes("error TS"))
        .map((line) => line.trim());
}
/**
 * Run TypeScript compilation check (tsc --noEmit).
 *
 * @param cwd - Working directory for the command (defaults to process.cwd())
 * @param timeout - Maximum execution time in milliseconds (default 30000)
 * @returns Structured result with success status, errors, and timing
 */
export function runTypeScriptCompilation(cwd, timeout = 30000) {
    const startTime = Date.now();
    const workingDir = cwd || process.cwd();
    frameworkLogger.log("typescript-compilation-processor", "starting tsc --noEmit check", "info", { cwd: workingDir, timeout });
    // Check if tsconfig.json exists in the working directory
    if (!existsSync(`${workingDir}/tsconfig.json`)) {
        frameworkLogger.log("typescript-compilation-processor", "skipped - no tsconfig.json found", "info", { cwd: workingDir });
        return {
            success: true,
            errors: [],
            duration: Date.now() - startTime,
            fileCount: 0,
            skipped: true,
            reason: "no tsconfig.json found",
        };
    }
    try {
        execSync("npx tsc --noEmit", {
            cwd: workingDir,
            stdio: "pipe",
            timeout,
        });
        frameworkLogger.log("typescript-compilation-processor", "tsc --noEmit passed with no errors", "success", { duration: Date.now() - startTime });
        return {
            success: true,
            errors: [],
            duration: Date.now() - startTime,
            fileCount: 0,
        };
    }
    catch (error) {
        const err = error;
        const stderr = err.stderr?.toString() || err.message || "";
        const errorLines = parseTypeScriptErrors(stderr);
        frameworkLogger.log("typescript-compilation-processor", "tsc --noEmit found type errors", "error", {
            errorCount: errorLines.length,
            duration: Date.now() - startTime,
            errors: errorLines.slice(0, 10), // Log first 10 errors for debugging
        });
        return {
            success: false,
            errors: errorLines.length > 0 ? errorLines : [stderr],
            duration: Date.now() - startTime,
            fileCount: 0,
            errorCount: errorLines.length,
        };
    }
}
export const typescriptCompilationProcessor = {
    name: "typescriptCompilation",
    priority: 15,
    enabled: true,
    async execute(context) {
        const cwd = context.directory || process.cwd();
        return runTypeScriptCompilation(cwd);
    },
};
//# sourceMappingURL=typescript-compilation-processor.js.map