/**
 * Nudge Watchdog - Detects and breaks stuck AI patterns
 *
 * Monitors agent actions and detects common failure patterns:
 * - think-loop: AI keeps outputting thinking tags but no progress
 * - syntax-loop: AI keeps trying to fix same file/error multiple times
 * - death-spiral: AI re-explains instead of fixing
 * - tool-loop: Same tool called with similar args repeatedly
 * - repair-failure: Processor indicates fix but error persists
 *
 * @module monitoring/nudge-watchdog
 * @version 1.0.0
 */
import { EventEmitter } from "events";
import { frameworkLogger } from "../core/framework-logger.js";
import { featuresConfigLoader } from "../core/features-config.js";
const DEFAULT_NUDGE_CONFIG = {
    enabled: true,
    think_loop_threshold: 3,
    syntax_loop_threshold: 3,
    tool_loop_threshold: 5,
    death_spiral_threshold: 3,
    cooldown_ms: 120000,
};
const NUDGE_MESSAGES = {
    "think-loop": {
        type: "think-loop",
        message: "Detected excessive thinking without progress",
        suggestion: "STOP THINKING. Write code now.",
        priority: 1,
    },
    "syntax-loop": {
        type: "syntax-loop",
        message: "Detected repeated fix attempts on same error",
        suggestion: "git checkout HEAD -- <file> && re-apply changes. Consider the root cause.",
        priority: 2,
    },
    "death-spiral": {
        type: "death-spiral",
        message: "Detected repetitive explanations without fixes",
        suggestion: "Delegate to a different agent or try a different approach.",
        priority: 3,
    },
    "tool-loop": {
        type: "tool-loop",
        message: "Detected same tool called repeatedly",
        suggestion: "Consider an alternative tool or approach.",
        priority: 4,
    },
    "repair-failure": {
        type: "repair-failure",
        message: "Processor indicated fix but error persists",
        suggestion: "Trigger different processor or agent.",
        priority: 5,
    },
};
class NudgeWatchdog extends EventEmitter {
    config;
    patterns = new Map();
    lastNudgeTime = 0;
    thinkTagCount = 0;
    lastThinkTagTime = 0;
    toolCallHistory = new Map();
    fixAttempts = new Map();
    explanationCount = 0;
    codeChangeCount = 0;
    listenersInitialized = false;
    constructor(config = {}) {
        super();
        this.setMaxListeners(50);
        this.config = { ...DEFAULT_NUDGE_CONFIG, ...config };
        this.loadConfigFromFeatures();
    }
    loadConfigFromFeatures() {
        try {
            const features = featuresConfigLoader.loadConfig();
            const nudgeConfig = features?.nudge_watchdog;
            if (nudgeConfig) {
                this.config = { ...this.config, ...nudgeConfig };
            }
        }
        catch {
            // Use defaults
        }
    }
    start() {
        if (!this.config.enabled) {
            return;
        }
        this.log("nudge-watchdog", "started", "info", { config: this.config });
    }
    stop() {
        this.log("nudge-watchdog", "stopped", "info");
    }
    recordThinkTag() {
        const now = Date.now();
        if (now - this.lastThinkTagTime < 5000) {
            this.thinkTagCount++;
        }
        else {
            this.thinkTagCount = 1;
        }
        this.lastThinkTagTime = now;
        this.checkThinkLoop();
    }
    recordCodeChange() {
        this.codeChangeCount++;
        const now = Date.now();
        if (now - this.lastThinkTagTime < 30000) {
            this.thinkTagCount = Math.max(0, this.thinkTagCount - 1);
        }
    }
    recordToolCall(tool, args) {
        const key = `${tool}:${this.hashArgs(args)}`;
        const existing = this.toolCallHistory.get(key);
        if (existing) {
            existing.count++;
            existing.timestamp = Date.now();
        }
        else {
            this.toolCallHistory.set(key, { count: 1, args, timestamp: Date.now() });
        }
        this.checkToolLoop();
        this.cleanupOldToolCalls();
    }
    recordFixAttempt(filePath, error) {
        const key = filePath;
        const existing = this.fixAttempts.get(key);
        if (existing && this.isSimilarError(existing.error, error)) {
            existing.count++;
            existing.timestamp = Date.now();
        }
        else {
            this.fixAttempts.set(key, { count: 1, error, timestamp: Date.now() });
        }
        this.checkSyntaxLoop(filePath);
    }
    recordExplanation() {
        this.explanationCount++;
        this.checkDeathSpiral();
    }
    recordProcessorFix(filePath, fixed, errorPersisted) {
        if (fixed && errorPersisted) {
            const key = `fix:${filePath}`;
            const existing = this.patterns.get(key);
            if (existing) {
                existing.count++;
                existing.lastSeen = Date.now();
            }
            else {
                this.patterns.set(key, {
                    type: "repair-failure",
                    count: 1,
                    firstSeen: Date.now(),
                    lastSeen: Date.now(),
                    details: { filePath },
                });
            }
            this.checkRepairFailure();
        }
    }
    checkThinkLoop() {
        const threshold = this.config.think_loop_threshold;
        if (this.thinkTagCount >= threshold && this.codeChangeCount < threshold) {
            const key = "think-loop";
            const existing = this.patterns.get(key);
            if (existing) {
                existing.count++;
                existing.lastSeen = Date.now();
            }
            else {
                this.patterns.set(key, {
                    type: "think-loop",
                    count: 1,
                    firstSeen: Date.now(),
                    lastSeen: Date.now(),
                    details: { thinkTags: this.thinkTagCount, codeChanges: this.codeChangeCount },
                });
            }
            this.checkCooldownAndNudge("think-loop");
        }
    }
    checkToolLoop() {
        const threshold = this.config.tool_loop_threshold;
        for (const [key, data] of this.toolCallHistory) {
            if (data.count >= threshold) {
                const existing = this.patterns.get(key);
                const tool = key.split(":")[0];
                if (existing) {
                    existing.count++;
                    existing.lastSeen = Date.now();
                }
                else {
                    this.patterns.set(key, {
                        type: "tool-loop",
                        count: 1,
                        firstSeen: Date.now(),
                        lastSeen: Date.now(),
                        details: { tool, args: data.args },
                    });
                }
                this.checkCooldownAndNudge("tool-loop");
                break;
            }
        }
    }
    checkSyntaxLoop(filePath) {
        const entry = this.fixAttempts.get(filePath);
        if (!entry)
            return;
        const threshold = this.config.syntax_loop_threshold;
        if (entry.count >= threshold) {
            this.checkCooldownAndNudge("syntax-loop");
        }
    }
    checkDeathSpiral() {
        const threshold = this.config.death_spiral_threshold;
        if (this.explanationCount >= threshold && this.codeChangeCount < threshold) {
            const key = "death-spiral";
            const existing = this.patterns.get(key);
            if (existing) {
                existing.count++;
                existing.lastSeen = Date.now();
            }
            else {
                this.patterns.set(key, {
                    type: "death-spiral",
                    count: 1,
                    firstSeen: Date.now(),
                    lastSeen: Date.now(),
                    details: { explanations: this.explanationCount, codeChanges: this.codeChangeCount },
                });
            }
            this.checkCooldownAndNudge("death-spiral");
        }
    }
    checkRepairFailure() {
        for (const [key, pattern] of this.patterns) {
            if (pattern.type === "repair-failure" && pattern.count >= 2) {
                this.checkCooldownAndNudge("repair-failure");
                break;
            }
        }
    }
    checkCooldownAndNudge(type) {
        const now = Date.now();
        if (now - this.lastNudgeTime < this.config.cooldown_ms) {
            return;
        }
        const action = this.triggerNudge(type);
        if (action) {
            this.lastNudgeTime = now;
        }
    }
    triggerNudge(type) {
        const action = NUDGE_MESSAGES[type];
        if (!action)
            return null;
        this.emit("nudge", action);
        this.log("nudge-watchdog", "nudge-triggered", "warning", {
            type: action.type,
            message: action.message,
            suggestion: action.suggestion,
        });
        return action;
    }
    getNudgeSuggestion(type, context) {
        const action = NUDGE_MESSAGES[type];
        if (!action)
            return "";
        let suggestion = action.suggestion;
        if (context?.filePath && type === "syntax-loop") {
            suggestion = suggestion.replace("<file>", context.filePath);
        }
        return suggestion;
    }
    hashArgs(args) {
        let hash = 0;
        for (let i = 0; i < args.length; i++) {
            const char = args.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    isSimilarError(error1, error2) {
        if (!error1 || !error2)
            return false;
        return error1.substring(0, 100) === error2.substring(0, 100);
    }
    cleanupOldToolCalls() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000;
        for (const [key, data] of this.toolCallHistory) {
            if (now - data.timestamp > maxAge) {
                this.toolCallHistory.delete(key);
            }
        }
        for (const [key, data] of this.fixAttempts) {
            if (now - data.timestamp > maxAge) {
                this.fixAttempts.delete(key);
            }
        }
    }
    reset() {
        this.thinkTagCount = 0;
        this.codeChangeCount = 0;
        this.explanationCount = 0;
        this.toolCallHistory.clear();
        this.fixAttempts.clear();
        this.patterns.clear();
        this.lastNudgeTime = 0;
    }
    getStats() {
        return {
            thinkTags: this.thinkTagCount,
            codeChanges: this.codeChangeCount,
            explanations: this.explanationCount,
            activePatterns: this.patterns.size,
            lastNudgeAgo: Date.now() - this.lastNudgeTime,
        };
    }
    log(component, action, status, details) {
        try {
            frameworkLogger.log(component, action, status, details);
        }
        catch {
            // Silent fail
        }
    }
}
export const nudgeWatchdog = new NudgeWatchdog();
export function recordThinkTag() {
    nudgeWatchdog.recordThinkTag();
}
export function recordCodeChange() {
    nudgeWatchdog.recordCodeChange();
}
export function recordToolCall(tool, args) {
    nudgeWatchdog.recordToolCall(tool, args);
}
export function recordFixAttempt(filePath, error) {
    nudgeWatchdog.recordFixAttempt(filePath, error);
}
export function recordExplanation() {
    nudgeWatchdog.recordExplanation();
}
export function getNudgeSuggestion(type, context) {
    return nudgeWatchdog.getNudgeSuggestion(type, context);
}
export function getNudgeWatchdog() {
    return nudgeWatchdog;
}
export function recordProcessorFix(filePath, fixed, errorPersisted) {
    nudgeWatchdog.recordProcessorFix(filePath, fixed, errorPersisted);
}
//# sourceMappingURL=nudge-watchdog.js.map