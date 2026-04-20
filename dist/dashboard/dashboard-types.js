/**
 * Dashboard Type Definitions
 *
 * Comprehensive types for the 0xRay monitoring dashboard including:
 * - Real-time orchestration metrics
 * - Agent delegation analytics
 * - Voting outcomes
 * - Historical trends
 * - Anomaly alerts
 *
 * @version 1.0.0
 * @since 2026-04-17
 */
export const DEFAULT_DASHBOARD_CONFIG = {
    refreshInterval: 5000,
    historyRetention: 24 * 60 * 60 * 1000,
    anomalyDetection: {
        enabled: true,
        sensitivity: "medium",
        thresholds: {
            successRateMin: 0.8,
            errorRateMax: 0.2,
            avgDurationMax: 60000,
            concurrentAgentsMax: 10,
            delegationDepthMax: 5,
            votingConfidenceMin: 0.6,
        },
    },
    theme: "dark",
    layout: "expanded",
    metricsToTrack: ["agents", "complexity", "delegation", "voting", "trends"],
    alertChannels: ["console"],
};
//# sourceMappingURL=dashboard-types.js.map