# xray v3 Subsystem Map

> SSOT for system architecture. Reviews proceed in numbered order (logical dependency flow).
> Last updated: 2026-06-10

## High-Level Architectural Model

- **Three-Subsystem Model** (pure v2/v3):
  - **Inference** — observation, pattern detection, proposal generation (activity.log → self-proposals).
  - **External Governance** — Dynamo Solar SSOT + 3-agent (code-review/security-audit/researcher) deliberation + merge (PHI/TAU, moral, metamorphosis scoring).
  - **Autonomous Engine** — thinDispatch (complexity routing), orchestrator, delegation, enforcement.
- **v3 Nucleus Overlay**: kernel as callable core, MCP as canonical surface, plugins as dynamic default set, metamorphosis for self-evolution.
- **MCP is the standard** (like Dynamo for external signal). Everything else (HTTP, CLI, in-process, YML agents) are adapters/surfaces.

## Foundation

### 1. Core (`src/core/` — 23 files, ~8606 LOC)

**Files:** boot-orchestrator.ts, xray-activation.ts, framework-logger.ts, activity-logger.ts, config-loader.ts, config-paths.ts, features-config.ts, codex-formatter.ts, codex-injector.ts, model-router.ts, adaptive-kernel.ts, kernel-patterns.ts, context-loader.ts, context-validator.ts, agent-spawn-gate.ts, orchestrator.ts, system-prompt-generator.ts, bridge.mjs, etc.

**Role:** Foundation layer — boot, config, structured logging (activity.log is sacred), Codex compliance, model routing, kernel patterns, context management.

**Status:** Foundational, tightly integrated. framework-logger is non-negotiable.

---

## Kernel & Governance

### 2. Nucleus (`src/nucleus/` — 4 files + 3 test files)

**Files:** kernel.ts, plugin-registry.ts, govern-http.ts, index.ts

**Role:** v3 callable core — uniform entry for all governance. Thin facade over governance-service + plugin registry + self-evolution exports.

**Status:** Central, post-v3. Small + focused ("large and tight" success story).

### 3. Governance / Dynamo (`src/governance/` — 5 files)

**Files:** governance-service.ts, governance-core.ts, governance-types.ts, codex-policy.service.ts

**Role:** 3-skill deliberation + mandatory external Dynamo + merge logic + metamorphosis scoring. The "moat."
Feeds GovernanceRequest → GovernanceResponse (votes, finalDecision, metamorphosisScore, moralOverride).

**Status:** Tight core. Used by nucleus + MCP.

### 4. MCP Federation (`src/mcps/` — 9 subdirectories, 41+ servers)

**Subdirs:** config/ (server config, plugin/server registries), connection/ (connection manager, pool, MCP connections, process spawner), knowledge-skills/ (25 *.server.ts — code-review, security-audit, researcher, testing-strategy, ui-ux, perf, devops, tech-writer, multimodal-looker, etc.), orchestrator/ (orchestrator MCP server, execution handlers), protocol/ (protocol constants), shared/ (knowledge-skill-base.ts — 62 LOC transport base, prompt security, scanner), simulation/ (MCP simulation engine), tools/ (tool discovery, caching, executor, registry), types/ (JSON-RPC + MCP types)

**Root servers:** governance.server.ts, orchestrator.server.ts, researcher.server.ts, skill-invocation.server.ts, processor-pipeline.server.ts, enforcer-tools.server.ts, etc.

**Role:** 41 servers total (25 knowledge + 16 root). MCP = canonical surface. skill-invocation as generic proxy. in-process for kernel speed. pluginRegistry as dynamic loading.

**Size:** ~21k LOC in knowledge-skills alone (avg ~843/server). Full MCP tree significantly larger.

**Status:** Federation as "rich default." Base class thinned. Phase 3 added pluginRegistry registration for all knowledge-skill servers.

---

## Autonomous Engine

### 5. Inference (`src/inference/` — 6 files)

**Files:** inference-cycle.ts, inference-accumulator.ts, deploy-verifier.ts, semantic-patterns.ts, session-capture.ts, index.ts

**Role:** Corpus accumulation, threshold triggering, proposal generation (recurring problems/patterns), governViaNucleus + MCP fallback, apply.

**Status:** Core but cleaned (recent purge removed legacy paths + VotingCoordinator).

### 6. Orchestration + Delegation (thinDispatch)

**Orchestration** (`src/orchestrator/` — 10 files): enhanced-multi-agent-orchestrator.ts + coordinators, agent-spawn-governor, universal-*, etc.

**Delegation** (`src/delegation/` — 22 files): agent-delegator.ts, complexity-analyzer.ts, strategy-selector.ts, weighted-voting-aggregator.ts, session-coordinator.ts, analytics/, voting-types.ts, ast-code-parser.ts, etc.

**Role:** Complexity assessment → routing (simple/moderate/complex/enterprise), agent expertise, conflict resolution, session coordination. 7-flow thinDispatch.

**Status:** Large but intentional for autonomous behavior. VotingCoordinator cruft already removed.

### 7. Enforcement / Codex (`src/enforcement/` + `src/core/` codex files — 34 files)

