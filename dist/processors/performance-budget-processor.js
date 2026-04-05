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
import { frameworkLogger } from "../core/framework-logger.js";
// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
export const DEFAULT_PERFORMANCE_BUDGET = {
    maxFileSizeBytes: 10 * 1024, // 10 KB
    maxFunctionLines: 50,
    maxNestingDepth: 5,
    maxParameters: 5,
};
// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------
export class PerformanceBudgetProcessor {
    config;
    constructor(config) {
        this.config = { ...DEFAULT_PERFORMANCE_BUDGET, ...config };
    }
    /**
     * Check a file against all budget rules.
     */
    checkFile(filePath, content) {
        const violations = [];
        // --- file size ---
        const byteSize = Buffer.byteLength(content, "utf-8");
        if (byteSize > this.config.maxFileSizeBytes) {
            violations.push({
                type: "fileTooLarge",
                filePath,
                message: `File size ${byteSize} bytes exceeds budget of ${this.config.maxFileSizeBytes} bytes`,
                actual: byteSize,
                limit: this.config.maxFileSizeBytes,
            });
        }
        // --- function-level checks ---
        const funcViolations = this.checkFunctionComplexity(content);
        for (const v of funcViolations) {
            violations.push({ ...v, filePath });
        }
        return violations;
    }
    /**
     * Analyse every function body in `content` and check complexity budgets.
     */
    checkFunctionComplexity(content) {
        const violations = [];
        const functions = this.extractFunctions(content);
        for (const fn of functions) {
            // function length
            if (fn.bodyLineCount > this.config.maxFunctionLines) {
                violations.push({
                    type: "functionTooLong",
                    filePath: "",
                    line: fn.startLine,
                    message: `Function "${fn.name}" has ${fn.bodyLineCount} lines (max ${this.config.maxFunctionLines})`,
                    actual: fn.bodyLineCount,
                    limit: this.config.maxFunctionLines,
                });
            }
            // nesting depth
            const depth = this.measureMaxNesting(fn.body);
            if (depth > this.config.maxNestingDepth) {
                violations.push({
                    type: "nestingTooDeep",
                    filePath: "",
                    line: fn.startLine,
                    message: `Function "${fn.name}" has nesting depth ${depth} (max ${this.config.maxNestingDepth})`,
                    actual: depth,
                    limit: this.config.maxNestingDepth,
                });
            }
            // parameter count
            if (fn.paramCount > this.config.maxParameters) {
                violations.push({
                    type: "tooManyParameters",
                    filePath: "",
                    line: fn.startLine,
                    message: `Function "${fn.name}" has ${fn.paramCount} parameters (max ${this.config.maxParameters})`,
                    actual: fn.paramCount,
                    limit: this.config.maxParameters,
                });
            }
        }
        return violations;
    }
    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------
    /**
     * Regex-based extraction of named functions / methods / arrow functions.
     * Does NOT require a full AST – keeps the processor zero-dependency.
     */
    extractFunctions(content) {
        const results = [];
        const lines = content.split("\n");
        // Alternative 1: function name(params) {  →  groups: [name, params]
        // Alternative 2: const/let/var name = ... =>  →  groups: [name, empty]
        // Alternative 3: methodName(params) {  →  groups: [name, params]
        const funcRegex = /(?:(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>|(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{)/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line)
                continue;
            // Skip comments
            if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) {
                continue;
            }
            funcRegex.lastIndex = 0;
            const match = funcRegex.exec(line);
            if (!match)
                continue;
            const name = match[1] ?? match[3] ?? match[5] ?? "anonymous";
            const params = match[2] ?? match[6];
            const paramCount = params
                ? params.split(",").filter((p) => p.trim().length > 0).length
                : 0;
            // Collect body lines until brace depth returns to 0
            let depth = 0;
            let started = false;
            const bodyLines = [];
            for (let j = i; j < lines.length; j++) {
                const l = lines[j];
                if (!l)
                    continue;
                for (const ch of l) {
                    if (ch === "{") {
                        depth++;
                        started = true;
                    }
                    else if (ch === "}") {
                        depth--;
                    }
                }
                bodyLines.push(l);
                if (started && depth <= 0)
                    break;
            }
            const body = bodyLines.join("\n");
            results.push({
                name,
                startLine: i + 1,
                body,
                bodyLineCount: bodyLines.length,
                paramCount,
            });
        }
        return results;
    }
    /**
     * Measure the maximum nesting depth by tracking control-flow keywords
     * (if / for / while / switch / try) inside the function body.
     */
    measureMaxNesting(body) {
        let maxDepth = 0;
        let currentDepth = 0;
        const lines = body.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            // Count opening structures that increase nesting
            const openingMatches = trimmed.match(/\b(if|for|while|switch|try|catch|else)\b/g);
            if (openingMatches) {
                // 'else' and 'catch' partially close+reopen, so net +0 for those
                const netOpen = openingMatches.length -
                    (trimmed.includes("else") ? 1 : 0) -
                    (trimmed.includes("catch") ? 1 : 0);
                currentDepth += Math.max(0, netOpen);
                maxDepth = Math.max(maxDepth, currentDepth);
            }
            // Simple heuristic: decrease depth when line closes braces
            const closeBraces = (trimmed.match(/}/g) || []).length;
            currentDepth = Math.max(0, currentDepth - closeBraces);
        }
        return maxDepth;
    }
}
// ---------------------------------------------------------------------------
// Standalone runner for processor-manager integration
// ---------------------------------------------------------------------------
export async function runPerformanceBudgetCheck(context) {
    const start = performance.now();
    try {
        const content = context.data ?? "";
        const filePath = context.filesChanged?.[0] ?? "unknown";
        const config = context.config ?? {};
        const processor = new PerformanceBudgetProcessor(config);
        const violations = processor.checkFile(filePath, content);
        const hasViolations = violations.length > 0;
        if (hasViolations) {
            frameworkLogger.log("performance-budget-processor", "violations_found", "warning", { filePath, violations });
        }
        return {
            success: !hasViolations,
            processorName: "performance-budget-processor",
            duration: performance.now() - start,
            result: { violations },
        };
    }
    catch (error) {
        frameworkLogger.log("performance-budget-processor", "check_failed", "error", { error: error.message });
        return {
            success: false,
            processorName: "performance-budget-processor",
            duration: performance.now() - start,
            error: error.message,
        };
    }
}
//# sourceMappingURL=performance-budget-processor.js.map