import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
import { frameworkLogger } from "../../core/framework-logger.js";

export class CodexComplianceProcessor extends PreProcessor {
  readonly name = "codexCompliance";
  readonly priority = 2;

  protected async run(context: ProcessorContext): Promise<Record<string, unknown>> {
    const { operation } = context;

    try {
      const { RuleEnforcer } = await import("../../enforcement/rule-enforcer.js");
      const ruleEnforcer = new RuleEnforcer();

      const validationContext = {
        files: (context as any).files || [],
        newCode: (context as any).newCode || "",
        existingCode: (context as any).existingCode || new Map(),
        tests: (context as any).tests || [],
        dependencies: (context as any).dependencies || [],
        operation: context.operation || "unknown",
      };

      const result = await ruleEnforcer.validateOperation(operation || "unknown", validationContext);

      if (!result.passed && result.errors.length > 0) {
        const violations = result.errors.map((msg: string) => {
          const colonIndex = msg.indexOf(':');
          const rule = colonIndex > 0 ? msg.substring(0, colonIndex).trim() : "unknown";
          return {
            rule,
            message: colonIndex > 0 ? msg.substring(colonIndex + 1).trim() : msg,
          };
        });

        if (violations.length > 0) {
          await ruleEnforcer.attemptRuleViolationFixes(violations, validationContext);
        }
      }

      return {
        compliant: result.passed,
        violations: result.errors,
        warnings: result.warnings,
        termsChecked: result.results.length,
        operation: operation,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      frameworkLogger.log("codex-compliance-processor", "check-failed", "warning", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        compliant: true,
        violations: [`Compliance check error: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
        termsChecked: 0,
        operation: operation,
        error: true,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
