import { EventEmitter } from "events";
import * as fs from "fs";
import { featuresConfigLoader } from "../core/features-config.js";
/**
 * Memory Monitor - Comprehensive memory tracking and leak detection
 * Integrates with framework logging system
 * Uses alerting config from features.json for thresholds
 */
const defaultAlertingConfig = {
    enabled: true,
    performance_degradation_threshold: 20,
    error_rate_threshold: 5,
    cost_threshold_daily: 10,
};
// Get alerting config from features.json
let alertingConfig = defaultAlertingConfig;
try {
    alertingConfig = featuresConfigLoader.getAlertingConfig();
}
catch (e) {
    // Use defaults if config not available
}
export class MemoryMonitor extends EventEmitter {
    config;
    monitoringInterval = null;
    statsHistory = [];
    maxHistorySize = 1000;
    leakDetectionEnabled = true;
    lastLeakCheck = Date.now();
    leakCheckInterval = 60 * 1000; // CRITICAL FIX: Check every minute instead of 5 minutes
    listenersInitialized = false;
    constructor(config = {}) {
        super();
        // Increase max listeners to prevent warnings in test environments
        this.setMaxListeners(50);
        this.config = {
            checkInterval: 30000,
            alertThresholds: {
                warning: 50, // CRITICAL FIX: Lower warning threshold to 50MB
                critical: 100, // CRITICAL FIX: Lower critical threshold to 100MB
                leakDetection: {
                    growthRate: 5, // CRITICAL FIX: Lower leak detection threshold to 5MB/min
                    sustainedPeriod: 2, // CRITICAL FIX: Shorter sustained period (2 minutes)
                },
            },
            enableFrameworkLogging: true,
            sessionTracking: true,
            ...config,
        };
    }
    /**
     * Start memory monitoring
     */
    start() {
        this.log("🔍 Starting Memory Monitor...");
        this.monitoringInterval = setInterval(() => {
            this.checkMemory();
        }, this.config.checkInterval);
        this.checkMemory();
    }
    /**
     * Stop memory monitoring
     */
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        this.monitoringInterval = null;
        this.log("🛑 Memory Monitor stopped");
    }
    /**
     * Get current memory statistics
     */
    getCurrentStats() {
        const memUsage = process.memoryUsage();
        return {
            heapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
            heapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
            external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100,
            rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
            timestamp: Date.now(),
        };
    }
    /**
     * Check memory usage and detect issues
     */
    checkMemory() {
        const stats = this.getCurrentStats();
        this.statsHistory.push(stats);
        if (this.statsHistory.length > this.maxHistorySize) {
            this.statsHistory.shift();
        }
        this.checkThresholds(stats);
        if (this.leakDetectionEnabled &&
            Date.now() - this.lastLeakCheck > this.leakCheckInterval) {
            this.detectMemoryLeaks();
            this.lastLeakCheck = Date.now();
        }
        if (this.config.enableFrameworkLogging) {
            this.logFrameworkMemory(stats);
        }
    }
    /**
     * Check memory usage against thresholds
     */
    checkThresholds(stats) {
        const heapMB = stats.heapUsed;
        if (heapMB >= this.config.alertThresholds.critical) {
            this.emitAlert({
                type: "high_usage",
                severity: "critical",
                message: `Critical memory usage: ${heapMB.toFixed(2)}MB (threshold: ${this.config.alertThresholds.critical}MB)`,
                details: {
                    currentUsage: heapMB,
                    threshold: this.config.alertThresholds.critical,
                    trend: this.calculateTrend(),
                    recommendations: [
                        "Force garbage collection if available",
                        "Check for memory leaks in caches and event listeners",
                        "Consider reducing concurrent operations",
                        "Monitor large data structures (Maps, Sets, Arrays)",
                    ],
                },
            });
        }
        else if (heapMB >= this.config.alertThresholds.warning) {
            this.emitAlert({
                type: "high_usage",
                severity: "high",
                message: `High memory usage: ${heapMB.toFixed(2)}MB (threshold: ${this.config.alertThresholds.warning}MB)`,
                details: {
                    currentUsage: heapMB,
                    threshold: this.config.alertThresholds.warning,
                    trend: this.calculateTrend(),
                    recommendations: [
                        "Monitor memory growth rate",
                        "Check for inefficient algorithms",
                        "Consider memory optimization techniques",
                    ],
                },
            });
        }
    }
    /**
     * Detect potential memory leaks
     */
    detectMemoryLeaks() {
        if (this.statsHistory.length < 10)
            return;
        const recentStats = this.statsHistory.slice(-20);
        if (recentStats.length < 2)
            return;
        const timeSpan = recentStats[recentStats.length - 1].timestamp -
            recentStats[0].timestamp;
        const timeSpanMinutes = timeSpan / (1000 * 60);
        if (timeSpanMinutes < 1)
            return;
        const startUsage = recentStats[0].heapUsed;
        const endUsage = recentStats[recentStats.length - 1].heapUsed;
        const growthRate = (endUsage - startUsage) / timeSpanMinutes;
        if (growthRate > this.config.alertThresholds.leakDetection.growthRate) {
            const sustainedPeriod = this.config.alertThresholds.leakDetection.sustainedPeriod;
            if (timeSpanMinutes >= sustainedPeriod) {
                this.emitAlert({
                    type: "leak_detected",
                    severity: growthRate > 50 ? "critical" : "high", // CRITICAL FIX: More aggressive alerting
                    message: `Potential memory leak detected: ${growthRate.toFixed(2)}MB/min growth rate over ${timeSpanMinutes.toFixed(1)} minutes`,
                    details: {
                        currentUsage: endUsage,
                        threshold: this.config.alertThresholds.leakDetection.growthRate,
                        trend: "increasing",
                        recommendations: [
                            "Check for uncleansed event listeners",
                            "Review timer/interval cleanup",
                            "Inspect cache growth in Map/Set structures",
                            "Monitor object retention in closures",
                            "Consider memory profiling tools",
                        ],
                    },
                });
            }
        }
    }
    /**
     * Calculate memory usage trend
     */
    calculateTrend() {
        if (this.statsHistory.length < 5)
            return "stable";
        const recent = this.statsHistory.slice(-5);
        const older = this.statsHistory.slice(-10, -5);
        const recentAvg = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + s.heapUsed, 0) / older.length;
        const diff = recentAvg - olderAvg;
        const threshold = 5;
        if (diff > threshold)
            return "increasing";
        if (diff < -threshold)
            return "decreasing";
        return "stable";
    }
    /**
     * Emit memory alert
     */
    emitAlert(alert) {
        this.emit("alert", alert);
        const severityEmoji = {
            low: "ℹ️",
            medium: "⚠️",
            high: "🔴",
            critical: "🚨",
        };
        this.log(`${severityEmoji[alert.severity]} MEMORY ALERT: ${alert.message}`);
        alert.details.recommendations.forEach((rec) => {
            this.log(`  💡 ${rec}`);
        });
    }
    /**
     * Log memory stats to framework log
     */
    logFrameworkMemory(stats) {
        const logEntry = `🧠 Memory: ${stats.heapUsed.toFixed(1)}MB heap, ${stats.heapTotal.toFixed(1)}MB total, ${stats.external.toFixed(1)}MB external, ${stats.rss.toFixed(1)}MB RSS`;
        this.log(logEntry);
    }
    /**
     * Get memory usage history
     */
    getHistory(hours = 1) {
        const cutoff = Date.now() - hours * 60 * 60 * 1000;
        return this.statsHistory.filter((stat) => stat.timestamp >= cutoff);
    }
    /**
     * Get memory usage summary
     */
    getSummary() {
        const current = this.getCurrentStats();
        const peak = this.statsHistory.reduce((max, stat) => (stat.heapUsed > max.heapUsed ? stat : max), this.statsHistory[0] || current);
        const average = this.statsHistory.length > 0
            ? this.statsHistory.reduce((sum, stat) => sum + stat.heapUsed, 0) /
                this.statsHistory.length
            : current.heapUsed;
        return {
            current,
            peak,
            average: Math.round(average * 100) / 100,
            trend: this.calculateTrend(),
        };
    }
    /**
     * Force garbage collection (if available)
     */
    forceGC() {
        if (global.gc) {
            const before = this.getCurrentStats().heapUsed;
            global.gc();
            const after = this.getCurrentStats().heapUsed;
            const freed = before - after;
            this.log(`🗑️ GC: Freed ${freed.toFixed(2)}MB (${before.toFixed(2)}MB → ${after.toFixed(2)}MB)`);
            return true;
        }
        return false;
    }
    /**
     * Internal logging method - writes to framework log only
     */
    log(message) {
        try {
            const logDir = "./logs/monitoring";
            const logFile = `${logDir}/memory-monitor-${new Date().toISOString().split("T")[0]}.log`;
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const logEntry = `[${new Date().toISOString()}] ${message}\n`;
            fs.appendFileSync(logFile, logEntry);
        }
        catch (error) {
            // Silent fail - don't spam console with logging errors
        }
    }
    /**
     * Safely add an alert listener, preventing duplicates
     */
    addAlertListener(callback) {
        // Check if this exact callback already exists
        const existingListeners = this.listeners("alert");
        const alreadyAdded = existingListeners.some((listener) => listener === callback);
        if (!alreadyAdded) {
            this.on("alert", callback);
        }
    }
}
// Export singleton instance
export const memoryMonitor = new MemoryMonitor();
// Helper functions
export function getMemoryUsage() {
    return memoryMonitor.getCurrentStats();
}
export function logMemoryUsage() {
    // Memory usage logging - return current stats
    return memoryMonitor.getCurrentStats();
}
export function checkMemoryHealth() {
    const summary = memoryMonitor.getSummary();
    const issues = [];
    if (summary.current.heapUsed > 300) {
        issues.push(`High heap usage: ${summary.current.heapUsed}MB`);
    }
    if (summary.trend === "increasing") {
        issues.push("Memory usage trending upward");
    }
    return {
        healthy: issues.length === 0,
        issues,
    };
}
//# sourceMappingURL=memory-monitor.js.map