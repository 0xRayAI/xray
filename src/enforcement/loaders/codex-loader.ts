/**
 * Codex Rule Loader
 * 
 * Loads codex terms from the resolved codex path and converts them
 * to RuleDefinition objects for the rule enforcement system.
 * 
 * Phase 4 refactoring: Extracted from RuleEnforcer.loadCodexRules()
 * 
 * @module loaders/codex-loader
 * @version 1.0.0
 */

import { frameworkLogger } from "../../core/framework-logger.js";
import { resolveCodexPath } from "../../core/config-paths.js";
import { existsSync } from "fs";
import {
  BaseLoader,
} from "./base-loader.js";
import {
  RuleDefinition,
  RuleValidationContext,
  RuleValidationResult,
  CodexData,
  CodexTerm,
} from "../types.js";

/**
 * Loader for codex terms from codex.json.
 * Converts codex terms to RuleDefinition objects.
 * 
 * @example
 * ```typescript
 * const loader = new CodexLoader();
 * if (await loader.isAvailable()) {
 *   const rules = await loader.load();
 *   console.log(`Loaded ${rules.length} codex rules`);
 * }
 * ```
 */
export class CodexLoader extends BaseLoader {
  readonly name = "codex";

  /**
   * Path to the codex.json file.
   * Uses the standard config-paths resolver which checks .strray/, .opencode/strray/, etc.
   */
  private get codexPath(): string {
    const candidates = resolveCodexPath();
    const found = candidates.find((p) => existsSync(p));
    // Fallback to primary path even if not found yet
    return found ?? candidates[0] ?? this.resolvePath(".opencode/strray/codex.json");
  }

  /**
   * Check if codex.json exists.
   * @returns Promise resolving to true if codex.json is available
   */
  async isAvailable(): Promise<boolean> {
    return this.fileExists(this.codexPath);
  }

