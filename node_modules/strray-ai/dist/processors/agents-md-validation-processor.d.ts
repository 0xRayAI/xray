/**
 * AGENTS.md Validation Processor
 *
 * Pre-processor that validates AGENTS.md exists and is up-to-date before
 * allowing commits. Integrates with 0xRay's processor pipeline.
 *
 * @processor_type pre
 * @priority 90 (high - runs early)
 * @blocking true (blocks commit if AGENTS.md is invalid)
 *
 * @version 1.0.0
 * @framework 0xRay 1.3.5
 */
export interface AgentsMdValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    fixes?: string[];
}
export declare class AgentsMdValidationProcessor {
    private projectRoot;
    private agentsPath;
    private readonly REQUIRED_SECTIONS;
    private readonly REQUIRED_AGENTS;
    private readonly RECOMMENDED_SECTIONS;
    constructor(projectRoot?: string);
    /**
     * Main execution method - called by ProcessorManager
     */
    execute(context: {
        tool: string;
        args?: {
            filePath?: string;
            content?: string;
        };
        operation: string;
    }): Promise<{
        success: boolean;
        blocked: boolean;
        message: string;
        result?: AgentsMdValidationResult;
    }>;
    /**
     * Determine if the change is agent-related
     */
    private isAgentRelatedChange;
    /**
     * Validate AGENTS.md file
     */
    private validateAgentsMd;
    /**
     * Calculate days since date
     */
    private calculateDaysOld;
    /**
     * Auto-generate AGENTS.md from template
     */
    autoGenerate(): Promise<{
        success: boolean;
        message: string;
        path?: string;
    }>;
}
export declare const agentsMdValidationProcessor: AgentsMdValidationProcessor;
//# sourceMappingURL=agents-md-validation-processor.d.ts.map