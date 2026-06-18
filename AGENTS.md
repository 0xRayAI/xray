# xray Agents

Quick reference for the xray AI orchestration framework (**v3.4.1** — MCP-centric three-subsystem).

**42 agents** · **45 skills** · **7 consumer MCP servers** · **68 codex terms**

## What is xray?

xray provides intelligent multi-agent orchestration with automatic delegation and Codex compliance validation under the pure v2 three-subsystem model (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow). Agents are declared in `src/opencode/agents/*.yml` — the YML SSOT. Consumer projects receive a slimmed copy via `AGENTS-consumer.md` on postinstall.

## Architecture (v3.4)

### Consumer MCP surface (7 servers)

Registered in `.mcp.json`, invoked via `npx -y 0xray mcp <cmd>`:

| Server | Role |
|--------|------|
| `xray-governance` | Proposal governance, codex snapshot, quality gates |
| `xray-skills` | 45 knowledge skills + `invoke-skill` |
| `xray-orchestrator` | thinDispatch 7-flow, task delegation, confidence gate |
| `xray-enforcer` | Codex compliance, rule validation |
| `xray-researcher` | Codebase exploration, implementation lookup |
| `xray-code-review` | Proposal quality, code review deliberation |
| `xray-architect-tools` | System design, architecture decisions |

**Governance deliberation** — `code-review`, `security-audit`, and `researcher` vote on proposals within the 7-server consumer set. Additional internal `.server.ts` implementations exist for framework pipelines but are not exposed in the consumer `.mcp.json`.

### Postinstall consumer path (v3.4.1)

`scripts/node/postinstall.cjs` → `installAllBridges()`:

1. `AGENTS-consumer.md` → consumer `AGENTS.md`
2. `.gitignore.default` → `.gitignore` (if absent)
3. `.xray/` config deploy
4. Project `.mcp.json` (7 servers)
5. Four bridges: OpenCode, Grok (dual skill paths), Hermes, OpenClaw
6. Skill sync + optional git hooks

### Memory routing + Repertoire (v3.3+)

`xray/features.json` → `memory_routing` block (schema: `features.schema.json`):

```json
"memory_routing": {
  "enabled": true,
  "provider": "repertoire",
  "module_path": "../repertoire/dist/provider/memory-routing-provider.js",
  "config": {
    "dataDir": "../repertoire/data",
    "signalsPath": "../repertoire/data/curated_signals.json",
    "logDir": "../repertoire/logs/groover-inference"
  }
}
```

**Provider contract** (`src/memory-routing/types.ts`): `buildRoutingContext`, `enrichTasks`, `selectAgent`, `resolveThinDispatch`, `getTaskConfidence`, `ingestFeedback`.

**Repertoire MCP** (external hosts): `repertoire__get_task_confidence`, `repertoire__search_primitives`, etc. via `npx @0xray/repertoire mcp`.

Docs: `docs-site/docs/guides/repertoire.md`, `features-json.md`, `features-since-3.1.md`.

### Confidence gate (v3.3.1)

`ExecutionPlanner.calculateTaskComplexity()` uses `getTaskConfidence()` for complexity boost and ontological-trap routing hints before agent assignment.

### Nucleus exports (v3.4.0)

`0xray/nucleus` and `0xray/nucleus/*` — public contract for `handleGovernRequest`, plugin-registry, thinDispatch.

## Changes Since 3.1

| Area | Change |
|------|--------|
| **Rename** | StringRay → 0xRay (3.1.1) |
| **Install** | Unified 4-platform `install-bridges.cjs` (3.4.1) |
| **MCP** | Consumer surface consolidated to 7 `npx` servers (3.4.1) |
| **Config** | `mcpServers` in `.mcp.json`; ConfigLoader supports both formats (3.1.1) |
| **Release** | Canonical `release.mjs` + consumer smoke gate (3.4.1) |
| **Removed** | `hermes bridge` CLI, `.opencode/xray/` fallback, stale JSDoc version tags |
| **Decoupled** | `advanced-features/` not on consumer boot path |

## Core Tenets

