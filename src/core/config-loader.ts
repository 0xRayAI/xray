/**
 * Configuration Loader (backward-compat shim)
 *
 * Delegates to FeaturesConfigLoader as the single source of truth.
 * Retained for backward compatibility -- all consumers of xrayConfigLoader
 * continue to work without changes.
 *
 * @deprecated Use featuresConfigLoader from "./features-config.js" instead.
 * Will be removed in v4.0.0.
 */

import { featuresConfigLoader, FeaturesConfigLoader } from "./features-config.js";
import { frameworkLogger } from "./framework-logger.js";
import { resolveConfigPath } from "./config-paths.js";
import * as fs from "fs";
import * as path from "path";

export type { MultiAgentOrchestrationConfig, AutonomousReportingConfig } from "./features-config.js";

export interface XrayConfig {
  multi_agent_orchestration: import("./features-config.js").MultiAgentOrchestrationConfig;
  autonomous_reporting: import("./features-config.js").AutonomousReportingConfig;
  disabled_agents: string[];
}

export class XrayConfigLoader {
  private configPath: string;
  private cachedConfig: XrayConfig | null = null;
  private cacheExpiry: number = 30000;
  private lastLoadTime: number = 0;

  constructor(configPath?: string) {
    this.configPath = configPath || resolveConfigPath("config.json") || path.join(process.cwd(), ".xray", "config.json");
  }

  /**
   * Load configuration -- delegates to FeaturesConfigLoader
   * @deprecated Use featuresConfigLoader.getXrayConfig() instead.
   */
  public loadConfig(): XrayConfig {
    const now = Date.now();

    if (this.cachedConfig && now - this.lastLoadTime < this.cacheExpiry) {
      return this.cachedConfig;
    }

    const primary = featuresConfigLoader.getXrayConfig();

    try {
      const configPath = path.resolve(process.cwd(), this.configPath);
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));

        if (configData.multi_agent_orchestration || configData.autonomous_reporting || configData.disabled_agents) {
          frameworkLogger.log(
            "config-loader",
            "deprecated-config-json",
            "warning",
            { message: "config.json contains overlapping keys. Migrate to features.json. See: https://0xray.ai/docs/config-migration" },
          );
        }
      }
    } catch {
      // config.json may not exist -- that's fine, features.json is SSOT
    }

    this.cachedConfig = primary;
    this.lastLoadTime = now;
    return primary;
  }

  /**
   * Parse configuration data with validation
   * @deprecated Use featuresConfigLoader.loadConfig() instead.
   */
  private parseConfig(configData: unknown): XrayConfig {
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
   * @deprecated Use featuresConfigLoader.loadConfig().multi_agent_orchestration instead.
   */
  private parseMultiAgentConfig(config: unknown): import("./features-config.js").MultiAgentOrchestrationConfig {
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
   * @deprecated Use featuresConfigLoader.loadConfig().autonomous_reporting instead.
   */
  private parseAutonomousReportingConfig(
    config: unknown,
  ): import("./features-config.js").AutonomousReportingConfig {
    if (!config || typeof config !== 'object') {
      return this.getDefaultConfig().autonomous_reporting;
    }
    const cfg = config as Record<string, unknown>;
    return {
      enabled: typeof cfg.enabled === 'boolean' ? cfg.enabled : true,
      interval_minutes: Math.max(
        5,
        Math.min(1440, typeof cfg.interval_minutes === 'number' ? cfg.interval_minutes : 60),
      ),
      auto_schedule: typeof cfg.auto_schedule === 'boolean' ? cfg.auto_schedule : true,
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
   * @deprecated Use featuresConfigLoader.getDefaultConfig() instead.
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
        enabled: true,
        interval_minutes: 60,
        auto_schedule: true,
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
   * @deprecated Internal implementation detail.
   */
  private validateEnum<T>(value: unknown, allowedValues: T[], defaultValue: T): T {
    return allowedValues.includes(value as T) ? value as T : defaultValue;
  }

  /**
   * Clear configuration cache
   * @deprecated Use featuresConfigLoader.clearCache() instead.
   */
  public clearCache(): void {
    this.cachedConfig = null;
    this.lastLoadTime = 0;
    featuresConfigLoader.clearCache();
  }
}

export const xrayConfigLoader = new XrayConfigLoader();