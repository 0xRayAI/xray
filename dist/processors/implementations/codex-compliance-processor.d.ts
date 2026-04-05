/**
 * Codex Compliance Processor
 *
 * Validates code against the Universal Development Codex.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PreProcessor } from "../processor-interfaces.js";
export declare class CodexComplianceProcessor extends PreProcessor {
    readonly name = "codexCompliance";
    readonly priority = 20;
    protected run(context: unknown): Promise<unknown>;
}
//# sourceMappingURL=codex-compliance-processor.d.ts.map