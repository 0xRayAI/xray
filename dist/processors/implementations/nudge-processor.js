/**
 * Nudge Processor - Integrates Nudge Watchdog with processor system
 *
 * Post-processor that monitors agent actions and triggers nudges
 * when stuck patterns are detected.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import { nudgeWatchdog, recordThinkTag, recordCodeChange, recordToolCall, recordFixAttempt, recordExplanation, getNudgeSuggestion, } from "../../monitoring/nudge-watchdog.js";
import { featuresConfigLoader } from "../../core/features-config.js";
export class NudgeProcessor extends PostProcessor {
    name = "nudge";
    priority = 100;
    nudgeEnabled = true;
    constructor() {
        super();
        this.loadConfig();
    }
    loadConfig() {
        try {
            const features = featuresConfigLoader.loadConfig();
            const nudgeConfig = features?.nudge_watchdog;
            if (nudgeConfig) {
                this.nudgeEnabled = nudgeConfig.enabled !== false;
            }
        }
        catch {
            // Use defaults
        }
    }
    async run(context) {
        if (!this.nudgeEnabled) {
            return { success: true, reason: "nudge processor disabled" };
        }
        const tool = context.tool;
        const filePath = context.filePath;
        const content = context.content;
        const toolInput = context.toolInput;
        if (toolInput?.tool) {
            recordToolCall(toolInput.tool, JSON.stringify(toolInput.args || {}));
        }
        if (tool === "edit" || tool === "write") {
            recordCodeChange();
        }
        if (tool === "read" || tool === "Glob") {
            const args = toolInput?.args;
            if (args?.operation === "read-multiple" || args?.filePath) {
                recordFixAttempt(args.filePath, "repeated-read");
            }
        }
        if (content) {
            const hasThinkingTags = /<thinking>[\s\S]*?<\/thinking>/gi.test(content);
            if (hasThinkingTags) {
                const thinkingMatches = content.match(/<thinking>[\s\S]*?<\/thinking>/gi);
                if (thinkingMatches) {
                    for (let i = 0; i < thinkingMatches.length; i++) {
                        recordThinkTag();
                    }
                }
            }
            const explanationPatterns = [
                /(?:let me| i think| essentially| in other words| what i mean is)/gi,
                /^\s*(Here's the|An|a) \w+:/gim,
            ];
            for (const pattern of explanationPatterns) {
                const matches = content.match(pattern);
                if (matches && matches.length > 2) {
                    recordExplanation();
                }
            }
        }
        const stats = nudgeWatchdog.getStats();
        if (stats.activePatterns > 0) {
            const nudge = this.detectMostUrgentNudge(stats);
            if (nudge) {
                const suggestion = getNudgeSuggestion(nudge, { filePath });
                frameworkLogger.log("nudge-processor", "stuck-pattern-detected", "warning", {
                    pattern: nudge,
                    stats,
                    suggestion,
                });
                return {
                    success: true,
                    nudgeDetected: true,
                    pattern: nudge,
                    suggestion,
                    stats,
                };
            }
        }
        return {
            success: true,
            nudgeDetected: false,
            stats,
        };
    }
    detectMostUrgentNudge(stats) {
        const thresholds = {
            "think-loop": stats.thinkTags,
            "syntax-loop": stats.thinkTags,
            "death-spiral": stats.explanations,
            "tool-loop": stats.activePatterns,
            "repair-failure": stats.activePatterns,
        };
        let maxType = null;
        let maxCount = 0;
        const priorities = [
            "repair-failure",
            "syntax-loop",
            "think-loop",
            "tool-loop",
            "death-spiral",
        ];
        for (const type of priorities) {
            const count = thresholds[type] || 0;
            if (count > maxCount) {
                maxCount = count;
                maxType = type;
            }
        }
        return maxType;
    }
}
export const nudgeProcessor = new NudgeProcessor();
export async function executeNudgeProcessor(context) {
    return nudgeProcessor.execute(context);
}
//# sourceMappingURL=nudge-processor.js.map