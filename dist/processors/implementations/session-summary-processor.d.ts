/**
 * Session Summary Post-Processor
 *
 * Generates emoji-formatted session summaries after tool execution.
 * Uses features.json -> auto_reporting config for control.
 *
 * @version 1.0.0
 * @since 2026-04-04
 */
import { PostProcessor, ProcessorContext } from "../processor-interfaces.js";
export declare class SessionSummaryProcessor extends PostProcessor {
    readonly name = "sessionSummary";
    readonly priority = 15;
    private config;
    private sessionStartTime;
    private agentActivities;
    private toolCalls;
    private operations;
    constructor();
    private loadConfig;
    run(context: ProcessorContext): Promise<unknown>;
    private shouldGenerateSummary;
    private generateEmojiSummary;
    private generateRecommendation;
    private stripEmojis;
}
export default SessionSummaryProcessor;
//# sourceMappingURL=session-summary-processor.d.ts.map