/**
 * Dashboard CLI Command
 *
 * Real-time monitoring dashboard for 0xRay orchestration metrics.
 * Displays:
 * - Real-time agent orchestration metrics
 * - Delegation analytics
 * - Voting outcomes
 * - Historical trends
 * - Anomaly alerts
 *
 * Usage: npx strray-ai dashboard
 *
 * @version 1.0.0
 * @since 2026-04-17
 */
interface DashboardOptions {
    refreshInterval: number;
    theme: "dark" | "light";
    showTrends: boolean;
    showAlerts: boolean;
    watch: boolean;
}
export declare function dashboardCommand(args?: Partial<DashboardOptions>): Promise<void>;
export default dashboardCommand;
//# sourceMappingURL=dashboard.d.ts.map