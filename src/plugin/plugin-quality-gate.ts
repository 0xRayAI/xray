import * as fs from "fs";
import type { RuleValidationContext } from "./plugin-types.js";
import type { PluginLogger } from "./plugin-logger.js";

export async function runEnforcerQualityGate(
  input: { tool: string; args?: { content?: string; filePath?: string } },
  logger: PluginLogger,
): Promise<{ passed: boolean; violations: string[] }> {
  const violations: string[] = [];
  const { tool, args } = input;

  try {
    const { RuleEnforcer } = await import("../enforcement/rule-enforcer.js");
    const ruleEnforcer = new RuleEnforcer();

    const context: RuleValidationContext = {
      operation: tool === "write" ? "write" : tool === "edit" ? "edit" : "read",
    };

    if (args?.filePath) {
      context.files = [args.filePath];
    }

    if (args?.content) {
      context.newCode = args.content;
    }

    const report = await ruleEnforcer.validateOperation(tool, context);

    const blockingViolations: string[] = [];
    const allViolations: string[] = [];

    if (report.errors && report.errors.length > 0) {
      for (const error of report.errors) {
        allViolations.push(error);
        blockingViolations.push(error);
      }
    }

    if (report.results) {
      for (const result of report.results) {
        if (!result.passed) {
          const isBlocking = result.severity === "error" || result.severity === "blocking" || result.severity === "high";
          allViolations.push(result.message);
          if (isBlocking) {
            blockingViolations.push(result.message);
          }
        }
      }
    }

    if (allViolations.length > 0) {
      logger.log(`⚠️ ENFORCER: ${allViolations.length} rule violation(s) detected`);
      for (const v of allViolations.slice(0, 5)) {
        logger.log(`   - ${v}`);
      }
      if (allViolations.length > 5) {
        logger.log(`   ... and ${allViolations.length - 5} more`);
      }
    }

    const passed = blockingViolations.length === 0;
    violations.push(...blockingViolations);

    if (!passed) {
      logger.error(`🚫 Quality Gate FAILED with ${blockingViolations.length} blocking violation(s)`);
    } else {
      logger.log(`✅ Quality Gate PASSED (${allViolations.length} warning(s))`);
    }

    return { passed, violations };
  } catch (error) {
    logger.log(`Warning: RuleEnforcer unavailable, using fallback checks: ${error instanceof Error ? (error as Error).message : String(error)}`);

    if (tool === "write" && args?.filePath) {
      const filePath = args.filePath;
      if (
        filePath.endsWith(".ts") &&
        !filePath.includes(".test.") &&
        !filePath.includes(".spec.")
      ) {
        const testPath = filePath.replace(".ts", ".test.ts");
        const specPath = filePath.replace(".ts", ".spec.ts");
        if (!fs.existsSync(testPath) && !fs.existsSync(specPath)) {
          violations.push(`tests-required: No test file found for ${filePath}`);
        }
      }
    }

    if (args?.content) {
      const errorPatterns = [/console\.log\s*\(/g, /TODO\s*:/gi, /FIXME\s*:/gi];
      for (const pattern of errorPatterns) {
        if (pattern.test(args.content)) {
          violations.push(`resolve-all-errors: Found error pattern in code`);
          break;
        }
      }
    }

    const passed = violations.length === 0;
    if (!passed) {
      logger.error(`🚫 Fallback Quality Gate FAILED with ${violations.length} violation(s)`);
    } else {
      logger.log(`✅ Fallback Quality Gate PASSED`);
    }

    return { passed, violations };
  }
}
