/**
 * Test Auto-Generation Monitor
 *
 * Tracks and reports on test auto-generation activity.
 * Provides metrics on test creation success/failure rates.
 *
 * @since 2026-02-22
 */
export interface TestGenerationMetrics {
    totalFilesProcessed: number;
    testsGenerated: number;
    testsSkipped: number;
    testsFailed: number;
    startTime: number;
    lastGenerationTime: number | null;
}
export interface TestGenerationEvent {
    type: "generated" | "skipped" | "failed";
    filePath: string;
    testFile: string | null;
    timestamp: number;
    reason?: string;
}
declare class TestAutoGenerationMonitor {
    private metrics;
    private events;
    private maxEvents;
    private metricsFile;
    constructor(metricsDir?: string);
    /**
     * Load metrics from disk if they exist
     */
    private loadMetrics;
    /**
     * Save metrics to disk
     */
    private saveMetrics;
    /**
     * Record a test generation event
     */
    recordEvent(event: TestGenerationEvent): void;
    /**
     * Get current metrics
     */
    getMetrics(): TestGenerationMetrics;
    /**
     * Get recent events
     */
    getRecentEvents(count?: number): TestGenerationEvent[];
    /**
     * Get success rate as percentage
     */
    getSuccessRate(): number;
    /**
     * Generate a status report
     */
    generateReport(): string;
    /**
     * Reset metrics (for testing)
     */
    reset(): void;
}
export declare const testAutoGenerationMonitor: TestAutoGenerationMonitor;
export {};
//# sourceMappingURL=test-auto-generation-monitor.d.ts.map