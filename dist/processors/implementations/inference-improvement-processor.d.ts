/**
 * Inference Improvement Coordinator
 *
 * Lightweight processor that coordinates the agent-based inference workflow.
 * The actual analysis is done by collaborating agents (researcher, code-analyzer,
 * architect, code-reviewer, enforcer) - this processor prepares context and triggers.
 *
 * @module processors/implementations
 */
import { PostProcessor } from "../processor-interfaces.js";
export declare class InferenceImprovementProcessor extends PostProcessor {
    readonly name = "inferenceImprovement";
    readonly priority = 5;
    private readonly reflectionsDir;
    private readonly logsDir;
    private readonly reportsDir;
    private readonly workflowDir;
    private readonly inferenceEnabled;
    private readonly patternMatchingEnabled;
    private readonly patternMatchingThreshold;
    constructor();
    private loadInferenceConfig;
    protected run(context: unknown): Promise<unknown>;
    private prepareWorkflowContext;
    private findReflections;
    private findLogs;
    private findReports;
    private saveWorkflowContext;
    private generateAgentPrompts;
    private generateResearcherPrompt;
    private generateCodeAnalyzerPrompt;
    private generateArchitectPrompt;
    private generateCodeReviewerPrompt;
    private generateEnforcerPrompt;
    private triggerAgentWorkflow;
}
//# sourceMappingURL=inference-improvement-processor.d.ts.map