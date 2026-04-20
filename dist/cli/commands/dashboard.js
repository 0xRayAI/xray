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
import * as readline from "readline";
import { createMetricsCollector } from "../dashboard/metrics-collector.js";
import { createDashboardRenderer } from "../dashboard/dashboard-renderer.js";
import { frameworkLogger } from "../core/framework-logger.js";
const DEFAULT_OPTIONS = {
    refreshInterval: 5000,
    theme: "dark",
    showTrends: true,
    showAlerts: true,
    watch: true,
};
export async function dashboardCommand(args = {}) {
    const options = { ...DEFAULT_OPTIONS, ...args };
    const cwd = process.cwd();
    const collector = createMetricsCollector(cwd);
    const renderer = createDashboardRenderer({
        theme: options.theme,
        showTrends: options.showTrends,
        showAlerts: options.showAlerts,
    });
    let running = true;
    let currentState = null;
    frameworkLogger.log("dashboard", "started", "info", { cwd, options });
    console.log("\x1b[36m\x1b[1mStarting 0xRay Orchestration Dashboard...\x1b[0m\n");
    const collectAndRender = async () => {
        try {
            currentState = await collector.collectMetrics();
            renderer.render(currentState);
        }
        catch (error) {
            console.error(`\x1b[31mError collecting metrics: ${error instanceof Error ? error.message : String(error)}\x1b[0m`);
        }
    };
    await collectAndRender();
    if (options.watch) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        let refreshTimer = null;
        const startRefreshTimer = () => {
            if (refreshTimer)
                clearInterval(refreshTimer);
            refreshTimer = setInterval(async () => {
                if (running)
                    await collectAndRender();
            }, options.refreshInterval);
        };
        startRefreshTimer();
        const handleKeypress = async (str, key) => {
            if (key.ctrl && key.name === "c") {
                running = false;
                console.log("\n\n\x1b[33mShutting down dashboard...\x1b[0m");
                if (refreshTimer)
                    clearInterval(refreshTimer);
                rl.close();
                process.exit(0);
                return;
            }
            const keyName = key.name || str;
            switch (keyName) {
                case "q":
                case "Q":
                    running = false;
                    console.log("\n\n\x1b[33mShutting down dashboard...\x1b[0m");
                    if (refreshTimer)
                        clearInterval(refreshTimer);
                    rl.close();
                    process.exit(0);
                    break;
                case "r":
                case "R":
                    console.log("\x1b[36mRefreshing...\x1b[0m");
                    await collectAndRender();
                    break;
                case "a":
                case "A":
                    options.showAlerts = !options.showAlerts;
                    renderer.setOptions({ showAlerts: options.showAlerts });
                    await collectAndRender();
                    console.log(`\x1b[36mAlerts display: ${options.showAlerts ? "ON" : "OFF"}\x1b[0m`);
                    break;
                case "t":
                case "T":
                    options.showTrends = !options.showTrends;
                    renderer.setOptions({ showTrends: options.showTrends });
                    await collectAndRender();
                    console.log(`\x1b[36mTrends display: ${options.showTrends ? "ON" : "OFF"}\x1b[0m`);
                    break;
                case "h":
                case "H":
                case "?":
                    console.log("\n\x1b[1mDashboard Controls:\x1b[0m");
                    console.log("  r/R - Refresh now");
                    console.log("  a/A - Toggle alerts display");
                    console.log("  t/T - Toggle trends display");
                    console.log("  q/Q - Quit dashboard");
                    console.log("  Ctrl+C - Force quit\n");
                    break;
                default:
                    break;
            }
        };
        process.stdin.on("keypress", handleKeypress);
        const cleanup = () => {
            running = false;
            if (refreshTimer)
                clearInterval(refreshTimer);
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }
            process.stdin.removeListener("keypress", handleKeypress);
        };
        process.on("SIGINT", cleanup);
        process.on("SIGTERM", cleanup);
    }
    else {
        console.log("\x1b[33mDashboard running in snapshot mode. Use --watch for live updates.\x1b[0m");
    }
    frameworkLogger.log("dashboard", "stopped", "info", {});
}
export default dashboardCommand;
//# sourceMappingURL=dashboard.js.map