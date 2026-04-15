/**
 * Post-Processor Monitoring Engine
 */
import { StringRayStateManager } from "../../state/state-manager.js";
import { SessionMonitor } from "../../session/session-monitor.js";
import { MonitoringResult } from "../types.js";
export interface CIStatus {
    status: "success" | "failure" | "running";
    failedJobs: string[];
    totalJobs: number;
    duration: number;
}
export interface PerformanceStatus {
    status: "passed" | "failed" | "warning";
    score: number;
    regressions: string[];
    duration: number;
}
export interface SecurityStatus {
    status: "passed" | "failed" | "warning";
    vulnerabilities: number;
    criticalVulnerabilities: number;
    scanDuration: number;
}
export declare class PostProcessorMonitoringEngine {
    private stateManager;
    private sessionMonitor?;
    constructor(stateManager: StringRayStateManager, sessionMonitor?: SessionMonitor | undefined);
    initialize(): Promise<void>;
    monitorDeployment(commitSha: string): Promise<MonitoringResult>;
    private checkCIStatus;
    private checkPerformanceStatus;
    private checkSecurityStatus;
    private determineOverallStatus;
    getStatus(): Promise<{
        monitoringEnabled: boolean;
        activeSessions: number;
        lastCheck: Date;
    }>;
}
//# sourceMappingURL=MonitoringEngine.d.ts.map