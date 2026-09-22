# 0xRay AI Agents

Quick reference for the 0xRay AI orchestration framework (**4.0** — 7 consumer MCP servers).

## Available MCP Servers

All seven use `npx -y 0xray mcp <cmd>`:

| Server | Role |
|--------|------|
| `xray-governance` | Proposal governance, codex snapshot, quality gates |
| `xray-skills` | Skill invocation, 45 knowledge skills |
| `xray-orchestrator` | thinDispatch routing, AsideContext, confidence gate |
| `xray-enforcer` | Codex compliance enforcement, rule validation |
| `xray-researcher` | Codebase exploration, memory-routing enrichment |
| `xray-code-review` | Proposal quality, code review deliberation |
| `xray-architect-tools` | System design, architecture decisions |

## CLI Commands

| Command | Description |
|---------|-------------|
| `xray setup` | Full framework setup (hooks, Hermes, symlinks) |
| `xray validate` | Wear check (pack paths, Cursor hooks, mill) — not leftover init.sh |
| `xray codex check` | Check codex rules |
| `xray health` | Framework health check |
| `xray hooks` | Manage lifecycle hooks |

## Governance

xray operates under the three-subsystem model: Inference + External Governance (Dynamo Solar SSOT) + Autonomous Engine (thinDispatch 7-flow in MCP orchestrator). All actions are validated against the Universal Development Codex before execution.

**Codex**: `.xray/codex.json` — **69 terms** across all agent interactions.

## thinDispatch Routing

- Simple (≤15): Single agent
- Moderate (≤25): Single agent with tools
- Complex (≤50): Multi-agent coordination
- Enterprise (>50): Orchestrator-led team

## File Organization

| File Type | Save To |
|-----------|---------|
| Reflections | `docs/reflections/` |
| Logs | `logs/` |
| Scripts | `scripts/` or `scripts/bash/` |
| Test Files | `src/__tests__/` |
| Source Code | `src/` |
| Config | `config/` or `.xray/` |
