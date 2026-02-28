# stringray - Project Agents Guide

**Last Updated**: 2026-02-28
**Maintained by**: Manual updates (see Post-Processors below)

---

## AGENTS.md Post-Processors

AGENTS.md is maintained by **two post-processors**:

### 1. Rule Enforcer (Pre-Commit Validation)
- **Purpose**: Validates AGENTS.md exists and is current
- **Behavior**: Blocks commits if AGENTS.md is missing or >30 days old
- **Config**: `src/enforcement/rule-enforcer.ts`

### 2. Librarian Auto-Update (Post-Processing)
- **Purpose**: Auto-generate AGENTS.md from project analysis
- **Status**: Currently experimental/unreliable
- **Config**: `src/agents/librarian-agents-updater.ts`
- **Note**: May fail silently - manual updates recommended

---

<!-- AUTO-GENERATED START -->

## Languages
- TypeScript
- JavaScript
- Python

## APIs
- REST API
- WebSocket

## Project Components
- Services
- Data Models
- Hooks
- State Management
- Utilities
- Configuration

## Plugin Systems (IMPORTANT: Two Different Systems!)

StringRay has **two distinct plugin systems** - do NOT confuse them:

### 1. OpenCode Plugin (`.opencode/plugin/`)
**Purpose:** Injects StringRay into OpenCode framework
- Location: `.opencode/plugin/strray-codex-injection.js`
- What it does: Injects Universal Development Codex into OpenCode's AI agents
- For: OpenCode integration, NOT for third-party extensions

### 2. StringRay Plugin Ecosystem (`src/plugins/`)
**Purpose:** Third-party plugin system for extending StringRay
- Location: `src/plugins/`
- Components:
  - `plugin-system.ts` - Core: PluginRegistry, PluginSandbox, PluginValidator
  - `marketplace/` - Plugin discovery and download service
- What it does: Allows third-party developers to create custom agents
- For: Third-party plugins, NOT OpenCode integration

### Quick Reference
| What You Want | Use This |
|---------------|----------|
| Extend StringRay with custom agents | `src/plugins/` |
| Inject codex into OpenCode | `.opencode/plugin/` |

<!-- AUTO-GENERATED END -->

---

## Activity Logs

StringRay logs all framework activity to help with debugging and monitoring.

### Log Locations

| Log | Path | Description |
|-----|------|-------------|
| **Activity Log** | `logs/framework/activity.log` | Main framework log - all operations |

### Viewing Logs

```bash
# View recent activity
tail -50 logs/framework/activity.log

# Search for errors
grep "ERROR" logs/framework/activity.log

# Monitor live
tail -f logs/framework/activity.log
```

### Log Format

```
2026-02-28T16:24:36.317Z [auto-1772295876317-wg3drj] [processor-manager] tests-completed - SUCCESS
        ↓                    ↓                      ↓                    ↓
   timestamp            job-id               component              message
```

---

## Activity Log Reporting Scripts

Generate detailed reports from activity logs using these scripts.

### Session Reports (Recommended)

```bash
# Generate session-based reports (groups jobs by session timestamp)
node scripts/generate-session-reports.mjs

# Reports saved to: logs/reports/session-*.md
```

### Legacy Job Reports (Deprecated)

```bash
# ⚠️ DEPRECATED - Use session reports instead
# These are too granular (1 entry per job)
node scripts/generate-job-reports.mjs
```

### Activity Reports

```bash
# Generate full activity report
node scripts/node/generate-activity-report.js

# Generate phase1 completion report  
node scripts/node/generate-phase1-report.js

# Output saved to: reports/activity/ and reports/phase1/
```

### Framework Reports

```bash
# Full framework analysis
npx strray-ai report

# Agent usage report
npx strray-ai report -t agent-usage

# Performance report
npx strray-ai report -t performance

# Pattern analytics
npx strray-ai analytics
```

### Report Locations

| Report Type | Location |
|------------|----------|
| Session Reports (Recommended) | `logs/reports/session-*.md` |
| Job Reports (Deprecated) | `logs/reports/job-*.md` |
| Activity Reports | `reports/activity/` |
| Phase Reports | `reports/phase1/` |
| Framework Reports | `logs/framework/framework-report-*.json` |
| Analytics | `logs/framework/activity-report.json` |

---

## Reporting & Analytics

Generate reports to understand framework performance and diagnose issues.

### Commands

```bash
# Generate framework health report (all types)
npx strray-ai report

# Generate specific report type
npx strray-ai report -t agent-usage
npx strray-ai report -t performance
npx strray-ai report -t full-analysis

# Generate activity analytics
npx strray-ai analytics

# Save report to file
npx strray-ai report -o logs/framework/report.json
npx strray-ai analytics -o logs/framework/activity-report.json
```

### Report Types

| Type | Description |
|------|-------------|
| `full-analysis` | Complete framework health report (default) |
| `agent-usage` | Agent delegation and usage statistics |
| `performance` | Performance metrics and timing |
| `orchestration` | Orchestration flow analysis |
| `context-awareness` | Context operations report |

### Example Output

```
📊 StringRay Framework Report: full-analysis
==========================================
{
  "metrics": {
    "successRate": 95.6,
    "totalDelegations": 42
  },
  "summary": {
    "totalEvents": 150,
    "activeComponents": ["orchestrator", "enforcer", "state-manager"],
    "healthScore": 95.6
  }
}
```

---

*This AGENTS.md is auto-maintained by StringRay AI Librarian*