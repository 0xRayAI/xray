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
export class StringRayConfigLoader {
    configPath;
    cachedConfig = null;
    cacheExpiry = 30000; // 30 seconds
    lastLoadTime = 0;
    constructor(configPath) {
        this.configPath = configPath || resolveConfigPath("config.json") || path.join(getConfigDir(), "config.json");
    }
    /**
     * Load 0xRay configuration from the resolved config directory
     */
    loadConfig() {
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
        }
        catch (error) {
            frameworkLogger.log("config-loader", "load-failed", "error", { error, message: "Failed to load 0xRay config" });
            return this.getDefaultConfig();
        }
    }
    /**
     * Parse configuration data with validation
     */
    parseConfig(configData) {
        // Handle null/undefined config data
        if (!configData) {
            return this.getDefaultConfig();
        }
        return {
            multi_agent_orchestration: this.parseMultiAgentConfig(configData.multi_agent_orchestration),
            autonomous_reporting: this.parseAutonomousReportingConfig(configData.autonomous_reporting),
            disabled_agents: Array.isArray(configData.disabled_agents)
                ? configData.disabled_agents
                : [],
        };
    }
    /**
     * Parse multi-agent orchestration configuration
     */
    parseMultiAgentConfig(config) {
        return {
            enabled: config?.enabled ?? true,
            coordination_model: this.validateEnum(config?.coordination_model, ["async-multi-agent", "sync-multi-agent"], "async-multi-agent"),
            max_concurrent_agents: Math.max(1, Math.min(10, config?.max_concurrent_agents ?? 3)),
            task_distribution_strategy: this.validateEnum(config?.task_distribution_strategy, ["capability-based", "load-balanced", "round-robin"], "capability-based"),
            conflict_resolution: this.validateEnum(config?.conflict_resolution, ["expert-priority", "majority-vote", "consensus"], "expert-priority"),
            progress_tracking: config?.progress_tracking ?? true,
            session_persistence: config?.session_persistence ?? true,
        };
    }
    /**
     * Parse autonomous reporting configuration
     */
    parseAutonomousReportingConfig(config) {
        return {
            enabled: config?.enabled ?? false,
            interval_minutes: Math.max(5, Math.min(1440, config?.interval_minutes ?? 60)), // 5min to 24hrs
            auto_schedule: config?.auto_schedule ?? false,
            include_health_assessment: config?.include_health_assessment ?? true,
            include_agent_activities: config?.include_agent_activities ?? true,
            include_pipeline_operations: config?.include_pipeline_operations ?? true,
            include_critical_issues: config?.include_critical_issues ?? true,
            include_recommendations: config?.include_recommendations ?? true,
            report_retention_days: Math.max(1, Math.min(365, config?.report_retention_days ?? 30)),
            notification_channels: Array.isArray(config?.notification_channels)
                ? config.notification_channels.filter((ch) => ["console", "file", "webhook"].includes(ch))
                : ["console"],
        };
    }
    /**
     * Get default configuration
     */
    getDefaultConfig() {
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
    validateEnum(value, allowedValues, defaultValue) {
        return allowedValues.includes(value) ? value : defaultValue;
    }
    /**
     * Clear configuration cache
     */
    clearCache() {
        this.cachedConfig = null;
        this.lastLoadTime = 0;
    }
}
// Export singleton instance
export const strRayConfigLoader = new StringRayConfigLoader();
//# sourceMappingURL=config-loader.js.map