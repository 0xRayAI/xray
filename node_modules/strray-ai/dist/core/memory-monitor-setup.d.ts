/**
 * Memory Monitor Setup
 *
 * Memory monitoring configuration and setup utilities.
 * This module handles memory monitor initialization and alert handling.
 *
 * @version 1.0.0
 * @since 2026-01-07
 */
import { StringRayStateManager } from "../state/state-manager.js";
export interface MemoryMonitorSetupOptions {
    stateManager: StringRayStateManager;
    memoryMonitorListener: ((alert: any) => void) | undefined;
}
export declare function setupMemoryMonitoring(options: MemoryMonitorSetupOptions): void;
export declare function getMemoryHealthSummary(): {
    healthy: boolean;
    issues: string[];
    metrics: {
        current: any;
        peak: any;
        average: number;
        trend: string;
    };
};
//# sourceMappingURL=memory-monitor-setup.d.ts.map