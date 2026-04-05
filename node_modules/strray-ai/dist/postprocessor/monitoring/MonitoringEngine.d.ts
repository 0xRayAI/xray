/**
 * Post-Processor Monitoring Engine
 */
import { StringRayStateManager } from "../../state/state-manager.js";
import { SessionMonitor } from "../../session/session-monitor.js";
import { MonitoringResult } from "../types.js";
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
    getStatus(): Promise<any>;
}
//# sourceMappingURL=MonitoringEngine.d.ts.map