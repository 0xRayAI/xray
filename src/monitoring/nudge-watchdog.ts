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
 */

import { EventEmitter } from "events";
import { frameworkLogger } from "../core/framework-logger.js";
import { featuresConfigLoader } from "../core/features-config.js";

export interface NudgeConfig {
  enabled: boolean;
  think_loop_threshold: number;
  syntax_loop_threshold: number;
  tool_loop_threshold: number;
  death_spiral_threshold: number;
  cooldown_ms: number;
}

export type NudgeType =
  | "think-loop"
  | "syntax-loop"
  | "death-spiral"
  | "tool-loop"
  | "repair-failure";

export interface StuckPattern {
  type: NudgeType;
  count: number;
  firstSeen: number;
  lastSeen: number;
  details: Record<string, unknown>;
}

export interface NudgeAction {
  type: NudgeType;
  message: string;
  suggestion: string;
  priority: number;
}

const DEFAULT_NUDGE_CONFIG: NudgeConfig = {
  enabled: true,
  think_loop_threshold: 3,
  syntax_loop_threshold: 3,
  tool_loop_threshold: 5,
  death_spiral_threshold: 3,
  cooldown_ms: 120000,
};

const NUDGE_MESSAGES: Record<NudgeType, NudgeAction> = {
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
  private config: NudgeConfig;
  private patterns: Map<string, StuckPattern> = new Map();
  private lastNudgeTime = 0;
  private thinkTagCount = 0;
  private lastThinkTagTime = 0;
  private toolCallHistory: Map<string, { count: number; args: string; timestamp: number }> = new Map();
  private fixAttempts: Map<string, { count: number; error: string; timestamp: number }> = new Map();
  private explanationCount = 0;
  private codeChangeCount = 0;
  private listenersInitialized = false;

  constructor(config: Partial<NudgeConfig> = {}) {
    super();
    this.setMaxListeners(50);
    this.config = { ...DEFAULT_NUDGE_CONFIG, ...config };
    this.loadConfigFromFeatures();
  }

  private loadConfigFromFeatures(): void {
    try {
      const features = featuresConfigLoader.loadConfig() as unknown as Record<string, unknown>;
      const nudgeConfig = features?.nudge_watchdog as NudgeConfig | undefined;
      if (nudgeConfig) {
        this.config = { ...this.config, ...nudgeConfig };
      }
    } catch {
      // Use defaults
    }
  }

  start(): void {
    if (!this.config.enabled) {
      return;
    }
    this.log("nudge-watchdog", "started", "info", { config: this.config });
  }

  stop(): void {
    this.log("nudge-watchdog", "stopped", "info");
  }

  recordThinkTag(): void {
    const now = Date.now();
    if (now - this.lastThinkTagTime < 5000) {
      this.thinkTagCount++;
    } else {
      this.thinkTagCount = 1;
    }
    this.lastThinkTagTime = now;
    this.checkThinkLoop();
  }

  recordCodeChange(): void {
    this.codeChangeCount++;
    const now = Date.now();
    if (now - this.lastThinkTagTime < 30000) {
      this.thinkTagCount = Math.max(0, this.thinkTagCount - 1);
    }
  }

  recordToolCall(tool: string, args: string): void {
    const key = `${tool}:${this.hashArgs(args)}`;
    const existing = this.toolCallHistory.get(key);

    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
      this.toolCallHistory.set(key, { count: 1, args, timestamp: Date.now() });
    }

    this.checkToolLoop();
    this.cleanupOldToolCalls();
  }

  recordFixAttempt(filePath: string, error: string): void {
    const key = filePath;
    const existing = this.fixAttempts.get(key);

    if (existing && this.isSimilarError(existing.error, error)) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
      this.fixAttempts.set(key, { count: 1, error, timestamp: Date.now() });
    }

    this.checkSyntaxLoop(filePath);
  }

  recordExplanation(): void {
    this.explanationCount++;
    this.checkDeathSpiral();
  }

  recordProcessorFix(filePath: string, fixed: boolean, errorPersisted: boolean): void {
    if (fixed && errorPersisted) {
      const key = `fix:${filePath}`;
      const existing = this.patterns.get(key);

      if (existing) {
        existing.count++;
        existing.lastSeen = Date.now();
      } else {
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

  private checkThinkLoop(): void {
    const threshold = this.config.think_loop_threshold;
    if (this.thinkTagCount >= threshold && this.codeChangeCount < threshold) {
      const key = "think-loop";
      const existing = this.patterns.get(key);

      if (existing) {
        existing.count++;
        existing.lastSeen = Date.now();
      } else {
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

  private checkToolLoop(): void {
    const threshold = this.config.tool_loop_threshold;

    for (const [key, data] of this.toolCallHistory) {
      if (data.count >= threshold) {
        const existing = this.patterns.get(key);
        const tool = key.split(":")[0];

        if (existing) {
          existing.count++;
          existing.lastSeen = Date.now();
        } else {
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

  private checkSyntaxLoop(filePath: string): void {
    const entry = this.fixAttempts.get(filePath);
    if (!entry) return;

    const threshold = this.config.syntax_loop_threshold;
    if (entry.count >= threshold) {
      this.checkCooldownAndNudge("syntax-loop");
    }
  }

  private checkDeathSpiral(): void {
    const threshold = this.config.death_spiral_threshold;
    if (this.explanationCount >= threshold && this.codeChangeCount < threshold) {
      const key = "death-spiral";
      const existing = this.patterns.get(key);

      if (existing) {
        existing.count++;
        existing.lastSeen = Date.now();
      } else {
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

  private checkRepairFailure(): void {
    for (const [key, pattern] of this.patterns) {
      if (pattern.type === "repair-failure" && pattern.count >= 2) {
        this.checkCooldownAndNudge("repair-failure");
        break;
      }
    }
  }

  private checkCooldownAndNudge(type: NudgeType): void {
    const now = Date.now();
    if (now - this.lastNudgeTime < this.config.cooldown_ms) {
      return;
    }

    const action = this.triggerNudge(type);
    if (action) {
      this.lastNudgeTime = now;
    }
  }

  private triggerNudge(type: NudgeType): NudgeAction | null {
    const action = NUDGE_MESSAGES[type];
    if (!action) return null;

    this.emit("nudge", action);

    this.log("nudge-watchdog", "nudge-triggered", "warning", {
      type: action.type,
      message: action.message,
      suggestion: action.suggestion,
    });

    return action;
  }

  getNudgeSuggestion(type: NudgeType, context?: Record<string, unknown>): string {
    const action = NUDGE_MESSAGES[type];
    if (!action) return "";

    let suggestion = action.suggestion;
    if (context?.filePath && type === "syntax-loop") {
      suggestion = suggestion.replace("<file>", context.filePath as string);
    }

    return suggestion;
  }

  private hashArgs(args: string): string {
    let hash = 0;
    for (let i = 0; i < args.length; i++) {
      const char = args.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private isSimilarError(error1: string, error2: string): boolean {
    if (!error1 || !error2) return false;
    return error1.substring(0, 100) === error2.substring(0, 100);
  }

  private cleanupOldToolCalls(): void {
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

  reset(): void {
    this.thinkTagCount = 0;
    this.codeChangeCount = 0;
    this.explanationCount = 0;
    this.toolCallHistory.clear();
    this.fixAttempts.clear();
    this.patterns.clear();
    this.lastNudgeTime = 0;
  }

  getStats(): {
    thinkTags: number;
    codeChanges: number;
    explanations: number;
    activePatterns: number;
    lastNudgeAgo: number;
  } {
    return {
      thinkTags: this.thinkTagCount,
      codeChanges: this.codeChangeCount,
      explanations: this.explanationCount,
      activePatterns: this.patterns.size,
      lastNudgeAgo: Date.now() - this.lastNudgeTime,
    };
  }

  private log(
    component: string,
    action: string,
    status: "info" | "warning" | "error" | "success",
    details?: Record<string, unknown>,
  ): void {
    try {
      frameworkLogger.log(component, action, status, details);
    } catch {
      // Silent fail
    }
  }
}

export const nudgeWatchdog = new NudgeWatchdog();

export function recordThinkTag(): void {
  nudgeWatchdog.recordThinkTag();
}

export function recordCodeChange(): void {
  nudgeWatchdog.recordCodeChange();
}

export function recordToolCall(tool: string, args: string): void {
  nudgeWatchdog.recordToolCall(tool, args);
}

export function recordFixAttempt(filePath: string, error: string): void {
  nudgeWatchdog.recordFixAttempt(filePath, error);
}

export function recordExplanation(): void {
  nudgeWatchdog.recordExplanation();
}

export function getNudgeSuggestion(type: NudgeType, context?: Record<string, unknown>): string {
  return nudgeWatchdog.getNudgeSuggestion(type, context);
}

export function getNudgeWatchdog(): NudgeWatchdog {
  return nudgeWatchdog;
}

export function recordProcessorFix(filePath: string, fixed: boolean, errorPersisted: boolean): void {
  nudgeWatchdog.recordProcessorFix(filePath, fixed, errorPersisted);
}