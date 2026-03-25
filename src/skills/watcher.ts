import * as fs from "fs";
import * as path from "path";
import { SkillRegistry } from "./registry.js";
import { frameworkLogger } from "../core/framework-logger.js";

export interface SkillWatcherOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onSkillAdded?: (skillName: string) => void;
  onSkillRemoved?: (skillName: string) => void;
  onSkillChanged?: (skillName: string) => void;
}

export class SkillWatcher {
  private registry: SkillRegistry;
  private directory: string;
  private watcher: fs.FSWatcher | undefined = undefined;
  private options: Required<SkillWatcherOptions>;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 500;

  constructor(registry: SkillRegistry, directory: string, options: SkillWatcherOptions = {}) {
    this.registry = registry;
    this.directory = directory;
    this.options = {
      autoRefresh: options.autoRefresh ?? true,
      refreshInterval: options.refreshInterval ?? 60000,
      onSkillAdded: options.onSkillAdded ?? (() => {}),
      onSkillRemoved: options.onSkillRemoved ?? (() => {}),
      onSkillChanged: options.onSkillChanged ?? (() => {}),
    };
  }

  start(): void {
    if (this.watcher) {
      return;
    }

    const skillsPath = path.join(this.directory, ".opencode", "skills");
    const integrationsPath = path.join(this.directory, ".opencode", "integrations");

    try {
      this.watcher = fs.watch(
        this.directory,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;
          
          const fullPath = path.join(this.directory, filename);
          
          if (this.isSkillPath(fullPath)) {
            this.handleSkillChange(eventType, fullPath);
          }
        }
      );

      this.watcher.on("error", (error) => {
        frameworkLogger.log(
          "skill-watcher",
          "watch-error",
          "error",
          { error: String(error) }
        );
      });

      frameworkLogger.log(
        "skill-watcher",
        "started",
        "info",
        { path: this.directory }
      );
    } catch (error) {
      frameworkLogger.log(
        "skill-watcher",
        "start-error",
        "error",
        { error: String(error) }
      );
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    frameworkLogger.log(
      "skill-watcher",
      "stopped",
      "info",
      {}
    );
  }

  private isSkillPath(filePath: string): boolean {
    return (
      filePath.includes(".opencode/skills/") ||
      filePath.includes(".opencode/integrations/")
    ) && filePath.endsWith("SKILL.md");
  }

  private handleSkillChange(eventType: string, fullPath: string): void {
    const skillDir = path.dirname(fullPath);
    const skillName = path.basename(skillDir);

    const existingTimer = this.debounceTimers.get(skillName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(skillName);
      this.processSkillChange(eventType, fullPath, skillName);
    }, this.debounceMs);

    this.debounceTimers.set(skillName, timer);
  }

  private async processSkillChange(
    eventType: string,
    fullPath: string,
    skillName: string
  ): Promise<void> {
    if (!this.options.autoRefresh) {
      return;
    }

    try {
      const exists = fs.existsSync(fullPath);

      if (exists) {
        await this.registry.refresh();
        this.options.onSkillChanged(skillName);

        frameworkLogger.log(
          "skill-watcher",
          "skill-changed",
          "info",
          { skillName, path: fullPath }
        );
      } else {
        this.options.onSkillRemoved(skillName);

        frameworkLogger.log(
          "skill-watcher",
          "skill-removed",
          "info",
          { skillName }
        );
      }
    } catch (error) {
      frameworkLogger.log(
        "skill-watcher",
        "refresh-error",
        "error",
        { skillName, error: String(error) }
      );
    }
  }

  isRunning(): boolean {
    return this.watcher !== undefined;
  }

  async forceRefresh(): Promise<void> {
    await this.registry.refresh();
    
    frameworkLogger.log(
      "skill-watcher",
      "force-refresh",
      "info",
      { count: this.registry.count() }
    );
  }
}

export function createSkillWatcher(
  registry: SkillRegistry,
  directory: string,
  options?: SkillWatcherOptions
): SkillWatcher {
  return new SkillWatcher(registry, directory, options);
}
