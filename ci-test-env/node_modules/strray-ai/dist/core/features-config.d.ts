/**
 * Features Configuration Loader
 *
 * Loads and validates the unified features configuration from features.json
 * Supports token optimization, model routing, batch operations, and more.
 *
 * @version 1.0.0
 * @since 2026-01-25
 */
export interface TokenOptimizationConfig {
    enabled: boolean;
    max_context_tokens: number;
    prune_after_task: boolean;
    summarize_tool_outputs: boolean;
    context_compression: {
        enabled: boolean;
        threshold_tokens: number;
        compression_ratio: number;
    };
}
export interface TaskRouting {
    model: string;
    max_tokens: number;
    description: string;
}
export interface ModelRoutingConfig {
    enabled: boolean;
    default_model?: string;
    fallback_model?: string;
    task_routing?: {
        file_read?: TaskRouting;
        grep_search?: TaskRouting;
        simple_edit?: TaskRouting;
        bulk_refactor?: TaskRouting;
        architecture_review?: TaskRouting;
        security_audit?: TaskRouting;
        git_operations?: TaskRouting;
        documentation?: TaskRouting;
        code_generation?: TaskRouting;
        debugging?: TaskRouting;
    };
}
export interface BatchOperationsConfig {
    enabled: boolean;
    prefer_sed_for_replacements: boolean;
    parallel_file_updates: boolean;
    max_concurrent_edits: number;
    auto_batch_threshold: number;
}
export interface MultiAgentOrchestrationConfig {
    enabled: boolean;
    coordination_model: "async-multi-agent" | "sync-multi-agent";
    max_concurrent_agents: number;
    task_distribution_strategy: "capability-based" | "load-balanced" | "round-robin";
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
    notification_channels: string[];
}
export interface AgentManagementConfig {
    disabled_agents: string[];
    agent_models: Record<string, string>;
    performance_limits: {
        max_task_duration_ms: number;
        max_memory_usage_mb: number;
        max_tokens_per_request: number;
    };
}
export interface RefactoringConfig {
    enabled: boolean;
    automatic_detection: boolean;
    require_user_approval: boolean;
    max_complexity_threshold: number;
    safe_mode: boolean;
    batch_mode: boolean;
}
export interface ActivityLoggingConfig {
    enabled: boolean;
    level: "debug" | "info" | "warn" | "error";
    include_performance_metrics: boolean;
    include_agent_states: boolean;
    include_token_usage: boolean;
    retention_days: number;
    log_to_file: boolean;
    log_path: string;
}
export interface SecurityConfig {
    enabled: boolean;
    prompt_sanitization: boolean;
    vulnerability_scanning: boolean;
    code_review_enforcement: boolean;
    security_score_threshold: number;
}
export interface PerformanceMonitoringConfig {
    enabled: boolean;
    real_time_metrics: boolean;
    benchmark_tracking: boolean;
    token_tracking: boolean;
    cost_tracking: boolean;
    alerting: {
        enabled: boolean;
        performance_degradation_threshold: number;
        error_rate_threshold: number;
        cost_threshold_daily: number;
    };
}
export interface CachingConfig {
    enabled: boolean;
    file_content_cache: boolean;
    search_result_cache: boolean;
    cache_ttl_seconds: number;
    max_cache_size_mb: number;
}
export interface PublishConfig {
    enabled: boolean;
    require_documentation: {
        enabled: boolean;
        required_files: string[];
        readme_version_sync: boolean;
    };
    require_reflection: {
        enabled: boolean;
        max_age_days: number;
        auto_create_on_publish: boolean;
    };
    require_pipeline_tests: {
        enabled: boolean;
        min_pipeline_tests: number;
    };
}
export interface CommitCycleConfig {
    enabled: boolean;
    auto_commit: {
        enabled: boolean;
        force_commit_after_minutes: number;
        min_changes_to_commit: number;
    };
    require_reflection: {
        enabled: boolean;
        max_commits_since_reflection: number;
        auto_remind: boolean;
    };
    validation: {
        block_on_lint_errors: boolean;
        block_on_test_failures: boolean;
        auto_fix_on_commit: boolean;
    };
}
export interface ReflectionConfig {
    enabled: boolean;
    auto_generate: boolean;
    include_patterns: string[];
    min_quality_score: number;
    store_inference_data: boolean;
}
export interface AutoReflectionConfig {
    mode: "full" | "minimal" | "off";
    description: string;
    triggers: {
        ci_failure: {
            enabled: boolean;
            auto_generate_stub: boolean;
        };
        commit_threshold: {
            enabled: boolean;
            threshold: number;
            auto_generate_stub: boolean;
        };
        time_threshold: {
            enabled: boolean;
            days: number;
            auto_generate_stub: boolean;
        };
        test_failure: {
            enabled: boolean;
            auto_generate_stub: boolean;
        };
        deployment: {
            enabled: boolean;
            auto_generate_stub: boolean;
        };
    };
    thresholds: {
        full: {
            commit_threshold: number;
            days_threshold: number;
            auto_generate: boolean;
            auto_commit: boolean;
            prompt_user: boolean;
        };
        minimal: {
            commit_threshold: number;
            days_threshold: number;
            auto_generate: boolean;
            auto_commit: boolean;
            prompt_user: boolean;
        };
        off: {
            commit_threshold: number;
            days_threshold: number;
            auto_generate: boolean;
            auto_commit: boolean;
            prompt_user: boolean;
        };
    };
}
export interface InferenceConfig {
    description: string;
    enabled: boolean;
    workflow_dir: string;
    reports_dir: string;
    pattern_matching: {
        enabled: boolean;
        confidence_threshold: number;
    };
}
export interface KernelConfig {
    description: string;
    enabled: boolean;
    pattern_learning: {
        enabled: boolean;
        learning_interval_ms: number;
        auto_apply_threshold: number;
        min_success_rate: number;
    };
    confidence: {
        default_threshold: number;
        routing_adjustment: number;
    };
}
export interface ProcessorsConfig {
    description: string;
    enabled: boolean;
    pre_processors: {
        enabled: boolean;
        priority_order: string[];
    };
    post_processors: {
        enabled: boolean;
        priority_order: string[];
    };
}
export interface EnforcementConfig {
    description: string;
    enabled: boolean;
    auto_fix: {
        enabled: boolean;
        require_approval: boolean;
    };
    codex_validation: {
        enabled: boolean;
        strict_mode: boolean;
    };
}
export interface AgentSpawnConfig {
    enabled: boolean;
    max_concurrent: number;
    max_per_type: number;
    spawn_cooldown_ms: number;
    rate_limit_per_minute: number;
}
export interface DelegationConfig {
    enabled: boolean;
    confidence_threshold: number;
    enable_intelligent_routing: boolean;
}
export interface ComplexityThresholds {
    simple: number;
    moderate: number;
    complex: number;
    enterprise: number;
}
export interface AnalyticsConfig {
    enabled: boolean;
    default_limit: number;
    min_samples_for_calibration: number;
    track_complexity_accuracy: boolean;
    track_agent_performance: boolean;
}
export interface PatternLearningConfig {
    enabled: boolean;
    learning_interval_ms: number;
    auto_apply_threshold: number;
    min_success_rate: number;
}
export interface StoryTypeConfig {
    location: string;
    min_words: number;
    ideal_words: number;
    framework: string;
}
export interface StorytellingTriggerConfig {
    enabled: boolean;
    threshold?: number;
    story_type: string;
    remind_user?: boolean;
    file_count_threshold?: number;
    duration_minutes_threshold?: number;
    require_saga?: boolean;
    block_without_story?: boolean;
}
export interface StorytellingQualityRequirements {
    require_frontmatter: boolean;
    require_key_takeaways: boolean;
    require_what_next: boolean;
    fact_check_before_publish: boolean;
    peer_review_agent: string;
}
export interface StorytellingConfig {
    enabled: boolean;
    reflection_triggers: {
        commit_count: StorytellingTriggerConfig;
        publish: StorytellingTriggerConfig;
        complex_changes: StorytellingTriggerConfig;
        session_duration: StorytellingTriggerConfig;
    };
    story_types: {
        reflection: StoryTypeConfig;
        saga: StoryTypeConfig;
        journey: StoryTypeConfig;
        narrative: StoryTypeConfig;
    };
    quality_requirements: StorytellingQualityRequirements;
}
export interface FeaturesConfig {
    version: string;
    description: string;
    token_optimization: TokenOptimizationConfig;
    model_routing: ModelRoutingConfig;
    batch_operations: BatchOperationsConfig;
    multi_agent_orchestration: MultiAgentOrchestrationConfig;
    autonomous_reporting: AutonomousReportingConfig;
    agent_management: AgentManagementConfig;
    refactoring: RefactoringConfig;
    activity_logging: ActivityLoggingConfig;
    security: SecurityConfig;
    performance_monitoring: PerformanceMonitoringConfig;
    caching: CachingConfig;
    agent_spawn?: AgentSpawnConfig;
    delegation?: DelegationConfig;
    complexity_thresholds?: ComplexityThresholds;
    analytics?: AnalyticsConfig;
    pattern_learning?: PatternLearningConfig;
    publish?: PublishConfig;
    commit_cycle?: CommitCycleConfig;
    reflection?: ReflectionConfig;
    storytelling?: StorytellingConfig;
    auto_reflection?: AutoReflectionConfig;
    inference?: InferenceConfig;
    kernel?: KernelConfig;
    processors?: ProcessorsConfig;
    enforcement?: EnforcementConfig;
}
export type TaskType = "file_read" | "grep_search" | "simple_edit" | "bulk_refactor" | "architecture_review" | "security_audit" | "git_operations" | "documentation" | "code_generation" | "debugging" | "unknown";
/**
 * Detect task type from tool name and context
 */
