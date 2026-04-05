/**
 * Codex Compliance Processor
 *
 * Validates code against the Universal Development Codex.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PreProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class CodexComplianceProcessor extends PreProcessor {
    name = "codexCompliance";
    priority = 20;
    async run(context) {
        const ctx = context;
        // Lazy load RuleEnforcer to avoid circular dependencies
        const { RuleEnforcer } = await import("../../enforcement/rule-enforcer.js");
        const ruleEnforcer = new RuleEnforcer();
        const operation = ctx.operation || "modify";
        const filePath = ctx.filePath;
        const content = ctx.content;
        await frameworkLogger.log("codex-compliance-processor", "validating", "info", { operation, filePath: filePath?.slice(0, 100) });
        // Build validation context
        const validationContext = {
            operation,
        };
        if (filePath) {
            validationContext.files = [filePath];
        }
        if (content) {
            validationContext.newCode = content;
        }
        // Validate against codex rules
        const validationResult = await ruleEnforcer.validateOperation(operation, validationContext);
        if (!validationResult.passed) {
            const errors = validationResult.errors.join("; ");
            throw new Error(`Codex compliance failed: ${errors}`);
        }
        return {
            passed: true,
            rulesChecked: validationResult.results.length,
            errors: validationResult.errors.length,
            warnings: validationResult.warnings.length,
        };
    }
}
//# sourceMappingURL=codex-compliance-processor.js.map