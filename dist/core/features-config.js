/**
 * Features Configuration Loader
 *
 * Loads and validates the unified features configuration from features.json
 * Supports token optimization, model routing, batch operations, and more.
 *
 * @version 1.0.0
 * @since 2026-01-25
 */
import * as fs from "fs";
import * as path from "path";
import { getConfigDir, resolveConfigPath } from "./config-paths.js";
/**
 * Detect task type from tool name and context
 */
export function detectTaskType(toolName, context) {
    const toolLower = toolName.toLowerCase();
    // File operations
    if (toolLower.includes("read") || toolLower === "cat") {
        return "file_read";
    }
    // Search operations
    if (toolLower.includes("grep") ||
        toolLower.includes("search") ||
        toolLower.includes("find")) {
        return "grep_search";
    }
    // Git operations
    if (toolLower.includes("git") ||
        toolLower.includes("commit") ||
        toolLower.includes("push")) {
        return "git_operations";
    }
    // Edit operations - check complexity
    if (toolLower.includes("edit") ||
        toolLower.includes("write") ||
        toolLower.includes("sed")) {
        const fileCount = context?.fileCount ?? 1;
        const isComplex = context?.isComplex ?? false;
        if (fileCount > 5 || isComplex) {
            return "bulk_refactor";
        }
        return "simple_edit";
    }
    // Documentation
    if (toolLower.includes("doc") ||
        toolLower.includes("readme") ||
        toolLower.includes("markdown")) {
        return "documentation";
    }
    // Security
    if (toolLower.includes("security") ||
        toolLower.includes("audit") ||
        toolLower.includes("vulnerability")) {
        return "security_audit";
    }
    // Architecture
    if (toolLower.includes("architect") ||
        toolLower.includes("design") ||
        toolLower.includes("structure")) {
        return "architecture_review";
    }
    // Code generation
    if (toolLower.includes("generate") ||
        toolLower.includes("create") ||
        toolLower.includes("implement")) {
        return "code_generation";
    }
    // Debugging
    if (toolLower.includes("debug") ||
        toolLower.includes("fix") ||
        toolLower.includes("error")) {
        return "debugging";
    }
    return "unknown";
}
// ============================================================================
// Features Config Loader
// ============================================================================
export class FeaturesConfigLoader {
    featuresPath;
    cachedConfig = null;
    cacheExpiry = 30000; // 30 seconds
    lastLoadTime = 0;
    constructor(featuresPath) {
        this.featuresPath = featuresPath || resolveConfigPath("features.json") || path.join(getConfigDir(), "features.json");
    }
    /**
     * Load features configuration
     */
    loadConfig() {
        const now = Date.now();
        // Return cached config if still valid
        if (this.cachedConfig && now - this.lastLoadTime < this.cacheExpiry) {
            return this.cachedConfig;
        }
        try {
            const configPath = path.resolve(process.cwd(), this.featuresPath);
            if (!fs.existsSync(configPath)) {
                return this.getDefaultConfig();
            }
            const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            const config = this.mergeWithDefaults(configData);
            this.cachedConfig = config;
            this.lastLoadTime = now;
            return config;
        }
        catch (error) {
            // Silent fallback to defaults on error - frameworkLogger not available here
            return this.getDefaultConfig();
        }
    }
    /**
     * Get model for a specific task type
     */
    getModelForTask(taskType) {
        const config = this.loadConfig();
        if (!config.model_routing?.enabled) {
            return config.model_routing?.default_model || "claude-sonnet-4";
        }
        const taskRouting = config.model_routing?.task_routing;
        const taskConfig = taskRouting
            ? taskRouting[taskType]
            : undefined;
        if (taskConfig) {
            return taskConfig.model;
        }
        return config.model_routing?.default_model || "claude-sonnet-4";
    }
    /**
     * Get max tokens for a specific task type
     */
    getMaxTokensForTask(taskType) {
        const config = this.loadConfig();
        const taskRouting = config.model_routing?.task_routing;
        const taskConfig = taskRouting
            ? taskRouting[taskType]
            : undefined;
        if (taskConfig) {
            return taskConfig.max_tokens;
        }
        return 4000; // Default
    }
    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(feature) {
        const config = this.loadConfig();
        const featureConfig = config[feature];
        if (typeof featureConfig === "object" &&
            featureConfig !== null &&
            "enabled" in featureConfig) {
            return featureConfig.enabled;
        }
        return false;
    }
    /**
     * Get token optimization settings
     */
    getTokenOptimization() {
        return this.loadConfig().token_optimization;
    }
    /**
     * Get batch operation settings
     */
    getBatchOperations() {
        return this.loadConfig().batch_operations;
    }
    /**
     * Get agent spawn settings
     */
    getAgentSpawn() {
        return this.loadConfig().agent_spawn;
    }
    /**
     * Get activity logging settings
     */
    getActivityLogging() {
        return this.loadConfig().activity_logging;
    }
    /**
     * Get performance monitoring alerting settings
     */
    getAlertingConfig() {
        return this.loadConfig().performance_monitoring?.alerting || {
            enabled: true,
            performance_degradation_threshold: 20,
            error_rate_threshold: 5,
            cost_threshold_daily: 10,
        };
    }
    /**
     * Check if alerting is enabled from config
     */
    isAlertingEnabled() {
        return this.loadConfig().performance_monitoring?.alerting?.enabled ?? true;
    }
    /**
     * Check if agent is disabled
     */
    isAgentDisabled(agentName) {
        const config = this.loadConfig();
        return config.agent_management.disabled_agents.includes(agentName);
    }
    /**
     * Get agent model assignment
     */
    getAgentModel(agentName) {
        const config = this.loadConfig();
        return (config.agent_management?.agent_models?.[agentName] ||
            config.model_routing?.default_model ||
            "claude-sonnet-4");
    }
    /**
     * Merge loaded config with defaults
     */
    mergeWithDefaults(configData) {
        const defaults = this.getDefaultConfig();
        return {
            ...defaults,
            ...configData,
            token_optimization: {
                ...defaults.token_optimization,
                ...configData.token_optimization,
                context_compression: {
                    ...defaults.token_optimization.context_compression,
                    ...configData.token_optimization?.context_compression,
                },
            },
            model_routing: {
                ...defaults.model_routing,
                ...configData.model_routing,
                task_routing: {
                    ...defaults.model_routing.task_routing,
                    ...configData.model_routing?.task_routing,
                },
            },
            batch_operations: {
                ...defaults.batch_operations,
                ...configData.batch_operations,
            },
            multi_agent_orchestration: {
                ...defaults.multi_agent_orchestration,
                ...configData.multi_agent_orchestration,
            },
            autonomous_reporting: {
                ...defaults.autonomous_reporting,
                ...configData.autonomous_reporting,
            },
            agent_management: {
                ...defaults.agent_management,
                ...configData.agent_management,
                performance_limits: {
                    ...defaults.agent_management.performance_limits,
                    ...configData.agent_management?.performance_limits,
                },
            },
            refactoring: {
                ...defaults.refactoring,
                ...configData.refactoring,
            },
            activity_logging: {
                ...defaults.activity_logging,
                ...configData.activity_logging,
            },
            security: {
                ...defaults.security,
                ...configData.security,
            },
            performance_monitoring: {
                ...defaults.performance_monitoring,
                ...configData.performance_monitoring,
                alerting: {
                    ...defaults.performance_monitoring.alerting,
                    ...configData.performance_monitoring?.alerting,
                },
            },
            caching: {
                ...defaults.caching,
                ...configData.caching,
            },
        };
    }
    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            version: "1.22.37",
            description: "0xRay Framework - Unified Feature Configuration",
            token_optimization: {
                enabled: true,
                max_context_tokens: 50000,
                prune_after_task: true,
                summarize_tool_outputs: true,
                context_compression: {
                    enabled: true,
                    threshold_tokens: 40000,
                    compression_ratio: 0.5,
                },
            },
            model_routing: {
                enabled: true,
                // Use OpenCode's default model for all tasks
                // Task-based model selection can be configured in opencode.json
            },
            batch_operations: {
                enabled: true,
                prefer_sed_for_replacements: true,
                parallel_file_updates: true,
                max_concurrent_edits: 10,
                auto_batch_threshold: 5,
            },
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
            agent_management: {
                disabled_agents: [],
                agent_models: {
                // Use default model from OpenCode configuration
                },
                performance_limits: {
                    max_task_duration_ms: 30000,
                    max_memory_usage_mb: 512,
                    max_tokens_per_request: 16000,
                },
            },
            refactoring: {
                enabled: true,
                automatic_detection: true,
                require_user_approval: false,
                max_complexity_threshold: 80,
                safe_mode: true,
                batch_mode: true,
            },
            activity_logging: {
                enabled: false, // Disabled by default to reduce verbose logging
                level: "warn", // Only log warnings and errors by default
                include_performance_metrics: false,
                include_agent_states: false,
                include_token_usage: true, // Keep token usage for debugging
                retention_days: 3, // Shorter retention
                log_to_file: false, // Don't log to file by default
                log_path: ".opencode/logs",
            },
            security: {
                enabled: true,
                prompt_sanitization: true,
                vulnerability_scanning: true,
                code_review_enforcement: true,
                security_score_threshold: 70,
            },
            performance_monitoring: {
                enabled: true,
                real_time_metrics: true,
                benchmark_tracking: true,
                token_tracking: true,
                cost_tracking: true,
                alerting: {
                    enabled: true,
                    performance_degradation_threshold: 20,
                    error_rate_threshold: 5,
                    cost_threshold_daily: 10.0,
                },
            },
            caching: {
                enabled: true,
                file_content_cache: true,
                search_result_cache: true,
                cache_ttl_seconds: 300,
                max_cache_size_mb: 50,
            },
        };
    }
    /**
     * Clear configuration cache
     */
    clearCache() {
        this.cachedConfig = null;
        this.lastLoadTime = 0;
    }
    /**
     * Save current configuration to file
     */
    saveConfig(config) {
        try {
            const configPath = path.resolve(process.cwd(), this.featuresPath);
            const currentConfig = this.loadConfig();
            const mergedConfig = this.mergeWithDefaults({
                ...currentConfig,
                ...config,
            });
            fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2));
            this.clearCache();
        }
        catch (error) {
            // Silent fail - frameworkLogger not available here
            throw error;
        }
    }
    /**
     * Enable a feature
     */
    enableFeature(feature) {
        const config = this.loadConfig();
        const featureConfig = config[feature];
        if (typeof featureConfig === "object" &&
            featureConfig !== null &&
            "enabled" in featureConfig) {
            featureConfig.enabled = true;
            this.saveConfig({
                [feature]: featureConfig,
            });
        }
    }
    /**
     * Disable a feature
     */
    disableFeature(feature) {
        const config = this.loadConfig();
        const featureConfig = config[feature];
        if (typeof featureConfig === "object" &&
            featureConfig !== null &&
            "enabled" in featureConfig) {
            featureConfig.enabled = false;
            this.saveConfig({
                [feature]: featureConfig,
            });
        }
    }
}
// Export singleton instance
export const featuresConfigLoader = new FeaturesConfigLoader();
// Export convenience functions
export const getModelForTask = (taskType) => featuresConfigLoader.getModelForTask(taskType);
export const isFeatureEnabled = (feature) => featuresConfigLoader.isFeatureEnabled(feature);
export const getTokenOptimization = () => featuresConfigLoader.getTokenOptimization();
export const getBatchOperations = () => featuresConfigLoader.getBatchOperations();
export const getAgentSpawn = () => featuresConfigLoader.getAgentSpawn();
//# sourceMappingURL=features-config.js.map