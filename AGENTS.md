# xray Agents

Quick reference for xray AI orchestration framework (v2 three-subsystem).

## What is xray?

xray provides intelligent multi-agent orchestration with automatic delegation and Codex compliance validation under the pure v2 three-subsystem model (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in MCP orchestrator). Agents operate via .opencode/agents/*.yml YML surfaces — no manual setup needed. Pure xray v2 three-subsystem only.

## xray Three-Subsystem Operation

xray operates under the pure three-subsystem model: Inference + External Governance (Dynamo Solar SSOT) + Autonomous Engine (thinDispatch 7-flow in MCP orchestrator). Agents are declared in .opencode/agents/*.yml YML surfaces with zero manual setup.

### Core Tenets
- YML declarations are the SSOT
- Zero manual setup or registration
- Governance precedes action via Dynamo
- Automatic delegation via thinDispatch
- fwLogger / frameworkLogger structured logging ONLY (never console.*) to logs/framework/activity.log + .opencode/logs/

### File Organization Guidelines

**IMPORTANT**: Save all generated files to their proper directories. Do NOT save to root.

| File Type | Save To | Example |
|-----------|---------|---------|
| **Reflections** | `docs/reflections/` | `docs/reflections/my-fix-reflection.md` |
| **Logs** | `logs/` | `logs/framework/activity.log` |
| **Scripts** | `scripts/` or `scripts/bash/` | `scripts/bash/my-script.sh` |
| **Test Files** | `src/__tests__/` | `src/__tests__/unit/my-test.test.ts` |
| **Source Code** | `src/` | `src/my-module.ts` |
| **Config** | `config/` or `.opencode/xray/` | `.opencode/xray/config.json` |

**Never save to root** - Root directory is for essential files only:
- `README.md`, `CHANGELOG.md`, `package.json`, `tsconfig.json`

## Available Agents

| Agent | Purpose | Invoke |
|-------|---------|--------|
| `@enforcer` | Codex compliance & error prevention | `@enforcer analyze this code` |
| `@orchestrator` | Complex multi-step task coordination | `@orchestrator implement feature` |
| `@architect` | System design & technical decisions | `@architect design API` |
| `@security-auditor` | Vulnerability detection | `@security-auditor scan` |
| `@code-reviewer` | Quality assessment | `@code-reviewer review PR` |
| `@refactorer` | Technical debt elimination | `@refactorer optimize code` |
| `@testing-lead` | Testing strategy | `@testing-lead plan tests` |
| `@bug-triage-specialist` | Error investigation | `@bug-triage-specialist debug error` |
| `@researcher` | Codebase exploration | `@researcher find implementation` |

## thinDispatch Routing

The Autonomous Engine routes via complexity:

- Simple (≤15): Single agent
- Moderate (≤25): Single agent with tools
- Complex (≤50): Multi-agent coordination
- Enterprise (>50): Orchestrator-led team

## Codex

xray enforces the Universal Development Codex (60 terms) via Dynamo governance. The codex lives in `.opencode/xray/codex.json`.

Pure v2. Clean. Complete.