export declare function detectTaskType(toolName: string, context?: {
    fileCount?: number;
    isComplex?: boolean;
}): TaskType;
export declare class FeaturesConfigLoader {
    private featuresPath;
    private cachedConfig;
    private cacheExpiry;
    private lastLoadTime;
    constructor(featuresPath?: string);
    /**
     * Load features configuration
     */
    loadConfig(): FeaturesConfig;
    /**
     * Get model for a specific task type
     */
    getModelForTask(taskType: TaskType): string;
    /**
     * Get max tokens for a specific task type
     */
    getMaxTokensForTask(taskType: TaskType): number;
    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(feature: keyof FeaturesConfig): boolean;
    /**
     * Get token optimization settings
     */
    getTokenOptimization(): TokenOptimizationConfig;
    /**
     * Get batch operation settings
     */
    getBatchOperations(): BatchOperationsConfig;
    /**
     * Get agent spawn settings
     */
    getAgentSpawn(): AgentSpawnConfig | undefined;
    /**
     * Get activity logging settings
     */
    getActivityLogging(): ActivityLoggingConfig;
    /**
     * Get performance monitoring alerting settings
     */
    getAlertingConfig(): {
        enabled: boolean;
        performance_degradation_threshold: number;
        error_rate_threshold: number;
        cost_threshold_daily: number;
    };
    /**
     * Check if alerting is enabled from config
     */
    isAlertingEnabled(): boolean;
    /**
     * Check if agent is disabled
     */
    isAgentDisabled(agentName: string): boolean;
    /**
     * Get agent model assignment
     */
    getAgentModel(agentName: string): string;
    /**
     * Merge loaded config with defaults
     */
    private mergeWithDefaults;
    /**
     * Get default configuration
     */
    private getDefaultConfig;
    /**
     * Clear configuration cache
     */
    clearCache(): void;
    /**
     * Save current configuration to file
     */
    saveConfig(config: Partial<FeaturesConfig>): void;
    /**
     * Enable a feature
     */
    enableFeature(feature: keyof FeaturesConfig): void;
    /**
     * Disable a feature
     */
    disableFeature(feature: keyof FeaturesConfig): void;
}
export declare const featuresConfigLoader: FeaturesConfigLoader;
export declare const getModelForTask: (taskType: TaskType) => string;
export declare const isFeatureEnabled: (feature: keyof FeaturesConfig) => boolean;
export declare const getTokenOptimization: () => TokenOptimizationConfig;
export declare const getBatchOperations: () => BatchOperationsConfig;
export declare const getAgentSpawn: () => AgentSpawnConfig | undefined;
//# sourceMappingURL=features-config.d.ts.map