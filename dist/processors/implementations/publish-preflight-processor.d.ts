/**
 * Publish Preflight Processor
 *
 * Post-processor that validates documentation completeness before publishing.
 * Ensures README.md, AGENTS.md, and reflection documents are up-to-date
 * before allowing npm publish.
 *
 * Configuration is read from .strray/features.json
 *
 * @processor_type post
 * @priority 10 (runs early after post-processing starts)
 * @blocking true (blocks publish on violations)
 *
 * @version 1.0.0
 * @framework StringRay 1.15.41
 */
import { PostProcessor } from "../processor-interfaces.js";
import { ProcessorContext, ProcessorResult } from "../processor-types.js";
export interface PreflightResult {
    compliant: boolean;
    checks: PreflightCheck[];
    summary: string;
}
export interface PreflightCheck {
    name: string;
    passed: boolean;
    message: string;
    required: boolean;
}
export declare class PublishPreflightProcessor extends PostProcessor {
    readonly name = "publishPreflight";
    readonly priority = 10;
    private config;
    constructor();
    private loadConfig;
    protected run(context: ProcessorContext): Promise<unknown>;
    execute(context: ProcessorContext): Promise<ProcessorResult>;
}
//# sourceMappingURL=publish-preflight-processor.d.ts.map