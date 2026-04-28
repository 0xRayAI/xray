# Hermes Integration — Quickstart

Use 0xRay's codex enforcement, quality gates, and routing from inside Hermes AI agent.

## What You Get

- **4 MCP tools** — codex_check, validate, health, hooks management
- **2 lifecycle hooks** — pre-tool (quality gate + nudges) and post-tool (post-processors)
- **Codex enforcement** — catches `console.log`, `any` types, missing tests, 60 rules total
- **Terminal nudges** — redirects `grep` to researcher, `patch` to code-reviewer
- **Post-processors** — test auto-creation, coverage analysis, AGENTS.md validation
- **Quality gate** — pre-execution validation on all code-producing tools

## Prerequisites

- Node.js >= 18
- Hermes CLI installed (`pip install hermes` or equivalent)
- 0xRay installed in your project

## Install

```bash
npm install strray-ai
```

## Enable the Plugin

```bash
hermes plugins enable strray-hermes
```

Verify it loaded:

```bash
hermes plugins list
```

You should see: `strray-hermes v2.2 — 4 tools, 2 hooks, bridge=True`

## How It Works

The integration uses a bridge pattern. Hermes loads `strray-hermes` as an MCP plugin. The plugin starts `bridge.mjs` as a subprocess that connects to 0xRay's framework components.

```
Hermes Agent
  ├── Tool call (write_file, patch, etc.)
  │     ↓
  ├── Pre-hook (strray-hermes)
  │     ├── Quality gate check
  │     ├── Codex violation scan
  │     └── Terminal nudge if applicable
  │     ↓
  ├── Tool executes
  │     ↓
  └── Post-hook (strray-hermes)
        ├── Test auto-creation
        ├── Coverage analysis
        └── AGENTS.md validation
```

## MCP Tools

The plugin registers 4 tools that Hermes can call directly:

### strray_codex_check

Check code against 60 codex rules (console.log, any types, missing tests, etc.).

```json
{
  "tool": "strray_codex_check",
  "args": {
    "files": ["src/my-module.ts"],
    "code": "console.log('hello'); const x: any = 1;"
  }
}
```

Response includes violations with severity, rule ID, and suggested fix.

### strray_validate

Run full validation on files or the project.

```json
{
  "tool": "strray_validate",
  "args": {
    "files": ["src/my-module.ts"]
  }
}
```

### strray_health

Quick framework health check.

```json
{
  "tool": "strray_health",
  "args": {}
}
```

### strray_hooks

Manage git hooks (install, uninstall, list, status).

```json
{
  "tool": "strray_hooks",
  "args": {
    "action": "status"
  }
}
```

## Pre-Hook Behavior

Before every tool call, the pre-hook runs:

1. **Quality gate** — validates the tool call against project rules
2. **Codex check** — if the tool produces code, scans for violations
3. **Terminal nudge** — suggests better alternatives:

| Tool | Nudge |
|------|-------|
| `grep` | Use `mcp_strray_researcher_search_codebase` |
| `execute_code` | Use appropriate MCP tool instead |

## Post-Hook Behavior

After every tool call, post-processors run:

| Processor | What It Does |
|-----------|-------------|
| `testAutoCreation` | Creates test files for new source files |
| `testExecution` | Runs tests after code changes |
| `coverageAnalysis` | Analyzes test coverage |
| `agentsMdValidation` | Validates AGENTS.md is present and correct |

## Routing

When Hermes calls tools, 0xRay routes them to specialized agents:

| Tool | Routes To |
|------|-----------|
| `patch` | `code-reviewer` |
| `read_file` | `researcher` |
| `execute_code` | `testing-lead` |
| `write_file` | `orchestrator` |

## Bridge Commands

The bridge (`bridge.mjs`) supports these commands directly:

```bash
# Health check
node node_modules/strray-ai/dist/integrations/hermes-agent/bridge.mjs health

# Codex check on files
node node_modules/strray-ai/dist/integrations/hermes-agent/bridge.mjs codex-check --json '{"files":["src/app.ts"]}'

# Validate project
node node_modules/strray-ai/dist/integrations/hermes-agent/bridge.mjs validate --json '{"files":["src/app.ts"]}'

# Framework stats
node node_modules/strray-ai/dist/integrations/hermes-agent/bridge.mjs stats

# Hook management
node node_modules/strray-ai/dist/integrations/hermes-agent/bridge.mjs hooks --json '{"action":"status"}'
```

## Using with Oneshot Mode

For non-interactive testing:

```bash
hermes -z "Review this code for security issues"
```

The plugin loads automatically. Pre/post hooks fire. Codex violations are caught.

## Troubleshooting

### Plugin Not Loading

```bash
hermes plugins list
```

If `strray-hermes` isn't shown:

```bash
hermes plugins enable strray-hermes
```

### Bridge Reports Framework Not Ready

The bridge needs 0xRay's dist files. Make sure `strray-ai` is installed:

```bash
ls node_modules/strray-ai/dist/processors/processor-manager.js
```

If missing, reinstall:

```bash
npm install strray-ai@latest
```

### Pre-Hooks Not Firing

Check that the plugin is enabled AND hooks are registered:

```bash
hermes plugins list | grep strray
```

Look for `hooks=True` or `2 hooks`.

### Quality Gate Always Passes

The quality gate module runs basic validation. For deep codex enforcement, use the `strray_codex_check` tool directly — it's the primary enforcement mechanism.

## Architecture

```
Hermes CLI
  ├── Loads strray-hermes plugin
  │     ├── Registers 4 MCP tools
  │     └── Registers pre/post hooks
  │           ↓
  ├── bridge.mjs (subprocess, JSON stdin/stdout)
  │     ├── Loads 0xRay framework (ProcessorManager, QualityGate, etc.)
  │     └── Processes commands: health, pre-process, post-process, validate, codex-check
  │           ↓
  └── 0xRay dist/ (framework components)
        ├── processors/ (pre/post processors)
        ├── enforcement/ (codex validators)
        └── plugin/ (quality gate)
```

The bridge uses JSON over stdin/stdout for IPC. No network ports. No WebSocket. Just a subprocess that receives commands and returns results.
