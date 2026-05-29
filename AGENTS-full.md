# xray Agents — Complete Technical Reference

**Version**: 2.0.0  
**Last Updated**: 2026-05-28  
**Architecture**: Pure v2 three-subsystem model (Inference + External Governance via Dynamo Solar SSOT + Autonomous Engine via thinDispatch 7-flow in MCP orchestrator)  
**Status**: Pure v2 three-subsystem launch. YML SSOT only. No manual setup.

---

## 1. What is xray?

xray provides intelligent multi-agent orchestration with automatic delegation and Codex compliance validation under the pure v2 three-subsystem model (Inference + External Governance via Dynamo + Autonomous Engine via thinDispatch 7-flow in MCP orchestrator). Agents operate via OpenCode plugin injection + .opencode/agents/*.yml YML surfaces — no manual setup needed. Pure xray three-subsystem only.

## 2. Three-Subsystem Model (SSOT)

xray operates exclusively under the pure three-subsystem model.

### Inference Subsystem
Senses context, proposes work, runs deliberation via skills. Conditions per-proc preferences and surfaces for governance consumption.

### External Governance (Dynamo Solar SSOT)
Required, non-bypassable conscience. Based on real sunlight physics (NOAA solar data), neural processing, and temporal first principles. All critical decisions and proposals must pass through Dynamo. Single Source of Truth for governance verdicts. Internal deliberation (via skills) precedes the external filter.

### Autonomous Engine (thinDispatch 7-Flow)
Execution only of governed work. Primary surface is the MCP orchestrator (`src/mcps/orchestrator/execution/execution-planner.ts`). Implements the thinDispatch 7-flow SSOT with `dispatchStats`, `getExecutionDispatchSnapshot`, `perProcPreferredForTheseFlows`, and governance bridges.

**thinDispatch 7-Flows** (canonical SSOT funnel):
1. orchestrator-core
2. delegation-routing
3. processor-pipeline
4. postprocessor-healing-loop
5. security-orchestration-layer
6. proposal-application
7. opencode-invocation

Central aggregation, Inference conditioning, and Dynamo verdicts drive per-flow routing preferences. Engine executes; Governance decides.

## 3. Primary Surfaces

- **YML SSOT**: `.opencode/agents/{agent}.yml` — declarative definitions. Injected via OpenCode plugin. Auto-discovered at startup. Zero manual setup or registration code required.
- **MCP Orchestrator**: thinDispatch 7-flow execution planner (SSOT for dispatch, snapshots, per-proc prefs, ownership).
- **Skills Registry**: 4 one-package skills (orchestrator, researcher, code-reviewer, security-auditor) + 40+ framework skills from curated sources.
- **Dynamo Governance MCP**: External Solar SSOT verdicts for all proposals.

## 4. Agent Catalog (27 Total)

| Agent                      | Mode      | Description                              |
|----------------------------|-----------|------------------------------------------|
| enforcer                   | primary   | Codex compliance & error prevention      |
| orchestrator               | subagent  | Multi-agent workflow coordination        |
| architect                  | subagent  | System design & technical decisions      |
| testing-lead               | subagent  | Testing strategy                         |
| bug-triage-specialist      | subagent  | Debugging & error investigation          |
| code-reviewer              | subagent  | Code quality assessment                  |
| security-auditor           | subagent  | Vulnerability detection                  |
| refactorer                 | subagent  | Technical debt elimination               |
| researcher                 | subagent  | Codebase exploration                     |
| strategist                 | subagent  | Strategic planning                       |
| storyteller                | subagent  | Narrative deep reflections               |
| log-monitor                | subagent  | Performance monitoring                   |
| frontend-engineer          | subagent  | React, Vue, Angular development          |
| backend-engineer           | subagent  | Node.js, Python, Go APIs                 |
| mobile-developer           | subagent  | iOS, Android, React Native               |
| database-engineer          | subagent  | Schema design, migrations                |
| devops-engineer            | subagent  | CI/CD, containers, infrastructure        |
| performance-engineer       | subagent  | Optimization, profiling                  |
| seo-consultant             | subagent  | SEO optimization                         |
| content-creator            | subagent  | Content optimization                     |
| growth-strategist          | subagent  | Marketing strategy                       |
| tech-writer                | subagent  | Technical documentation                  |
| multimodal-looker          | subagent  | Image/video analysis                     |
| code-analyzer              | subagent  | Code analysis                            |
| documentation-writer       | subagent  | Documentation creation                   |
| testing-strategy           | subagent  | Test planning                            |
| framework-compliance-audit | subagent  | Compliance validation                    |

Additional agents registered declaratively via `.opencode/agents/*.yml` + skill backing.

## 5. Core Agents Reference

### @enforcer (Primary)
**Role**: Central Codex compliance & error prevention. First responder for all governance and validation.

**Invocation**:
```bash
@enforcer analyze this code for codex compliance
@enforcer perform full codex audit of src/
@enforcer check type safety and no 'any' usage
```

**Capabilities**: Real-time enforcement of the 60-term Universal Development Codex, violation reporting, automated delegation for remediation, Dynamo verdict integration.

### @orchestrator
**Role**: Enterprise multi-agent workflow coordination and consensus. Only surface authorized for subagent spawning.

**Invocation**:
```bash
@orchestrator implement complete user authentication with tests, review, and security audit
@orchestrator coordinate full codebase modernization
```

**Capabilities**: Parallel execution, conflict resolution (consensus/vote), result synthesis, complex workflow management under thinDispatch.

### @architect
**Role**: System design, API architecture, and high-level technical decisions.

**Invocation**:
```bash
@architect design REST API for user management with database schema
@architect review microservices boundaries and recommend patterns
```

**Capabilities**: Architecture reviews, design pattern selection, technical debt assessment, fit-for-purpose system design.

### @code-reviewer
**Role**: Comprehensive code quality assessment and standards enforcement.

**Invocation**:
```bash
@code-reviewer review PR #123
@code-reviewer perform full maintainability and style audit of src/
```

**Capabilities**: Quality scoring, best-practice validation, security smell detection, style compliance.

### @security-auditor
**Role**: Vulnerability detection, dependency audit, and compliance validation.

**Invocation**:
```bash
@security-auditor perform full security audit
@security-auditor scan for secrets and OWASP issues in dependencies
```

**Capabilities**: OWASP Top 10, secrets detection, PCI-DSS/GDPR/SOC2 guidance, remediation plans. Critical findings gate commits via Dynamo.

### @refactorer
**Role**: Technical debt elimination, modernization, and clean code consolidation.

**Invocation**:
```bash
@refactorer eliminate duplication and modernize legacy module
@refactorer apply DRY + SOLID to payment service
```

**Capabilities**: Refactoring strategies, pattern extraction, performance-oriented rewrites, YAGNI enforcement.

### @testing-lead
**Role**: Test strategy, coverage targets (>85%), and automation frameworks.

**Invocation**:
```bash
@testing-lead design test strategy and implement missing unit/integration tests
@testing-lead analyze coverage gaps and recommend E2E additions
```

**Capabilities**: Strategy design, coverage analysis, Jest/Playwright/etc setup, regression prevention.

### @bug-triage-specialist
**Role**: Root cause analysis, stack trace diagnosis, and minimal surgical fixes.

**Invocation**:
```bash
@bug-triage-specialist investigate auth failure in production logs
@bug-triage-specialist identify and fix race condition in async pipeline
```

**Capabilities**: Log/trace analysis, memory leak/race detection, targeted remediation.

### @researcher
**Role**: Codebase exploration, implementation discovery, and documentation generation.

**Invocation**:
```bash
@researcher find all authentication patterns and map dependencies
@researcher generate API surface documentation from src/
```

**Capabilities**: Pattern mining, architecture mapping, knowledge synthesis. Solo operation (no conflict resolution).

## 6. YML Agent Declaration (SSOT)

Agents are defined declaratively. No code changes or manual registration.

Example (`.opencode/agents/researcher.yml`):
```yaml
name: researcher
skill: researcher
description: "researcher specialist"
version: "1.0.0"
mode: subagent

capabilities:
  - domain_specialization

quality:
  test_coverage: recommended
  type_safety: strict
```

Core skills (orchestrator, researcher, code-reviewer, security-auditor) are one-package and always available. Custom agents added by placing YML + optional backing skill.

Discovery priority: YML surfaces first (static, fast), then dynamic MCP tool listing.

## 7. Routing via thinDispatch

The MCP orchestrator routes every task:

- **Simple (≤15)**: Direct single agent invocation.
- **Moderate (≤25)**: Single agent with tool access.
- **Complex (≤50)**: Orchestrator-led multi-agent team.
- **Enterprise (>50)**: Full coordination with governance checkpoints.

All flows emit `dispatchStats` and snapshots for Inference + Dynamo consumption. `perProcPreferredForTheseFlows` surfaces drive routing preferences.

## 8. Governance & Codex

The 60-term Universal Development Codex is enforced exclusively through Dynamo (External Governance SSOT). 

Flow:
1. Proposal generated (Inference / agent work).
2. Internal deliberation via skill MCPs (code-review, security-audit, researcher).
3. Mandatory Dynamo Solar verdict (external filter).
4. Governed execution only via thinDispatch (Engine).

See `docs/architecture/governance-model.md` for full details. No bypass paths exist.

## 9. Quick Start & CLI

```bash
# Install and activate (OpenCode plugin + YML surfaces)
npx xray install

# Verify three-subsystem health
npx xray status
npx xray health
npx xray capabilities
npx xray validate

# Agent invocations (YML + MCP surfaces)
@enforcer analyze src/ for full codex compliance
@orchestrator implement feature X with tests + security review
@researcher map all database access patterns
```

## 10. File Organization & Logging Discipline

**CRITICAL**: Save generated artifacts only to designated locations. Never root.

| File Type              | Save To                              | Example                                      |
|------------------------|--------------------------------------|----------------------------------------------|
| Reflections            | `docs/reflections/` or `docs/reflections/deep/` | `docs/reflections/deep/my-journey-2026-05-28.md` |
| Logs                   | `logs/`                              | `logs/framework/activity.log`                |
| Scripts                | `scripts/` or `scripts/bash/`        | `scripts/bash/validate-7flow.sh`             |
| Tests                  | `src/__tests__/`                     | `src/__tests__/unit/thin-dispatch.test.ts`   |
| Source                 | `src/`                               | `src/mcps/orchestrator/execution-planner.ts` |
| Config                 | `config/` or `.opencode/xray/`      | `.opencode/xray/features.json`              |
| Agent Definitions (SSOT) | `.opencode/agents/`                | `.opencode/agents/my-agent.yml`              |
| General Docs           | `docs/`                              | `docs/architecture/governance-model.md`      |

**Logging**: Framework only. Never `console.log` / `console.warn` / `console.error`. Use `frameworkLogger.log(module, event, level, payload)`.

## 11. Configuration Reference

- **Agents**: `.opencode/agents/*.yml` (declarative SSOT)
- **Framework Core**: `.opencode/xray/{codex.json, features.json, config.json}`
- **MCP Orchestrator**: `src/mcps/orchestrator/` (planner is runtime SSOT)
- **Dynamo**: Connected governance MCP (Solar SSOT signals)

## 12. Verification & Inventories (Authoritative)

Cross-reference these inventories:

- `docs/architecture/PIPELINE_INVENTORY.md` — 7 major pipelines, thinDispatch 7-flow, per-proc, ownership.
- `docs/testing/TEST_INVENTORY.md` — CJS deletion-protection, thin-dispatch-funnel, processor pipeline, FORCE harnesses.
- `docs/agents/ADDING_AGENTS.md` — Exact surfaces and checklist for extending the YML + MCP system.
- `docs/architecture/governance-model.md` — Dynamo as mandatory External Governance.

Run full facet paces and `npm run test:pipelines` to validate live surfaces.

---

**Pure v2 three-subsystem. YML SSOT. Dynamo external governance. thinDispatch 7-flow MCP Engine. Zero bloat. Complete.**

*xray (technical) under the xray brand. This document is the authoritative technical reference for the clean v2 launch.*
