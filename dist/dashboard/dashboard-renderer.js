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
const DEFAULT_RENDER_OPTIONS = {
    theme: "dark",
    width: 120,
    height: 40,
    showTrends: true,
    showAlerts: true,
};
const COLORS = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    dark: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        gray: "\x1b[90m",
    },
    light: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[97m",
        gray: "\x1b[90m",
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
    },
};
export class DashboardRenderer {
    options;
    colors;
    constructor(options = {}) {
        this.options = { ...DEFAULT_RENDER_OPTIONS, ...options };
        this.colors = this.options.theme === "dark" ? COLORS.dark : COLORS.light;
    }
    clear() {
        process.stdout.write("\x1b[2J\x1b[H");
    }
    render(state) {
        this.clear();
        this.renderHeader(state);
        this.renderMetrics(state);
        this.renderDelegationAnalytics(state);
        this.renderVotingAnalytics(state);
        if (this.options.showTrends) {
            this.renderTrends(state);
        }
        if (this.options.showAlerts && state.alerts.length > 0) {
            this.renderAlerts(state.alerts);
        }
        this.renderFooter(state);
    }
    renderHeader(state) {
        const { green, cyan, reset, bold } = this.colors;
        const border = "═".repeat(this.options.width);
        console.log(`${green}${bold}╔${border}╗${reset}`);
        console.log(`${green}${bold}║${reset} ${cyan}${bold}0xRay Orchestration Dashboard${reset} ${" ".repeat(this.options.width - 36)}${green}${bold}║${reset}`);
        console.log(`${green}${bold}╠${border}╣${reset}`);
        const lastUpdated = new Date(state.lastUpdated).toLocaleTimeString();
        console.log(`${green}${bold}║${reset} Last updated: ${lastUpdated} | Active sessions: ${state.metrics.activeSessions} ${" ".repeat(Math.max(0, this.options.width - 65))}${green}${bold}║${reset}`);
        console.log(`${green}${bold}╚${border}╝${reset}`);
        console.log("");
    }
    renderMetrics(state) {
        const { green, cyan, yellow, red, reset, bold } = this.colors;
        console.log(`${cyan}${bold}┌─ Orchestration Metrics${"─".repeat(this.options.width - 26)}┐${reset}`);
        const { metrics } = state;
        const successColor = metrics.successRate >= 0.8 ? green : metrics.successRate >= 0.5 ? yellow : red;
        const row1 = [
            `Sessions: ${metrics.totalSessions}`,
            `Active: ${metrics.activeSessions}`,
            `Completed: ${metrics.completedSessions}`,
            `Failed: ${metrics.failedSessions}`,
        ];
        const row2 = [
            `Agents Used: ${metrics.totalAgentsUsed}`,
            `Tasks: ${metrics.totalTasksExecuted}`,
            `Avg Duration: ${this.formatDuration(metrics.avgSessionDuration)}`,
            `Success Rate: ${successColor}${bold}${(metrics.successRate * 100).toFixed(1)}%${reset}`,
        ];
        console.log(`│ ${row1.join("  │  ")}${" ".repeat(Math.max(0, this.options.width - 8 - row1.join("  │  ").length))}│`);
        console.log(`│ ${row2.join("  │  ")}${" ".repeat(Math.max(0, this.options.width - 8 - row2.join("  │  ").length))}│`);
        console.log(`${cyan}${"└"}${"─".repeat(this.options.width - 2)}${cyan}┘${reset}`);
        console.log("");
    }
    renderDelegationAnalytics(state) {
        const { green, cyan, yellow, reset, bold } = this.colors;
        console.log(`${cyan}${bold}┌─ Delegation Analytics${"─".repeat(this.options.width - 24)}┐${reset}`);
        const { agents } = state;
        if (agents.length === 0) {
            console.log(`│  No delegation data available yet.${" ".repeat(this.options.width - 35)}│`);
        }
        else {
            const topAgents = agents.slice(0, 5);
            console.log(`│ ${bold}Top Agents by Invocations:${reset}${" ".repeat(this.options.width - 30)}│`);
            for (const agent of topAgents) {
                const successColor = agent.successRate >= 0.8 ? green : agent.successRate >= 0.5 ? yellow : this.colors.red;
                const name = agent.name.padEnd(20);
                const invocations = agent.invocations.toString().padStart(4);
                const complexity = agent.avgComplexity.toFixed(0).padStart(3);
                const success = `${successColor}${(agent.successRate * 100).toFixed(0)}%${reset}`;
                console.log(`│   ${name} │ ${invocations} inv │ ${complexity} avg complexity │ ${success} success${" ".repeat(Math.max(0, this.options.width - 75))}│`);
            }
        }
        console.log(`${cyan}${bold}└${"─".repeat(this.options.width - 2)}┘${reset}`);
        console.log("");
    }
    renderVotingAnalytics(state) {
        const { green, cyan, yellow, reset, bold } = this.colors;
        console.log(`${cyan}${bold}┌─ Voting Outcomes${"─".repeat(this.options.width - 22)}┐${reset}`);
        const { voting } = state;
        const consensusPct = (voting.consensusRate * 100).toFixed(1);
        const majorityPct = (voting.majorityRate * 100).toFixed(1);
        const confidencePct = (voting.avgConfidence * 100).toFixed(1);
        console.log(`│  Total Votes: ${voting.totalVotes.toString().padStart(4)} │ Success: ${voting.successfulVotes.toString().padStart(3)} │ Failed: ${voting.failedVotes.toString().padStart(3)}${" ".repeat(Math.max(0, this.options.width - 68))}│`);
        console.log(`│  Strategy: Consensus ${consensusPct}% | Majority ${majorityPct}%${" ".repeat(Math.max(0, this.options.width - 60))}│`);
        console.log(`│  Avg Confidence: ${confidencePct}%${" ".repeat(Math.max(0, this.options.width - 24))}│`);
        if (state.votingOutcomes.length > 0) {
            console.log(`│ ${bold}Recent Outcomes:${reset}${" ".repeat(this.options.width - 21)}│`);
            const recent = state.votingOutcomes.slice(-3);
            for (const outcome of recent) {
                const time = new Date(outcome.timestamp).toLocaleTimeString();
                const strategy = outcome.strategy.replace("_", " ");
                const confidence = `${(outcome.confidence * 100).toFixed(0)}%`;
                console.log(`│   ${time} │ ${strategy.padEnd(15)} │ ${confidence} confidence${outcome.tied ? " [TIED]" : ""}${" ".repeat(Math.max(0, this.options.width - 70))}│`);
            }
        }
        console.log(`${cyan}${bold}└${"─".repeat(this.options.width - 2)}┘${reset}`);
        console.log("");
    }
    renderTrends(state) {
        const { green, cyan, yellow, reset, bold } = this.colors;
        console.log(`${cyan}${bold}┌─ Historical Trends${"─".repeat(this.options.width - 23)}┐${reset}`);
        const { trends, complexity } = state;
        if (trends.sessionHistory.length > 0) {
            const maxSessions = Math.max(...trends.sessionHistory.map((p) => p.value), 1);
            const recentSessions = trends.sessionHistory.slice(-20);
            console.log(`│ ${bold}Session Activity (last 20 hours):${reset}${" ".repeat(this.options.width - 37)}│`);
            const sparkline = this.renderSparkline(recentSessions.map((p) => p.value), maxSessions, Math.max(0, this.options.width - 50));
            console.log(`│   [${sparkline}]${" ".repeat(Math.max(0, this.options.width - 53))}│`);
        }
        if (complexity.length > 0) {
            console.log(`│ ${bold}Complexity Distribution:${reset}${" ".repeat(this.options.width - 28)}│`);
            const total = complexity.reduce((sum, c) => sum + c.count, 0) || 1;
            for (const c of complexity) {
                const barLength = Math.round((c.count / total) * (this.options.width - 40));
                const bar = "█".repeat(barLength);
                const pct = ((c.count / total) * 100).toFixed(1);
                console.log(`│   ${c.level.padEnd(10)} │ ${bar.padEnd(Math.min(barLength, this.options.width - 40))} ${pct.padStart(5)}%${" ".repeat(Math.max(0, this.options.width - barLength - 35))}│`);
            }
        }
        if (trends.successRateHistory.length > 0) {
            const recentRates = trends.successRateHistory.slice(-20);
            console.log(`│ ${bold}Success Rate Trend:${reset}${" ".repeat(this.options.width - 25)}│`);
            const sparkline = this.renderSparkline(recentRates.map((p) => p.value), 1, Math.max(0, this.options.width - 50));
            console.log(`│   [${sparkline}]${" ".repeat(Math.max(0, this.options.width - 53))}│`);
        }
        console.log(`${cyan}${bold}└${"─".repeat(this.options.width - 2)}┘${reset}`);
        console.log("");
    }
    renderAlerts(alerts) {
        const { green, cyan, yellow, red, reset, bold } = this.colors;
        console.log(`${red}${bold}┌─ Active Alerts (${alerts.length})${"─".repeat(Math.max(0, this.options.width - 24 - alerts.length.toString().length))}┐${reset}`);
        for (const alert of alerts.slice(0, 5)) {
            const severityIcon = alert.severity === "critical" ? "🔴" : alert.severity === "error" ? "🔴" : alert.severity === "warning" ? "🟡" : "🔵";
            const severityColor = alert.severity === "critical" ? red : alert.severity === "error" ? red : alert.severity === "warning" ? yellow : cyan;
            const time = new Date(alert.timestamp).toLocaleTimeString();
            const title = `${severityIcon} [${alert.severity.toUpperCase()}] ${alert.title}`;
            console.log(`│ ${severityColor}${title}${reset}${" ".repeat(Math.max(0, this.options.width - 8 - title.length))}│`);
            console.log(`│   ${time} - ${alert.message.substring(0, this.options.width - 16)}${" ".repeat(Math.max(0, this.options.width - 16 - alert.message.substring(0, this.options.width - 16).length))}│`);
        }
        console.log(`${red}${bold}└${"─".repeat(this.options.width - 2)}┘${reset}`);
        console.log("");
    }
    renderFooter(state) {
        const { dim, reset } = this.colors;
        console.log(`${dim}┌${"─".repeat(this.options.width - 2)}┐${reset}`);
        console.log(`${dim}│ Press 'q' to quit | 'r' to refresh | 'a' to toggle alerts | 't' to toggle trends${" ".repeat(Math.max(0, this.options.width - 88))}│${reset}`);
        console.log(`${dim}└${"─".repeat(this.options.width - 2)}┘${reset}`);
    }
    renderSparkline(values, max, width) {
        const { green, yellow, red, reset } = this.colors;
        if (values.length === 0 || width <= 0)
            return "";
        const step = max / width;
        let result = "";
        for (let i = 0; i < Math.min(values.length, width); i++) {
            const value = values[i] || 0;
            const normalized = value / max;
            if (normalized >= 0.7) {
                result += `${green}▓${reset}`;
            }
            else if (normalized >= 0.4) {
                result += `${yellow}▓${reset}`;
            }
            else if (normalized > 0) {
                result += `${red}▓${reset}`;
            }
            else {
                result += `${this.colors.gray}░${reset}`;
            }
        }
        return result;
    }
    formatDuration(ms) {
        if (ms < 1000)
            return `${ms}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000)
            return `${(ms / 60000).toFixed(1)}m`;
        return `${(ms / 3600000).toFixed(1)}h`;
    }
    setOptions(options) {
        this.options = { ...this.options, ...options };
        this.colors = this.options.theme === "dark" ? COLORS.dark : COLORS.light;
    }
    getOptions() {
        return { ...this.options };
    }
}
export const createDashboardRenderer = (options) => {
    return new DashboardRenderer(options);
};
//# sourceMappingURL=dashboard-renderer.js.map