# AGENTS.md — 0xRay Consumer Template

**Version**: 3.1.0
**Updated**: 2026-06-13

## What is 0xRay?

0xRay is a three-subsystem autonomous engine. The suit is the wear. Inference remembers. External Governance judges. The Autonomous Engine runs the work. The host you already run wears it. When the window closes, the next session wakes with the job. Agents operate via YML surfaces and MCP skill servers.

## Available MCP Servers

| Server | Purpose |
|--------|---------|
| `xray-enforcer` | Codex compliance & error prevention |
| `xray-governance` | Proposal governance, codex snapshot |
| `xray-orchestrator` | thinDispatch 7-flow delegation routing |
| `xray-skills` | Skill invocation (code-review, security-audit, researcher, etc.) |

## CLI Commands

```
npx 0xray install          Install & configure (auto-detects env)
npx 0xray setup            Re-run full configuration
npx 0xray validate         Run Codex compliance validation
npx 0xray status          Show framework status
npx 0xray install <mcp>   Install MCP server (groks)
```

## Governance

All actions are governed by the Universal Development Codex via Dynamo (External Governance SSOT). Governance precedes action.

## Logging

Use `fwLogger` / `frameworkLogger` structured logging only (never `console.*`). Logs go to `logs/framework/activity.log` + `.opencode/logs/`.

## Architecture

- **Inference**: Session capture, pattern accumulation, governance triggers
- **External Governance**: Dynamo Solar SSOT via codex.json
- **Autonomous Engine**: thinDispatch 7-flow in MCP orchestrator

## Complexity Routing

| Complexity | Score | Strategy |
|-----------|-------|----------|
| Simple | ≤15 | Single agent |
| Moderate | ≤25 | Single agent with tools |
| Complex | ≤50 | Multi-agent coordination |
| Enterprise | >50 | Orchestrator-led team |
