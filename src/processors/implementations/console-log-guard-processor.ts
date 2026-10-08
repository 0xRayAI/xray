/**
 * Console Log Guard Processor
 *
 * Enforces codex term #33: Console Log Guard.
 * Scans code for forbidden console.log/warn/error/info/debug usage,
 * ensuring all logging goes through frameworkLogger instead.
 *
 * @since 2026-03-28
 */

import { frameworkLogger } from "../../core/framework-logger.js";
import type { PreValidateContext, ProcessorExecutionResult } from "../processor-types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsoleLogViolation {
  line: number;
  type: "log" | "warn" | "error" | "info" | "debug";
  matched: string;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

const CONSOLE_METHOD_PATTERNS: ReadonlyArray<{
  method: ConsoleLogViolation["type"];
  pattern: RegExp;
}> = [
  { method: "log", pattern: /\bconsole\.log\s*\(/ },
  { method: "warn", pattern: /\bconsole\.warn\s*\(/ },
  { method: "error", pattern: /\bconsole\.error\s*\(/ },
  { method: "info", pattern: /\bconsole\.info\s*\(/ },
  { method: "debug", pattern: /\bconsole\.debug\s*\(/ },
];
const TEST_FILE_PATTERN = /\.(test|spec)\.ts$/;

export class ConsoleLogGuardProcessor {
  /**
   * Scan code content for forbidden console method calls.
   * Returns violations with line numbers.
   */
  checkCode(content: string, filePath?: string): ConsoleLogViolation[] {
    if (!content || !content.trim()) {
      return [];
    }

    // Skip test files entirely
    if (filePath && this.isTestFile(filePath)) {
      return [];
    }

    const stripped = this.stripComments(content);
    const lines = stripped.split("\n");
    const violations: ConsoleLogViolation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      if (!line) continue;

      for (const { method, pattern } of CONSOLE_METHOD_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            line: lineNum,
            type: method,
            matched: line.trim(),
          });
        }
      }
    }

    return violations;
  }

  /**
   * Determine if a file path points to a test file.
   */
  isTestFile(filePath: string): boolean {
    return TEST_FILE_PATTERN.test(filePath);
  }

  /**
   * Remove single-line (//) and multi-line comments from source code.
   * Preserves line structure so line numbers remain valid.
   */
  stripComments(content: string): string {
    const parts: string[] = [];
    let i = 0;
    let chunkStart = 0;
    const len = content.length;

    const flush = (end: number): void => {
      if (end > chunkStart) parts.push(content.slice(chunkStart, end));
      chunkStart = end;
    };

    while (i < len) {
      const c = content[i];
      const next = i + 1 < len ? content[i + 1] : "";

      // Single-line comment: // ... newline. Newline stays in the next chunk.
      if (c === "/" && next === "/") {
        flush(i);
        while (i < len && content[i] !== "\n") i++;
        chunkStart = i;
      }
      // Multi-line comment: /* ... */ — keep newlines so line numbers hold.
      else if (c === "/" && next === "*") {
        flush(i);
        i += 2;
        while (i < len) {
          if (content[i] === "*" && i + 1 < len && content[i + 1] === "/") {
            i += 2;
            break;
          }
          if (content[i] === "\n") parts.push("\n");
          i++;
        }
        chunkStart = i;
      }
      // String literal — walk past it so comment markers inside stay code.
      else if (c === '"' || c === "'" || c === "`") {
        const quote = c;
        i++;
        while (i < len && content[i] !== quote) {
          if (content[i] === "\\" && i + 1 < len) i += 2;
          else i++;
        }
        if (i < len) i++;
      } else {
        i++;
      }
    }

    flush(len);
    return parts.join("");
  }
}

// ---------------------------------------------------------------------------
// Standalone runner for processor-manager integration
// ---------------------------------------------------------------------------

export async function runConsoleLogGuard(
  context: PreValidateContext,
): Promise<ProcessorExecutionResult> {
  const start = performance.now();

  try {
    const content = (context.data as string) ?? "";
    const filePath = (context.filesChanged as string[] | undefined)?.[0];

    const processor = new ConsoleLogGuardProcessor();
    const violations = processor.checkCode(content, filePath);

    const hasViolations = violations.length > 0;

    if (hasViolations) {
      frameworkLogger.log(
        "console-log-guard-processor",
        "violations_found",
        "warning",
        { violations, filePath },
      );
    }

    return {
      success: !hasViolations,
      processorName: "console-log-guard-processor",
      duration: performance.now() - start,
      result: { violations },
    };
  } catch (error) {
    frameworkLogger.log(
      "console-log-guard-processor",
      "check_failed",
      "error",
      { error: (error as Error).message },
    );
    return {
      success: false,
      processorName: "console-log-guard-processor",
      duration: performance.now() - start,
      error: (error as Error).message,
    };
  }
}
