/**
 * Test Auto-Generation Monitor
 *
 * Tracks and reports on test auto-generation activity.
 * Provides metrics on test creation success/failure rates.
 *
 * @since 2026-02-22
 */
import * as fs from "fs";
import * as path from "path";
import { frameworkLogger } from "../core/framework-logger.js";
class TestAutoGenerationMonitor {
    metrics = {
        totalFilesProcessed: 0,
        testsGenerated: 0,
        testsSkipped: 0,
        testsFailed: 0,
        startTime: Date.now(),
        lastGenerationTime: null,
    };
    events = [];
    maxEvents = 1000;
    metricsFile;
    constructor(metricsDir = "./logs") {
        // Ensure metrics directory exists
        if (!fs.existsSync(metricsDir)) {
            fs.mkdirSync(metricsDir, { recursive: true });
        }
        this.metricsFile = path.join(metricsDir, "test-auto-generation-metrics.json");
        this.loadMetrics();
    }
    /**
     * Load metrics from disk if they exist
     */
    loadMetrics() {
        try {
            if (fs.existsSync(this.metricsFile)) {
                const data = fs.readFileSync(this.metricsFile, "utf8");
                const loaded = JSON.parse(data);
                this.metrics = { ...this.metrics, ...loaded };
                // Silent load - no console output during tests
            }
        }
        catch (error) {
            // Silent fail - no console output during tests
        }
    }
    /**
     * Save metrics to disk
     */
    saveMetrics() {
        try {
            fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
        }
        catch (error) {
            // Silent fail - no console output during tests
        }
    }
    /**
     * Record a test generation event
     */
    recordEvent(event) {
        this.events.push(event);
        // Keep only last maxEvents
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }
        // Update metrics based on event type
        this.metrics.totalFilesProcessed++;
        switch (event.type) {
            case "generated":
                this.metrics.testsGenerated++;
                this.metrics.lastGenerationTime = event.timestamp;
                break;
            case "skipped":
                this.metrics.testsSkipped++;
                break;
            case "failed":
                this.metrics.testsFailed++;
                break;
        }
        this.saveMetrics();
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get recent events
     */
    getRecentEvents(count = 10) {
        return this.events.slice(-count);
    }
    /**
     * Get success rate as percentage
     */
    getSuccessRate() {
        if (this.metrics.totalFilesProcessed === 0)
            return 0;
        return ((this.metrics.testsGenerated / this.metrics.totalFilesProcessed) * 100);
    }
    /**
     * Generate a status report
     */
    generateReport() {
        const { metrics } = this;
        const successRate = this.getSuccessRate().toFixed(1);
        const uptime = ((Date.now() - metrics.startTime) / 1000 / 60).toFixed(1); // minutes
        return `
╔══════════════════════════════════════════════════════════════╗
║        TEST AUTO-GENERATION MONITOR REPORT                  ║
╠══════════════════════════════════════════════════════════════╣
║  Uptime: ${uptime} minutes                                      ║
║                                                              ║
║  📊 METRICS                                                 ║
║  ─────────────────────────────────────────────────────────  ║
║  Files Processed:  ${metrics.totalFilesProcessed.toString().padEnd(35)}║
║  Tests Generated: ${metrics.testsGenerated.toString().padEnd(35)}║
║  Tests Skipped:  ${metrics.testsSkipped.toString().padEnd(35)}║
║  Tests Failed:   ${metrics.testsFailed.toString().padEnd(35)}║
║                                                              ║
║  ✅ Success Rate: ${successRate}%                                ║
║                                                              ║
║  🕐 Last Generation: ${metrics.lastGenerationTime
            ? new Date(metrics.lastGenerationTime).toLocaleString()
            : "Never".padEnd(33)}║
╚══════════════════════════════════════════════════════════════╝
`;
    }
    /**
     * Reset metrics (for testing)
     */
    reset() {
        this.metrics = {
            totalFilesProcessed: 0,
            testsGenerated: 0,
            testsSkipped: 0,
            testsFailed: 0,
            startTime: Date.now(),
            lastGenerationTime: null,
        };
        this.events = [];
        this.saveMetrics();
        // Silent reset - no console output during tests
    }
}
// Singleton instance
export const testAutoGenerationMonitor = new TestAutoGenerationMonitor();
// CLI interface
if (process.argv[1] &&
    process.argv[1].includes("test-auto-generation-monitor")) {
    frameworkLogger.log("test-auto-generation-monitor", "cli-report", "info", {
        message: testAutoGenerationMonitor.generateReport(),
    });
}
//# sourceMappingURL=test-auto-generation-monitor.js.map