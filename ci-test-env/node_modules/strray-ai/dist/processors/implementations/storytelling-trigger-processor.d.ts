/**
 * Storytelling Trigger Processor
 *
 * Detects when stories (reflections, sagas, journeys) should be written
 * and prompts users to invoke the storyteller skill.
 *
 * Triggers:
 * - Commit count threshold (default: 10 commits without reflection)
 * - Publish events (require saga)
 * - Complex changes (15+ files changed)
 * - Session duration (60+ minutes)
 *
 * @version 1.0.0
 * @since 2026-04-01
 */
import { PostProcessor } from "../processor-interfaces.js";
import { ProcessorContext } from "../processor-types.js";
export declare class StorytellingTriggerProcessor extends PostProcessor {
    readonly name = "storytelling-trigger";
    readonly type: "post";
    readonly priority = 5;
    private config;
    private reflectionsDir;
    private deepReflectionsDir;
    constructor();
    private loadConfig;
    private resolveConfigPath;
    protected run(context: ProcessorContext): Promise<unknown>;
    private checkCommitTrigger;
    private checkPublishTrigger;
    private checkComplexChangesTrigger;
    private checkSessionDurationTrigger;
    private getCommitCountSinceLastReflection;
    private getCommitCount;
    private getMostRecentDocument;
    private getDaysSinceFile;
    private getSuggestedSagaTitle;
    private execSync;
    /**
     * Get suggested story type based on context
     */
    static suggestStoryType(context: {
        commitCount?: number;
        fileCount?: number;
        sessionDuration?: number;
        isPublishing?: boolean;
    }): "reflection" | "saga" | "journey" | "narrative";
    /**
     * Get story type metadata
     */
    static getStoryTypeMeta(storyType: string): {
        location: string;
        minWords: number;
        idealWords: number;
        framework: string;
        template: string;
    };
}
export default StorytellingTriggerProcessor;
//# sourceMappingURL=storytelling-trigger-processor.d.ts.map