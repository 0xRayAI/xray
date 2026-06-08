/**
 * Configuration Loader
 *
 * Loads and validates 0xRay-specific configuration from opencode.json
 *
 * @version 1.0.0
 * @since 2026-01-09
 */

import * as fs from "fs";
import * as path from "path";
import { frameworkLogger } from "./framework-logger.js";
import { getConfigDir, resolveConfigPath } from "./config-paths.js";

export interface MultiAgentOrchestrationConfig {
  enabled: boolean;
  coordination_model: "async-multi-agent" | "sync-multi-agent";
  max_concurrent_agents: number;
  task_distribution_strategy:
    | "capability-based"
    | "load-balanced"
    | "round-robin";
  conflict_resolution: "expert-priority" | "majority-vote" | "consensus";
  progress_tracking: boolean;
  session_persistence: boolean;
}

export interface AutonomousReportingConfig {
  enabled: boolean;
  interval_minutes: number;
  auto_schedule: boolean;
  include_health_assessment: boolean;
  include_agent_activities: boolean;
  include_pipeline_operations: boolean;
  include_critical_issues: boolean;
  include_recommendations: boolean;
  report_retention_days: number;
  notification_channels: string[]; // ["console", "file", "webhook"]
}

export interface XrayConfig {
  multi_agent_orchestration: MultiAgentOrchestrationConfig;
  autonomous_reporting: AutonomousReportingConfig;
  disabled_agents: string[];
}

export class XrayConfigLoader {
  private configPath: string;
  private cachedConfig: XrayConfig | null = null;
  private cacheExpiry: number = 30000; // 30 seconds
  private lastLoadTime: number = 0;

  constructor(configPath?: string) {
    this.configPath = configPath || resolveConfigPath("config.json") || path.join(getConfigDir(), "config.json");
  }

  /**
   * Load 0xRay configuration from the resolved config directory
   */
  public loadConfig(): XrayConfig {
    const now = Date.now();

    // Return cached config if still valid
    if (this.cachedConfig && now - this.lastLoadTime < this.cacheExpiry) {
      return this.cachedConfig;
    }

    try {
      const configPath = path.resolve(process.cwd(), this.configPath);

      if (!fs.existsSync(configPath)) {
        return this.getDefaultConfig();
      }

      const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const config = this.parseConfig(configData);

      this.cachedConfig = config;
      this.lastLoadTime = now;

      return config;
    } catch (error) {
      frameworkLogger.log("config-loader", "load-failed", "error", { error, message: "Failed to load 0xRay config" });
      return this.getDefaultConfig();
    }
  }

  /**
   * Parse configuration data with validation
   */
  private parseConfig(configData: unknown): XrayConfig {
    // Handle null/undefined config data
    if (!configData || typeof configData !== 'object') {
      return this.getDefaultConfig();
    }

    const data = configData as Record<string, unknown>;

    return {
      multi_agent_orchestration: this.parseMultiAgentConfig(
        data.multi_agent_orchestration,
      ),
      autonomous_reporting: this.parseAutonomousReportingConfig(
        data.autonomous_reporting,
      ),
      disabled_agents: Array.isArray(data.disabled_agents)
        ? data.disabled_agents
        : [],
    };
  }

  /**
   * Parse multi-agent orchestration configuration
   */
  private parseMultiAgentConfig(config: unknown): MultiAgentOrchestrationConfig {
    if (!config || typeof config !== 'object') {
      return this.getDefaultConfig().multi_agent_orchestration;
    }
    const cfg = config as Record<string, unknown>;
    return {
      enabled: typeof cfg.enabled === 'boolean' ? cfg.enabled : true,
      coordination_model: this.validateEnum(
        cfg.coordination_model,
        ["async-multi-agent", "sync-multi-agent"],
        "async-multi-agent",
      ),
      max_concurrent_agents: Math.max(
        1,
        Math.min(10, typeof cfg.max_concurrent_agents === 'number' ? cfg.max_concurrent_agents : 3),
      ),
      task_distribution_strategy: this.validateEnum(
        cfg.task_distribution_strategy,
        ["capability-based", "load-balanced", "round-robin"],
        "capability-based",
      ),
      conflict_resolution: this.validateEnum(
        cfg.conflict_resolution,
        ["expert-priority", "majority-vote", "consensus"],
        "expert-priority",
      ),
      progress_tracking: typeof cfg.progress_tracking === 'boolean' ? cfg.progress_tracking : true,
      session_persistence: typeof cfg.session_persistence === 'boolean' ? cfg.session_persistence : true,
    };
  }

  /**
   * Parse autonomous reporting configuration
   */
  private parseAutonomousReportingConfig(
    config: unknown,
  ): AutonomousReportingConfig {
    if (!config || typeof config !== 'object') {
      return this.getDefaultConfig().autonomous_reporting;
    }
    const cfg = config as Record<string, unknown>;
    return {
      enabled: typeof cfg.enabled === 'boolean' ? cfg.enabled : false,
      interval_minutes: Math.max(
        5,
        Math.min(1440, typeof cfg.interval_minutes === 'number' ? cfg.interval_minutes : 60),
      ), // 5min to 24hrs
      auto_schedule: typeof cfg.auto_schedule === 'boolean' ? cfg.auto_schedule : false,
      include_health_assessment: typeof cfg.include_health_assessment === 'boolean' ? cfg.include_health_assessment : true,
      include_agent_activities: typeof cfg.include_agent_activities === 'boolean' ? cfg.include_agent_activities : true,
      include_pipeline_operations: typeof cfg.include_pipeline_operations === 'boolean' ? cfg.include_pipeline_operations : true,
      include_critical_issues: typeof cfg.include_critical_issues === 'boolean' ? cfg.include_critical_issues : true,
      include_recommendations: typeof cfg.include_recommendations === 'boolean' ? cfg.include_recommendations : true,
      report_retention_days: Math.max(
        1,
        Math.min(365, typeof cfg.report_retention_days === 'number' ? cfg.report_retention_days : 30),
      ),
      notification_channels: Array.isArray(cfg.notification_channels)
        ? (cfg.notification_channels as string[]).filter((ch) =>
            ["console", "file", "webhook"].includes(ch),
          )
        : ["console"],
    };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): XrayConfig {
    return {
      multi_agent_orchestration: {
        enabled: true,
        coordination_model: "async-multi-agent",
        max_concurrent_agents: 3,
        task_distribution_strategy: "capability-based",
        conflict_resolution: "expert-priority",
        progress_tracking: true,
        session_persistence: true,
      },
      autonomous_reporting: {
        enabled: false, // Disabled by default for performance
        interval_minutes: 60,
        auto_schedule: false,
        include_health_assessment: true,
        include_agent_activities: true,
        include_pipeline_operations: true,
        include_critical_issues: true,
        include_recommendations: true,
        report_retention_days: 30,
        notification_channels: ["console"],
      },
      disabled_agents: [],
    };
  }

  /**
   * Validate enum values
   */
  private validateEnum<T>(value: unknown, allowedValues: T[], defaultValue: T): T {
    return allowedValues.includes(value as T) ? value as T : defaultValue;
  }

  /**
   * Clear configuration cache
   */
  public clearCache(): void {
    this.cachedConfig = null;
    this.lastLoadTime = 0;
  }
}

// Export singleton instance
export const xrayConfigLoader = new XrayConfigLoader();
// Backward compat alias
export { xrayConfigLoader as strRayConfigLoader, XrayConfigLoader as StringRayConfigLoader };
