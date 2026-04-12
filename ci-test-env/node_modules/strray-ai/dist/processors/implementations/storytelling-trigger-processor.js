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
import * as fs from "fs";
import * as path from "path";
import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class StorytellingTriggerProcessor extends PostProcessor {
    name = "storytelling-trigger";
    type = "post";
    priority = 5;
    config = null;
    reflectionsDir = "docs/reflections";
    deepReflectionsDir = "docs/reflections/deep";
    constructor() {
        super();
        this.loadConfig();
    }
    loadConfig() {
        try {
            const configPath = this.resolveConfigPath("features.json");
            if (configPath && fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, "utf-8");
                const parsed = JSON.parse(content);
                if (parsed.storytelling) {
                    this.config = parsed.storytelling;
                }
            }
        }
        catch (error) {
            frameworkLogger.log("storytelling-trigger", "config-load-failed", "warning", {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    resolveConfigPath(filename) {
        const candidates = [
            path.join(process.cwd(), ".strray", filename),
            path.join(process.cwd(), ".opencode", "strray", filename),
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
        return null;
    }
    async run(context) {
        if (!this.config?.enabled) {
            return { message: "Storytelling triggers disabled", triggers: [] };
        }
        const triggers = [];
        const commitTrigger = this.checkCommitTrigger(context);
        if (commitTrigger.triggered) {
            triggers.push(commitTrigger);
        }
        const publishTrigger = this.checkPublishTrigger(context);
        if (publishTrigger.triggered) {
            triggers.push(publishTrigger);
        }
        const complexTrigger = this.checkComplexChangesTrigger(context);
        if (complexTrigger.triggered) {
            triggers.push(complexTrigger);
        }
        const sessionTrigger = this.checkSessionDurationTrigger(context);
        if (sessionTrigger.triggered) {
            triggers.push(sessionTrigger);
        }
        if (triggers.length === 0) {
            return { message: "No storytelling triggers activated", triggers: [] };
        }
        const recommendations = triggers.map(t => ({
            type: t.trigger_type,
            story_type: t.story_type,
            message: t.message,
            suggestion: t.suggestion,
        }));
        return {
            message: `Storytelling triggers activated: ${triggers.length}`,
            triggers: recommendations,
            shouldPrompt: triggers.some(t => t.trigger_type !== "publish"),
            shouldBlock: triggers.some(t => t.trigger_type === "publish" && this.config?.reflection_triggers.publish?.block_without_story),
        };
    }
    checkCommitTrigger(context) {
        const config = this.config?.reflection_triggers.commit_count;
        if (!config?.enabled) {
            return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
        }
        const threshold = config.threshold ?? 10;
        const commitCount = this.getCommitCountSinceLastReflection();
        if (commitCount >= threshold) {
            return {
                triggered: true,
                trigger_type: "commit_count",
                story_type: config.story_type || "reflection",
                message: `${commitCount} commits since last reflection (threshold: ${threshold})`,
                suggestion: `Consider writing a ${config.story_type || "reflection"} to document recent changes. Run: npx strray-ai reflection`,
            };
        }
        return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
    }
    checkPublishTrigger(context) {
        const config = this.config?.reflection_triggers.publish;
        if (!config?.enabled) {
            return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
        }
        // Access metadata from context.data (how processor-manager passes it) or context directly
        const ctx = context;
        const metadata = ctx.data?.metadata || ctx.metadata;
        const operation = ctx.data?.operation || ctx.operation;
        const hook = ctx.data?.hook || ctx.hook;
        const isPublishing = metadata?.isPublishing ?? false;
        if (isPublishing || hook?.includes("publish") || operation?.includes("publish")) {
            const recentSaga = this.getMostRecentDocument("saga");
            const daysSinceSaga = recentSaga ? this.getDaysSinceFile(recentSaga) : Infinity;
            if (daysSinceSaga > 7 || !recentSaga) {
                return {
                    triggered: true,
                    trigger_type: "publish",
                    story_type: config.story_type || "saga",
                    message: `Publishing detected without recent saga documentation`,
                    suggestion: `Write a saga documenting this release journey. Run: npx strray-ai saga "${this.getSuggestedSagaTitle()}"`,
                };
            }
        }
        return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
    }
    checkComplexChangesTrigger(context) {
        const config = this.config?.reflection_triggers.complex_changes;
        if (!config?.enabled) {
            return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
        }
        const ctx = context;
        const threshold = config.file_count_threshold ?? 15;
        const fileCount = ctx.metadata?.filesChanged ?? 0;
        if (fileCount >= threshold) {
            return {
                triggered: true,
                trigger_type: "complex_changes",
                story_type: config.story_type || "journey",
                message: `${fileCount} files changed in complex changes`,
                suggestion: `Complex changes detected. Consider writing a ${config.story_type || "journey"} to document the investigation.`,
            };
        }
        return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
    }
    checkSessionDurationTrigger(context) {
        const config = this.config?.reflection_triggers.session_duration;
        if (!config?.enabled) {
            return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
        }
        const ctx = context;
        const threshold = config.duration_minutes_threshold ?? 60;
        const sessionDuration = ctx.metadata?.sessionDurationMinutes ?? 0;
        if (sessionDuration >= threshold) {
            return {
                triggered: true,
                trigger_type: "session_duration",
                story_type: config.story_type || "reflection",
                message: `Session has been active for ${sessionDuration} minutes`,
                suggestion: `Long session detected. Consider writing a ${config.story_type || "reflection"} to capture learnings.`,
            };
        }
        return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
    }
    getCommitCountSinceLastReflection() {
        try {
            // Get most recent reflection file
            const recentReflection = this.getMostRecentDocument("reflection");
            if (!recentReflection) {
                // No reflections exist, count all commits
                return this.getCommitCount();
            }
            // Get commits since that file was modified
            const result = this.execSync(`git log --oneline --since="${fs.statSync(recentReflection).mtime.toISOString()}" 2>/dev/null | wc -l`, { silent: true });
            return parseInt(result?.toString().trim() || "0", 10);
        }
        catch {
            return 0;
        }
    }
    getCommitCount() {
        try {
            const result = this.execSync("git rev-list --count HEAD 2>/dev/null", { silent: true });
            return parseInt(result?.toString().trim() || "0", 10);
        }
        catch {
            return 0;
        }
    }
    getMostRecentDocument(storyType) {
        const dirs = storyType === "saga" || storyType === "journey"
            ? [this.deepReflectionsDir]
            : [this.reflectionsDir, this.deepReflectionsDir];
        let mostRecent = null;
        let mostRecentTime = 0;
        for (const dir of dirs) {
            const fullPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(fullPath))
                continue;
            const files = fs.readdirSync(fullPath).filter(f => f.endsWith(".md"));
            for (const file of files) {
                const filePath = path.join(fullPath, file);
                const stat = fs.statSync(filePath);
                if (stat.mtime.getTime() > mostRecentTime) {
                    mostRecentTime = stat.mtime.getTime();
                    mostRecent = filePath;
                }
            }
        }
        return mostRecent;
    }
    getDaysSinceFile(filePath) {
        const stat = fs.statSync(filePath);
        const daysSince = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24);
        return Math.floor(daysSince);
    }
    getSuggestedSagaTitle() {
        // Try to get version from package.json
        try {
            const pkgPath = path.join(process.cwd(), "package.json");
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
            return `v${pkg.version} Release Journey`;
        }
        catch {
            return "Recent Release Journey";
        }
    }
    execSync(command, options) {
        try {
            const { execSync } = require("child_process");
            return execSync(command, { encoding: "utf-8", stdio: options.silent ? "pipe" : "inherit" });
        }
        catch {
            return null;
        }
    }
    /**
     * Get suggested story type based on context
     */
    static suggestStoryType(context) {
        if (context.isPublishing)
            return "saga";
        if (context.fileCount && context.fileCount > 15)
            return "journey";
        if (context.commitCount && context.commitCount > 10)
            return "reflection";
        return "reflection";
    }
    /**
     * Get story type metadata
     */
    static getStoryTypeMeta(storyType) {
        const defaults = {
            reflection: {
                location: "docs/reflections/",
                minWords: 2000,
                idealWords: 5000,
                framework: "three_act_structure",
                template: "reflection",
            },
            saga: {
                location: "docs/reflections/deep/",
                minWords: 5000,
                idealWords: 15000,
                framework: "hero_journey",
                template: "saga",
            },
            journey: {
                location: "docs/reflections/deep/",
                minWords: 1500,
                idealWords: 4000,
                framework: "three_act_structure",
                template: "journey",
            },
            narrative: {
                location: "docs/reflections/",
                minWords: 1000,
                idealWords: 3000,
                framework: "three_act_structure",
                template: "narrative",
            },
        };
        return defaults[storyType] ?? defaults.reflection;
    }
}
export default StorytellingTriggerProcessor;
//# sourceMappingURL=storytelling-trigger-processor.js.map