/**
 * Status CLI Command
 *
 * Shows comprehensive framework status including:
 * - OpenCode installation status
 * - Installed skills
 * - Configured agents
 * - Health metrics
 * - Inference engine status
 *
 * Usage: npx strray-ai status
 */
interface StatusReport {
    opencode: {
        installed: boolean;
        configFound: boolean;
    };
    skills: {
        count: number;
        names: string[];
    };
    agents: {
        count: number;
        names: string[];
    };
    health: {
        logPath: string;
        logExists: boolean;
        recentEntries: number;
    };
    inference: {
        active: boolean;
        lastTuning: string | null;
        outcomesCount: number;
        patternsCount: number;
    };
}
export declare function getStatusReport(cwd?: string): StatusReport;
export declare function printStatus(report: StatusReport): void;
export declare function statusCommand(): Promise<void>;
export default statusCommand;
//# sourceMappingURL=status.d.ts.map