**Files:** rule-enforcer.ts, core/, validators/ (11), loaders/ (9), types, enforcer-tools.server.ts. Plus src/core/codex-*.ts, src/core/codex-injector.ts. SSOT at .opencode/xray/codex.json (72 terms).

**Role:** Pre-write validation, codex injection, rule enforcement. Zero-tolerance.

**Status:** Foundational. Tightly integrated.

---

## Processing Layer

### 8. Processors (`src/processors/` — 29 files)

**Files:** processor-manager.ts, interfaces, processor-types, implementations/ (24 files — codex-compliance-processor, test-*-processor, performance-budget, nudge, session-summary, etc.)

**Role:** Old independent post-process steps.

**Status:** v3 shifted these to PostProcessor pipeline stages/plugins. Strong review candidate for duplication/obsolescence.

### 9. Postprocessor (incl. Metamorphosis) (`src/postprocessor/` — 26 files)

**Files:** PostProcessor.ts + services/, triggers/, validation/, autofix/, reporting/, monitoring/, escalation/, redeploy/, analysis/, compliance/. Metamorphosis subdir: SelfProposalEngine.ts, MetamorphosisEngine.ts, index.ts (3 files, 473 LOC).

**Role:** Post-process pipeline (generalized from old god-object), onPhase/onProposal hooks, activity.log → SelfProposalEngine (metamorphosis proposals governed at ≥0.7 threshold), apply under governance.

**Status:** v3 addition. Core to "system evolves itself." Metamorphosis is a sub-component, not a peer.

---

## Surface & Integration

### 10. Integrations (`src/integrations/` — 32 files)

**Files:** grok/ (hooks/pre-tool-use.ts), hermes-agent/ (bridge.mjs + .ts), openclaw/, plugins/, governance/, base/, cross-language-bridge.ts

**Role:** 4 first-class platforms (Grok, Hermes, OpenCode, OpenClaw). Consumer verification gate. Hooks, bridges, plugin install.

**Status:** Proven via isolated tmp + published npm i. Core to "works in the wild."

### 11. CLI (`src/cli/` — 21 files)

**Files:** index.ts, commands/ (19 files), server.ts

**Role:** 0xray bin (govern umbrella per v3, status, plugin install, etc.).

**Status:** Surface collapsed but still has legacy command files.

---

## Supporting Infrastructure

### 12. Supporting Subsystems (cross-cutting, non-core)

| Directory | Files | Role |
|-----------|-------|------|
| `src/session/` | 4 | Session lifecycle manager, cleanup, state monitoring |
| `src/state/` | 4 | State manager, context providers |
| `src/analytics/` | 9 | Pattern learning engine, predictive analytics, routing analysis |
| `src/monitoring/` | 4 | Advanced profiler, memory monitor, watchdog |
| `src/metrics/` | 4 | Agent metrics collection |
| `src/security/` | 4 | Security hardener, headers, comprehensive audit |
| `src/validation/` | 7 | Agent config, estimation, orchestration flow, session validators |
| `src/execution/` | 2 | Proposal applier, opencode CLI invoker |
| `src/reporting/` | 5 | Framework reporting system, log parser, metrics |
| `src/performance/` | 2 | Budget enforcer, regression tester |
| `src/utils/` | 11 | Codex parser, command runner, language detector, etc. |
| `src/types/` | 2 | Global type declarations |
| `src/infrastructure/` | 2 | IaC validator, schemas |
| `src/architect/` | 2 | Architectural integrity tools |
| `src/skills/` | 45+ dirs | Skill definitions (separate from mcps knowledge-skills) |

**Role:** Observability, state, execution, utils, types. framework-logger is the only sacred dependency.

**Status:** Mostly tight/cross-cutting. Review individually for duplication/v3 alignment.

---

## Review Process

**Order** (dependency-ordered, logical flow from foundation outward):

1. **Core** — foundation: boot, config, logging, kernel patterns, model router
2. **Nucleus** — kernel, plugin registry, governance HTTP
3. **Governance / Dynamo** — codex policy, governance service, metamorphosis scoring
4. **MCP Federation** — protocol, connection, tools, knowledge-skills, servers
5. **Inference** — inference cycles, tuning
6. **Orchestration + Delegation** — multi-agent, thinDispatch, complexity routing
7. **Processors** — 24 implementation processors (legacy review candidate)
8. **Postprocessor (incl. Metamorphosis)** — post-processing pipeline, self-evolution
9. **Enforcement / Codex** — rule enforcer, validators
10. **Integrations** — Hermes, Grok, OpenCode, OpenClaw
11. **CLI** — 19 commands
12. **Supporting** — session, state, analytics, monitoring, metrics, security, validation, utils, types, skills, execution, reporting, performance, infrastructure, architect

**Criteria (each review):**
- Usefulness to mission (governance kernel + self-evolution + MCP standard + consumer reliability)
- Already tight/optimized vs. duplication/legacy parallel
- Runtime cost (processes, state files)
- v3 alignment (nucleus primary, plugins dynamic, surfaces thin where possible)
- Purge potential (delete, extract, deprecate wrapper, centralize) or "leave as core is the codebase"
- Dependencies / blast radius
- Net effect on "thinner" (real deletion vs. refactor/relocation)