- YML declarations are the SSOT (`src/opencode/agents/*.yml`)
- Zero manual setup or registration
- Governance precedes action via Dynamo
- Automatic delegation via thinDispatch
- MCP surfaces are the primary skill interface
- frameworkLogger structured logging ONLY (never `console.*`)

## File Organization

| File Type | Save To | Example |
|-----------|---------|---------|
| Reflections | `docs/reflections/` | `docs/reflections/my-fix-reflection.md` |
| Logs | `logs/` | `logs/framework/activity.log` |
| Scripts | `scripts/` or `scripts/bash/` | `scripts/bash/my-script.sh` |
| Test Files | `src/__tests__/` | `src/__tests__/unit/my-test.test.ts` |
| Source Code | `src/` | `src/my-module.ts` |
| Config | `config/` or `.xray/` | `.xray/config.json` |

**Never save to root** — root is for essential files only: `README.md`, `CHANGELOG.md`, `package.json`, `tsconfig.json`, `AGENTS.md`, `SKILLS.md`.

## Available Agents (42 YML surfaces)

Invoke via `@agent-name` in OpenCode. Full list in `src/opencode/agents/`:

| Agent | Purpose |
|-------|---------|
| `@enforcer` | Codex compliance & error prevention |
| `@orchestrator` | Complex multi-step task coordination |
| `@architect` | System design & technical decisions |
| `@security-auditor` | Vulnerability detection |
| `@code-reviewer` | Quality assessment |
| `@refactorer` | Technical debt elimination |
| `@testing-lead` | Testing strategy |
| `@bug-triage-specialist` | Error investigation |
| `@researcher` | Codebase exploration |
| `@frontend-engineer` | React, Vue, Angular, responsive design |
| `@backend-engineer` | REST/GraphQL APIs, microservices |
| `@database-engineer` | Schema design, query optimization |
| `@devops-engineer` | CI/CD, infrastructure, containers |
| `@mobile-developer` | iOS, Android, React Native, Flutter |
| `@storyteller` | Narrative reflections, technical stories |
| `@strategist` | Architecture decisions, risk analysis |
| `@performance-engineer` | Profiling, benchmarking |
| `@frontend-ui-ux-engineer` | Visual design, accessibility |
| `@multimodal-looker` | Media / screenshot analysis |
| `@log-monitor` | Log diagnostics |
| `@code-analyzer` | Code metrics, pattern detection |
| `@content-creator` | SEO copy, technical content |
| `@growth-strategist` | Marketing strategy |
| `@seo-consultant` | Technical SEO |
| `@tech-writer` | API docs, READMEs, changelogs |
| `@hermes-agent` | Hermes bridge operations |
| `@boot-orchestrator` | Framework boot orchestration |
| `@processor-pipeline` | Data processing pipelines |
| `@state-manager` | Session / state persistence |
| `@session-management` | Session lifecycle |
| `@inference-improve` | Autonomous inference improvement |
| `@model-health-check` | Model health diagnostics |
| `@framework-compliance-audit` | Framework compliance validation |
| `@lint` | Code linting |
| `@auto-format` | Automated formatting |
| `@git-workflow` | Git workflow management |
| `@api-design` | REST/GraphQL API design |
| `@architecture-patterns` | Architecture patterns |
| `@performance-analysis` | Performance analysis |
| `@performance-optimization` | Performance optimization |
| `@project-analysis` | Project health metrics |
| `@security-scan` | Security vulnerability scanning |
| `@testing-best-practices` | Testing QA |
| `@ui-ux-design` | UI/UX design |

## thinDispatch Routing

- Simple (≤15): Single agent
- Moderate (≤25): Single agent with tools
- Complex (≤50): Multi-agent coordination
- Enterprise (>50): Orchestrator-led team

## Codex

68 terms in `.xray/codex.json`. Enforced via Dynamo governance and `xray-enforcer` MCP.

## Release Artifacts

`npm run release:patch` updates and commits: `package.json`, `CHANGELOG.md`, `README.md`, `AGENTS.md`, `AGENTS-consumer.md`.