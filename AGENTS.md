# xray Agents

Quick reference for xray AI orchestration framework (v16 MCPs-centric three-subsystem).

## What is xray?

xray provides intelligent multi-agent orchestration with automatic delegation and Codex compliance validation under the pure v2 three-subsystem model (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in MCP orchestrator). Agents operate via `.opencode/agents/*.yml` YML surfaces and 3 dedicated MCP skill servers — no manual setup needed.

## v16 MCPs-Centric Architecture

The v2 release centers on **MCP (Model Context Protocol)** as the primary surface for agent skills. Three agent MCP servers handle governance deliberation:

- `code-review` — Proposal quality, code analysis, best practices
- `security-audit` — Vulnerability detection, threat modeling
- `researcher` — Codebase exploration, pattern discovery, implementation lookup

These MCP servers integrate with the three-subsystem pipeline for governance-gated execution.

## xray Three-Subsystem Operation

xray operates under the pure three-subsystem model: Inference + External Governance (Dynamo Solar SSOT) + Autonomous Engine (thinDispatch 7-flow in MCP orchestrator). Agents are declared in `.opencode/agents/*.yml` YML surfaces with zero manual setup.

### Core Tenets
- YML declarations are the SSOT
- Zero manual setup or registration
- Governance precedes action via Dynamo
- Automatic delegation via thinDispatch
- MCP surfaces are the primary skill interface
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

## MCP Skill Servers

xray ships dedicated MCP servers that provide agent skills:

| Server | Role |
|--------|------|
| `code-review` | Proposal quality analysis, code review |
| `security-audit` | Vulnerability scanning, threat assessment |
| `researcher` | Codebase exploration, implementation lookup |
| `orchestrator` | thinDispatch 7-flow delegation routing |
| `enforcer-tools` | Codex compliance enforcement |
| `governance` | Proposal governance, codex snapshot |

## thinDispatch Routing

The Autonomous Engine routes via complexity:

- Simple (≤15): Single agent
- Moderate (≤25): Single agent with tools
- Complex (≤50): Multi-agent coordination
- Enterprise (>50): Orchestrator-led team

## Codex

xray enforces the Universal Development Codex (60 terms) via Dynamo governance. The codex lives in `.opencode/xray/codex.json`.

Pure v16 MCPs. Clean. Complete.

## Session: v2.1.0 Release Polish

- Package: `0xray` (npm), `github.com/0xRayAI/xray`. Version `2.0.0`.
- Renamed `strray-ai` → `0xray` across 60+ source files, CLI help text, grok plugin, hermes-agent bridge (Python + JS), docusaurus config.
- **12 stale docs git-rm'd**: AGENTS-consumer.md, AGENTS-full.md, CHANGELOG-v1.15.x.md, 7 docs/ files.
- **AGENTS.md + README.md**: Rewritten v16 MCPs-centric.
- **CLI help text**: `npx 0xray` — removed dead `dashboard` command, stale examples.
- `.npmignore`: removed `src/` (conflicted with `files` field — was silently dropping published sources).
- `.gitignore`: cleaned stale `.strray/` entries, `strray-ai-*.tgz` → `0xray-*.tgz`.
- **Deep review fixes via 4 parallel agents**:
  - `researcher/SKILL.md`: MCP path fixed → `researcher.server.js`
  - `security-audit/SKILL.md`: tool list fixed to match actual 4 tools
  - `governance-service.ts`: `overallDecision` now returns `'reject'` when appropriate; ProposalType mapping fixed
  - `governance.server.ts`: `process.stderr.write` → `frameworkLogger.log`
  - `boot-orchestrator.server.ts`: `console.log` → `frameworkLogger.log`
  - `ui-ux-design.server.ts`: duplicate import removed
  - `testing-strategy.server.ts`: 7 malformed log keys fixed
  - `framework-compliance-audit.server.ts`: 2 malformed log IDs fixed
  - `status.ts` CLI command wired into `index.ts`
  - Orphaned files analyzed (not deleted): `security-audit.ts`, `src/security/` (11 files), `session-capture-processor.ts`, `activate-kernel-pipeline.ts`
- **Hermes-agent bridge backward compat**: all JS/Python bridge files check for both `strray-ai` (old) and `0xray` (new). Default paths updated to `0xray`.
- **Test suite**: 158 files, 2290 tests, 0 failures. Build passes clean.
