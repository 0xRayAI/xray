/**
 * AGENTS.md Validation Processor
 *
 * Post-processor that validates the AGENTS.md file.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
export declare class AgentsMdValidationProcessor extends PostProcessor {
    readonly name = "agentsMdValidation";
    readonly priority = 70;
    protected run(context: unknown): Promise<unknown>;
}
//# sourceMappingURL=agents-md-validation-processor.d.ts.map