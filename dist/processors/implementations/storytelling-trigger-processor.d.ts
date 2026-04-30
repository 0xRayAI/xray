import { PostProcessor } from "../processor-interfaces.js";
import { ProcessorContext } from "../processor-types.js";
export declare class StorytellingTriggerProcessor extends PostProcessor {
    readonly name = "storytelling-trigger";
    readonly priority = 5;
    private config;
    private reflectionsDir;
    private deepReflectionsDir;
    constructor();
    private loadConfig;
    private resolveConfigPath;
    protected run(context: ProcessorContext): Promise<unknown>;
    private runInferenceCycle;
    private reflectOnCommits;
    private reflectOnRelease;
    private synthesizeReflection;
    private detectPatterns;
    private detectSemanticPatterns;
    private extractDecisions;
    private synthesizeInferences;
    private getCommitsBetween;
    private getRecentCommits;
    private summarizeCommits;
    private getLastTag;
    private getFileCommitHash;
    private getMostRecentReflectionFile;
    private git;
    static suggestStoryType(context: {
        commitCount?: number;
        fileCount?: number;
        sessionDuration?: number;
        isPublishing?: boolean;
    }): "reflection" | "saga" | "journey" | "narrative";
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