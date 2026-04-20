/**
 * Dashboard Renderer
 *
 * Terminal-based dashboard renderer for displaying:
 * - Real-time metrics
 * - Delegation analytics
 * - Voting outcomes
 * - Historical trends
 * - Alerts
 *
 * @version 1.0.0
 * @since 2026-04-17
 */
import { DashboardState } from "./dashboard-types.js";
interface RenderOptions {
    theme: "dark" | "light";
    width: number;
    height: number;
    showTrends: boolean;
    showAlerts: boolean;
}
export declare class DashboardRenderer {
    private options;
    private colors;
    constructor(options?: Partial<RenderOptions>);
    clear(): void;
    render(state: DashboardState): void;
    private renderHeader;
    private renderMetrics;
    private renderDelegationAnalytics;
    private renderVotingAnalytics;
    private renderTrends;
    private renderAlerts;
    private renderFooter;
    private renderSparkline;
    private formatDuration;
    setOptions(options: Partial<RenderOptions>): void;
    getOptions(): RenderOptions;
}
export declare const createDashboardRenderer: (options?: Partial<RenderOptions>) => DashboardRenderer;
export {};
//# sourceMappingURL=dashboard-renderer.d.ts.map