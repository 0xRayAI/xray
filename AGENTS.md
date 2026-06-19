# xray Agents

Quick reference for the xray AI orchestration framework (**v3.5.4**).

**42 agents** · **45 skills** · **7 consumer MCP servers** · **68 codex terms** · **3,226 tests**

## What is xray?

xray provides intelligent multi-agent orchestration with automatic delegation and Codex compliance validation under the pure v2 three-subsystem model:

- **Inference** — proposals, reflection, memory routing (optional)
- **External Governance** — Dynamo Solar SSOT, 68-term Codex
- **Autonomous Engine** — thinDispatch 7-flow, AsideContext, confidence gate

Agents are declared in `src/opencode/agents/*.yml` — the YML SSOT. Skills live in `src/skills/*/SKILL.md` — see [SKILLS.md](SKILLS.md). Consumer projects receive slimmed copies via postinstall (`AGENTS-consumer.md` → `AGENTS.md`, skills synced to platform dirs).

## Consumer MCP surface (7 servers)

Registered in `.mcp.json`, invoked via `npx -y 0xray mcp <cmd>`:

| Server | Role |
|--------|------|
| `xray-governance` | Proposal governance, codex snapshot, quality gates |
| `xray-skills` | 45 knowledge skills + `invoke-skill` |
| `xray-orchestrator` | thinDispatch, AsideContext, confidence gate |
| `xray-enforcer` | Codex compliance, rule validation |
| `xray-researcher` | Codebase exploration, memory-routing enrichment |
| `xray-code-review` | Proposal quality, code review deliberation |
| `xray-architect-tools` | System design, architecture decisions |

Governance deliberation: **code-review**, **security-audit**, **researcher** within the 7-server set.

## Postinstall (v3.4.1)

`postinstall.cjs` → `installAllBridges()`:

1. `AGENTS-consumer.md` → `AGENTS.md`
2. `SKILLS.md` + 46 skills → platform skill directories
3. `.gitignore.default` → `.gitignore` (if absent)
4. `.xray/` config (`codex.json`, `features.json`, `config.json`)
5. `.mcp.json` (7 servers)
6. Four bridges: OpenCode, Grok, Hermes, OpenClaw
7. Optional git hooks

## Memory routing + Repertoire (v3.3+)

`xray/features.json` → `memory_routing` (schema: `features.schema.json`):

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

| Integration | Surface |
|-------------|---------|
| ExecutionPlanner | `enrichTasks`, `getTaskConfidence`, `selectAgent` |
| thinDispatch | `resolveThinDispatch` |
| Researcher | `researcher-confidence.ts`, `MEMORY_ROUTING:` block |
| AsideContext | `buildInheritedContext` → `inheritedContext.memoryRouting` |
| Feedback | Per-task `ingestFeedback` |

**External MCP:** `npx @0xray/repertoire mcp` — `repertoire__get_task_confidence`, etc.

## AsideContext (v3.2+)

`src/mcps/orchestrator/aside-context.ts` — bounded subcontexts for orchestration:

- `spawnAside` / `closeAside` on `orchestrate-task`, `analyze-complexity`, `govern-and-apply`
- Observation extractors: governance, orchestration, complexity
- Repertoire context flows via `ExecutionPlan.memoryContext`

## Confidence gate (v3.3.1)

`ExecutionPlanner.calculateTaskComplexity()` + `getTaskConfidence()` — complexity boost and ontological-trap routing.

## Nucleus exports (v3.4.0)

`0xray/nucleus` and `0xray/nucleus/*` — `handleGovernRequest`, plugin-registry, thinDispatch.

## Changes since 3.1

| Version | Change |
|---------|--------|
| **3.4.1** | `install-bridges.cjs`, 7 MCPs `npx`, release pipeline + docs sync |
| **3.4.0** | Nucleus exports, governance closure, verify gate |
| **3.3.1** | Confidence gate, repertoire researcher wiring |
| **3.3.0** | Memory routing + Repertoire provider |
| **3.2.0** | AsideContext wired, SelfProposalEngine, pre-tool-use hook |
| **3.1.1** | 0xRay rename, marketplace, AGENTS/SKILLS consumer seeding |

**Removed:** `hermes bridge`, `.opencode/xray/` fallback, `advanced-features/` on consumer boot.

## Default operating mode: autonomy-command

When the suit is worn, **autonomy-command** is ON by default (codex 67–68). Lead dev: phased todos, subagent dispatch, per-suite test triage, loop until green. Ships to consumers via `AGENTS-consumer.md`.

Docs: [guides/autonomy-command](docs-site/docs/guides/autonomy-command.md) · Skill: `src/skills/autonomy-command/SKILL.md`

## Core tenets

- YML agents + SKILL.md are the SSOT
- Zero manual registration
- Governance precedes action (Dynamo)
- MCP surfaces are the primary skill interface
- frameworkLogger only (never `console.*`)

## File organization

| File Type | Save To |
|-----------|---------|
| Reflections | `docs/reflections/` |
| Logs | `logs/` |
| Scripts | `scripts/` or `scripts/bash/` |
| Tests | `src/__tests__/` |
| Source | `src/` |
| Config | `.xray/` or `config/` |

**Root essentials only:** `README.md`, `CHANGELOG.md`, `package.json`, `AGENTS.md`, `SKILLS.md`, `tsconfig.json`.

## Available agents (42 YML surfaces)

Invoke via `@agent-name` in OpenCode:

| Agent | Purpose |
|-------|---------|
| `@enforcer` | Codex compliance & error prevention |
| `@orchestrator` | Multi-step task coordination |
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
| `@framework-compliance-audit` | Framework compliance |
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

Full skill mapping: [SKILLS.md](SKILLS.md).

## thinDispatch routing

- Simple (≤15): Single agent
- Moderate (≤25): Single agent with tools
- Complex (≤50): Multi-agent coordination
- Enterprise (>50): Orchestrator-led team

## Documentation

| Topic | Path |
|-------|------|
| Features since 3.1 | `docs-site/docs/guides/features-since-3.1.md` |
| features.json | `docs-site/docs/guides/features-json.md` |
| Platform integrations | `docs-site/docs/guides/integrations.md` |
| Memory routing | `docs-site/docs/guides/memory-routing.md` |
| Repertoire | `docs-site/docs/guides/repertoire.md` |
| AsideContext | `docs-site/docs/guides/aside-context.md` |
| Consumer migration | `docs-site/docs/guides/consumer-migration.md` |
| Docusaurus site | https://0xrayai.github.io/xray/ |

## Release artifacts

`npm run release:patch` updates: `package.json`, `CHANGELOG.md`, `README.md`, `AGENTS.md`, `AGENTS-consumer.md`, `SKILLS.md`, Docusaurus guides.