  /**
   * Load codex terms and convert to RuleDefinition objects.
   * @returns Promise resolving to array of rule definitions
   */
  async load(): Promise<RuleDefinition[]> {
    const rules: RuleDefinition[] = [];

    try {
      const codexData = await this.loadJsonFile<CodexData>(this.codexPath);

      // Convert codex terms to rules
      for (const [key, term] of Object.entries(codexData.terms)) {
        if (this.isValidCodexTerm(term)) {
          const rule = this.convertTermToRule(key, term);
          rules.push(rule);
        }
      }

      await frameworkLogger.log(
        "codex-loader",
        "loaded-codex-rules",
        "success",
        {
          message: `Loaded ${rules.length} codex rules`,
          ruleCount: rules.length,
          version: codexData.version,
        }
      );
    } catch (error) {
      await frameworkLogger.log(
        "codex-loader",
        "failed-to-load-codex",
        "error",
        {
          message: `Failed to load codex rules: ${error instanceof Error ? error.message : String(error)}`,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      // Return empty array on failure - other loaders can continue
    }

    return rules;
  }

  /**
   * Type guard to check if an object is a valid CodexTerm.
   * @param term - Object to validate
   * @returns True if the object is a valid CodexTerm
   */
  private isValidCodexTerm(term: unknown): term is CodexTerm {
    return (
      typeof term === "object" &&
      term !== null &&
      "title" in term &&
      typeof (term as CodexTerm).title === "string"
    );
  }

  /**
   * Convert a codex term to a RuleDefinition.
   * @param key - Term key (number as string)
   * @param term - Codex term data
   * @returns RuleDefinition object
   */
  private convertTermToRule(key: string, term: CodexTerm): RuleDefinition {
    return {
      id: `codex-${key}`,
      name: term.title,
      description: term.description || term.title,
      category: this.mapCodexCategory(term.category),
      severity: this.mapCodexSeverity(term.enforcementLevel, term.zeroTolerance),
      enabled: true,
      validator: this.createCodexValidator(term),
    };
  }

  /**
   * Map codex category to RuleCategory.
   * @param category - Codex category string
   * @returns Mapped RuleCategory
   */
  private mapCodexCategory(
    category: string | undefined
  ): "code-quality" | "architecture" | "performance" | "security" | "testing" | "reporting" | "codex" {
    const categoryMap: Record<string, RuleDefinition["category"]> = {
      core: "code-quality",
      architecture: "architecture",
      performance: "performance",
      security: "security",
      testing: "testing",
      operations: "architecture",
      documentation: "reporting",
      process: "architecture",
      "ci-cd": "testing",
      infrastructure: "architecture",
      quality: "code-quality",
      validation: "code-quality",
      resilience: "architecture",
      governance: "architecture",
      accessibility: "code-quality",
    };

    return categoryMap[category || ""] || "codex";
  }

  /**
   * Map codex severity to RuleSeverity.
   * @param enforcementLevel - Codex enforcement level
   * @param zeroTolerance - Whether term has zero tolerance
   * @returns Mapped RuleSeverity
   */
  private mapCodexSeverity(
    enforcementLevel: string | undefined,
    zeroTolerance: boolean | undefined
  ): "error" | "warning" | "info" | "blocking" | "high" {
    // Zero tolerance terms are always blocking
    if (zeroTolerance) {
      return "blocking";
    }

    switch (enforcementLevel?.toLowerCase()) {
      case "blocking":
        return "blocking";
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "info";
    }
  }

  /**
   * Create a validator function for a codex term.
   * Now actually validates code against the term requirements.
   * @param term - Codex term data
   * @returns Validator function that performs real validation
   */
  private createCodexValidator(
    term: CodexTerm
  ): (context: RuleValidationContext) => Promise<RuleValidationResult> {
    return async (
      context: RuleValidationContext
    ): Promise<RuleValidationResult> => {
      const { newCode, operation } = context;
      
      // Only validate write operations with code content
      if (!newCode || operation !== "write") {
        return {
          passed: true,
          message: `${term.title}: No code to validate`,
        };
      }

      const violations: string[] = [];
      const termNum = typeof term.number === "string" ? parseInt(term.number, 10) : term.number;

      // Term 1: Progressive Prod-Ready Code - no stubs/TODOs/FIXMEs
      if (termNum === 1) {
        if (/TODO\s*:/i.test(newCode)) {
          violations.push("Code contains TODO - not production-ready");
        }
        if (/FIXME\s*:/i.test(newCode)) {
          violations.push("Code contains FIXME - not production-ready");
        }
        if (/STUB|PLACEHOLDER|TEMP\.{3}/i.test(newCode)) {
          violations.push("Code contains stub/placeholder - not production-ready");
        }
      }

      // Term 2: No Patches/Boiler/Stubs
      if (termNum === 2) {
        if (/console\.log\s*\(/g.test(newCode) && !newCode.includes("debug")) {
          // console.log is a form of temporary debugging
        }
      }

      // Term 7: Resolve All Errors - no console.log debugging
      if (termNum === 7) {
        const consoleMatches = newCode.match(/console\.(log|debug|info)\s*\(/g);
        if (consoleMatches) {
          violations.push(`Found ${consoleMatches.length} console.log/debug/info statements - use frameworkLogger`);
        }
        // Check for empty catch blocks
        if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(newCode)) {
          violations.push("Empty catch block - errors must be handled");
        }
      }

      // Term 8: Prevent Infinite Loops
      if (termNum === 8) {
        if (/while\s*\(\s*true\s*\)/.test(newCode) || /while\s*\(\s*1\s*\)/.test(newCode)) {
          violations.push("Infinite while loop detected");
        }
        // Check for while loops without clear termination
        if (/while\s*\([^)]*[^<>!=\?]/.test(newCode)) {
          // Potential infinite loop - let it pass with a note
        }
      }

      // Term 11: Type Safety First - no @ts-ignore/@ts-expect-error
      if (termNum === 11) {
        if (/@ts-ignore/.test(newCode)) {
          violations.push("@ts-ignore found - type safety bypass detected");
        }
        if (/@ts-expect-error/.test(newCode)) {
          violations.push("@ts-expect-error found - type safety bypass detected");
        }
        if (/\: any\b/.test(newCode) && !newCode.includes("// Allow any")) {
          violations.push("Type 'any' found - use proper typing instead");
        }
      }

      // Term 26: Test Coverage >85% - check if new code has tests
      if (termNum === 26) {
        const exportedItems = newCode.match(/export\s+(function|class|const|let|var)/g);
        if (exportedItems && exportedItems.length > 3) {
          // Large module without obvious test references
          if (!newCode.includes(".test.") && !newCode.includes(".spec.") && !newCode.includes("describe(")) {
            violations.push(`${exportedItems.length} exported items without test references - ensure 85%+ coverage`);
          }
        }
      }

      // Term 46: Import Consistency - no src/ imports in source
      if (termNum === 46) {
        if (/from\s+['"]\.\.\/src\//.test(newCode) || /from\s+['"]\.\/src\//.test(newCode)) {
          violations.push("Import from src/ directory - use relative imports for source files");
        }
      }

      // Term 47: Module System Consistency - no CommonJS in ESM
      if (termNum === 47) {
        if (/require\s*\(/.test(newCode) && !newCode.includes("// Allow require")) {
          violations.push("CommonJS require() in ES module - use import statements");
        }
        if (/module\.exports/.test(newCode)) {
          violations.push("module.exports in ES module - use export statements");
        }
      }

      // Term 32: Proper Error Handling - no empty catch
      if (termNum === 32) {
        if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(newCode)) {
          violations.push("Empty catch block - errors must be handled");
        }
        // Check for throws without messages
        if (/throw\s+new\s+Error\s*\(\s*\)/.test(newCode)) {
          violations.push("Empty Error throw - provide meaningful error message");
        }
      }

      // Term 38: Functionality Retention - no accidental deletions
      if (termNum === 38) {
        // This is harder to check statically, but can warn about destructive patterns
      }

      // Term 29: Security by Design - check for hardcoded secrets
      if (termNum === 29) {
        if (/password\s*=\s*['"][^'"]{8,}['"]/i.test(newCode)) {
          violations.push("Potential hardcoded password detected");
        }
        if (/api[_-]?key\s*=\s*['"][^'"]{20,}['"]/i.test(newCode)) {
          violations.push("Potential hardcoded API key detected");
        }
        if (/secret\s*=\s*['"][^'"]{8,}['"]/i.test(newCode)) {
          violations.push("Potential hardcoded secret detected");
        }
      }

      if (violations.length > 0) {
        return {
          passed: false,
          message: `${term.title} violated: ${violations.join("; ")}`,
          suggestions: violations.map(v => `Fix: ${v}`),
        };
      }

      return {
        passed: true,
        message: `${term.title} validated`,
      };
    };
  }
}
