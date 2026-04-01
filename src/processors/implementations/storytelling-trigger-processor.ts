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
import { ProcessorContext, ProcessorResult } from "../processor-types.js";
import { frameworkLogger } from "../../core/framework-logger.js";

interface StorytellingTriggerConfig {
  enabled: boolean;
  threshold?: number;
  story_type: string;
  remind_user?: boolean;
  file_count_threshold?: number;
  duration_minutes_threshold?: number;
  require_saga?: boolean;
  block_without_story?: boolean;
}

interface StorytellingConfig {
  enabled: boolean;
  reflection_triggers: {
    commit_count: StorytellingTriggerConfig;
    publish: StorytellingTriggerConfig;
    complex_changes: StorytellingTriggerConfig;
    session_duration: StorytellingTriggerConfig;
  };
  story_types: Record<string, {
    location: string;
    min_words: number;
    ideal_words: number;
    framework: string;
  }>;
  quality_requirements: {
    require_frontmatter: boolean;
    require_key_takeaways: boolean;
    require_what_next: boolean;
    fact_check_before_publish: boolean;
    peer_review_agent: string;
  };
}

interface TriggerResult {
  triggered: boolean;
  trigger_type: string;
  story_type: string;
  message: string;
  suggestion: string;
}

export class StorytellingTriggerProcessor extends PostProcessor {
  readonly name = "storytelling-trigger";
  readonly type = "post" as const;
  readonly priority = 5;
  private config: StorytellingConfig | null = null;
  private reflectionsDir = "docs/reflections";
  private deepReflectionsDir = "docs/reflections/deep";

  constructor() {
    super();
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const configPath = this.resolveConfigPath("features.json");
      if (configPath && fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed.storytelling) {
          this.config = parsed.storytelling as StorytellingConfig;
        }
      }
    } catch (error) {
      frameworkLogger.log("storytelling-trigger", "config-load-failed", "warning", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private resolveConfigPath(filename: string): string | null {
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

  protected async run(context: ProcessorContext): Promise<unknown> {
    if (!this.config?.enabled) {
      return { message: "Storytelling triggers disabled", triggers: [] };
    }

    const triggers: TriggerResult[] = [];

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

  private checkCommitTrigger(context: ProcessorContext): TriggerResult {
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

  private checkPublishTrigger(context: ProcessorContext): TriggerResult {
    const config = this.config?.reflection_triggers.publish;
    if (!config?.enabled) {
      return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
    }

    const ctx = context as ProcessorContext & {
      metadata?: { isPublishing?: boolean };
      hook?: string;
    };
    const isPublishing = ctx.metadata?.isPublishing ?? false;

    if (isPublishing || ctx.hook?.includes("publish")) {
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

  private checkComplexChangesTrigger(context: ProcessorContext): TriggerResult {
    const config = this.config?.reflection_triggers.complex_changes;
    if (!config?.enabled) {
      return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
    }

    const ctx = context as ProcessorContext & {
      metadata?: { filesChanged?: number };
    };
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

  private checkSessionDurationTrigger(context: ProcessorContext): TriggerResult {
    const config = this.config?.reflection_triggers.session_duration;
    if (!config?.enabled) {
      return { triggered: false, trigger_type: "", story_type: "", message: "", suggestion: "" };
    }

    const ctx = context as ProcessorContext & {
      metadata?: { sessionDurationMinutes?: number };
    };
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

  private getCommitCountSinceLastReflection(): number {
    try {
      // Get most recent reflection file
      const recentReflection = this.getMostRecentDocument("reflection");
      if (!recentReflection) {
        // No reflections exist, count all commits
        return this.getCommitCount();
      }

      // Get commits since that file was modified
      const result = this.execSync(
        `git log --oneline --since="${fs.statSync(recentReflection).mtime.toISOString()}" 2>/dev/null | wc -l`,
        { silent: true }
      );
      return parseInt(result?.toString().trim() || "0", 10);
    } catch {
      return 0;
    }
  }

  private getCommitCount(): number {
    try {
      const result = this.execSync("git rev-list --count HEAD 2>/dev/null", { silent: true });
      return parseInt(result?.toString().trim() || "0", 10);
    } catch {
      return 0;
    }
  }

  private getMostRecentDocument(storyType: string): string | null {
    const dirs = storyType === "saga" || storyType === "journey"
      ? [this.deepReflectionsDir]
      : [this.reflectionsDir, this.deepReflectionsDir];

    let mostRecent: string | null = null;
    let mostRecentTime = 0;

    for (const dir of dirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) continue;

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

  private getDaysSinceFile(filePath: string): number {
    const stat = fs.statSync(filePath);
    const daysSince = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(daysSince);
  }

  private getSuggestedSagaTitle(): string {
    // Try to get version from package.json
    try {
      const pkgPath = path.join(process.cwd(), "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return `v${pkg.version} Release Journey`;
    } catch {
      return "Recent Release Journey";
    }
  }

  private execSync(command: string, options: { silent?: boolean }): string | Buffer | null {
    try {
      const { execSync } = require("child_process");
      return execSync(command, { encoding: "utf-8", stdio: options.silent ? "pipe" : "inherit" });
    } catch {
      return null;
    }
  }

  /**
   * Get suggested story type based on context
   */
  static suggestStoryType(context: {
    commitCount?: number;
    fileCount?: number;
    sessionDuration?: number;
    isPublishing?: boolean;
  }): "reflection" | "saga" | "journey" | "narrative" {
    if (context.isPublishing) return "saga";
    if (context.fileCount && context.fileCount > 15) return "journey";
    if (context.commitCount && context.commitCount > 10) return "reflection";
    return "reflection";
  }

  /**
   * Get story type metadata
   */
  static getStoryTypeMeta(storyType: string): {
    location: string;
    minWords: number;
    idealWords: number;
    framework: string;
    template: string;
  } {
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

    return defaults[storyType as keyof typeof defaults] ?? defaults.reflection;
  }
}

export default StorytellingTriggerProcessor;