/**
 * Nudge Processor - Integrates Nudge Watchdog with processor system
 *
 * Post-processor that monitors agent actions and triggers nudges
 * when stuck patterns are detected.
 *
 * @module processors/implementations
 */

import { PostProcessor } from "../processor-interfaces.js";
import { ProcessorContext, ProcessorResult } from "../processor-types.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import {
  nudgeWatchdog,
  recordThinkTag,
  recordCodeChange,
  recordToolCall,
  recordFixAttempt,
  recordExplanation,
  NudgeType,
  getNudgeSuggestion,
} from "../../monitoring/nudge-watchdog.js";
import { featuresConfigLoader } from "../../core/features-config.js";

interface NudgeStats {
  thinkTags: number;
  codeChanges: number;
  explanations: number;
  activePatterns: number;
  lastNudgeAgo: number;
}

export class NudgeProcessor extends PostProcessor {
  readonly name = "nudge";
  readonly priority = 100;

  private nudgeEnabled = true;

  constructor() {
    super();
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const features = featuresConfigLoader.loadConfig() as unknown as Record<string, unknown>;
      const nudgeConfig = features?.nudge_watchdog as Record<string, unknown> | undefined;
      if (nudgeConfig) {
        this.nudgeEnabled = nudgeConfig.enabled !== false;
      }
    } catch {
      // Use defaults
    }
  }

  protected async run(context: ProcessorContext): Promise<unknown> {
    if (!this.nudgeEnabled) {
      return { success: true, reason: "nudge processor disabled" };
    }

    const tool = context.tool as string | undefined;
    const filePath = context.filePath as string | undefined;
    const content = context.content as string | undefined;
    const toolInput = context.toolInput;

    if (toolInput?.tool) {
      recordToolCall(
        toolInput.tool as string,
        JSON.stringify(toolInput.args || {}),
      );
    }

    if (tool === "edit" || tool === "write") {
      recordCodeChange();
    }

    if (tool === "read" || tool === "Glob") {
      const args = toolInput?.args;
      if (args?.operation === "read-multiple" || args?.filePath) {
        recordFixAttempt(args.filePath as string, "repeated-read");
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

        frameworkLogger.log(
          "nudge-processor",
          "stuck-pattern-detected",
          "warning",
          {
            pattern: nudge,
            stats,
            suggestion,
          },
        );

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

  private detectMostUrgentNudge(stats: NudgeStats): NudgeType | null {
    const thresholds: Record<NudgeType, number> = {
      "think-loop": stats.thinkTags,
      "syntax-loop": stats.thinkTags,
      "death-spiral": stats.explanations,
      "tool-loop": stats.activePatterns,
      "repair-failure": stats.activePatterns,
    };

    let maxType: NudgeType | null = null;
    let maxCount = 0;

    const priorities: NudgeType[] = [
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

export async function executeNudgeProcessor(
  context: ProcessorContext,
): Promise<ProcessorResult> {
  return nudgeProcessor.execute(context);
}