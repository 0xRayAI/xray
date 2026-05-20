# 0xRay v2 — Phase 0: Deep Mapping & Boundary Definition Workbook

**Status:** Living Master Blueprint (Deep Iterative — Post Multiple Discovery Passes) (Historical)  
**Date:** 2026-05-19  
**Version:** Deep Iterative Build (Incorporating Full Researcher Pass on Agents, Orchestrator Rift, Enforcement, Delegation/Processors)  
**Purpose:** This is the comprehensive, self-contained blueprint for the entire 0xRay v2 refactoring. It is designed to survive severe context compaction so that future agents (or you) can pick up any task with full context.

> **2026-05-20 Execution Layer Update**  
> This document remains excellent for detailed area mapping. However, for execution policy, authorized work, branching, and the authoritative current-state source of truth, use the 2026-05-20 set:  
> Start with `0xray-v2-documentation-index-2026-05-20.md` → Master Playbook → Phase 1 Execution Plan + Protected Paths + the full `0xray-v2-researcher-full-codebase-mapping-2026-05-20.md` (raw exhaustive pass).  
> All active work must follow the 2026-05-20 execution layer documents.

**Core Thesis (Read This First After Compaction):**  
0xRay itself *is* the orchestrator.  
It is being re-architected around three clean subsystems:
- **Inference** (Sensing & Proposal Generation)
- **External Governance** (Decision Layer & Single Source of Truth)
- **Autonomous Engine** (Governed Execution)

The current codebase contains two overlapping paradigms (legacy agent/orchestrator-centric vs. emerging MCP/skill + governance surface). This rift is the primary source of duplication, scattering, and technical debt. v2 will retire or absorb the legacy while making the MCP/skill layer the canonical implementation under the three subsystems.

**How to Use This Document (Compaction Survival Guide):**  
- Start with Section 2 (Definitions) and Section 3 (High-Level Maps).
- Use Section 4 (Detailed Area Mapping) as the lookup table — search for any directory/file.
- Always cross-reference Section 5 (Dependencies & Risks) and Section 6 (Grok CLI Reality).
- For task execution, use the task templates in Section 8.
- Update this document as you discover more.

---

## 1. The Three Subsystems — Precise Definitions for v2

**Inference (Sensing & Proposal Generation)**  
Job: Observe, detect patterns/problems/opportunities, generate high-quality proposals with evidence.  
Must Own: Pattern detection/accumulation, session/log/state/reflection analysis, proposal synthesis.  
Must Never Own: Final decisions on work, execution of changes, runtime enforcement.

**External Governance (Decision Layer & Single Source of Truth)**  
Job: Be the non-bypassable conscience for all significant decisions.  
Must Own: Structured multi-skill + Dynamo review, weighted/auditable decisions, policy/rule definition, governance of execution strategy.  
Must Never Own: Proposal generation, direct execution.

**Autonomous Engine (Governed Execution)**  
Job: Take approved work and deliver it safely through planning, orchestration, tool use, verification, and feedback.  
Must Own: Planning/decomposition, orchestration of MCPs/skills/tools, safe execution + rollback, delivery (PRs etc.), feedback loops to Inference.  
Must Never Own: Deciding whether work should happen, creating original proposals.

---

## 2. High-Level Structural Mapping (Current Reality vs Target)

**Before (Current — Post Researcher Discovery)**

```text
src/
├── agents/                              [Legacy Agent Era - Mostly Shells/Facades]
│   └── 25+ agent implementations (mostly thin wrappers delegating to skills)
├── opencode/agents/                     [Legacy Declarative Prompts - Valuable]
│   └── 42 *.yml files (OpenCode surface only)
├── orchestrator/                        [Major Rift - Old Multi-Agent Coordination]
│   └── enhanced-multi-agent-orchestrator.ts + supporting files (still heavily wired)
├── mcps/
│   ├── orchestrator/                    [Emerging Core of Autonomous Engine]
│   │   └── server + task-handler + execution-planner (active in Grok CLI)
│   ├── governance.server.ts             [Emerging Core of External Governance]
│   ├── enforcer-tools.server.ts
│   └── knowledge-skills/                [Real Active Capability Engines - 26 skills]
├── inference/                           [Partial Inference Subsystem]
├── governance/                          [Partial External Governance]
├── enforcement/                         [Scattered Guardrails - In Transition]
│   └── core/ + loaders/ + validators/ (modularized but still coupled)
├── processors/                          [Execution Machinery - Mostly Engine but Scattered]
│   └── 25+ implementations
├── postprocessor/                       [Execution + Healing - Mostly Engine but Scattered]
├── delegation/                          [Highly Scattered - Crosses All Three]
│   └── task routing + voting + complexity + analytics
├── analytics/                           [Mostly Inference - Scattered]
├── core/                                [Foundational - Cross-Cutting]
└── integrations/ + cli/ + opencode/     [Surface Layers - Mixed Ownership]
```

**After (Target v2)**

```text
0xRay (The Orchestrator)

          ┌──────────────┬──────────────┬──────────────┐
          │              │              │              │
          ▼              ▼              ▼              │
   Inference        External        Autonomous        │
   (Sensing)        Governance      Engine            │
   - Proposals      (SSOT)          (Execution)       │
                     - Decisions                      │
                                      - Governed Work │
          └──────────────┴──────────────┴──────────────┘
                                      │
                            Unified MCP/Skill Layer
                            + Feedback Loops
```

---

## 3. Detailed Mapping by Major Area (After Multiple Deep Discovery Passes)

### 3.1 Agents Layer (`src/agents/` + `src/opencode/agents/`)

**Verdict:** Mostly Legacy (Autonomous Engine + Governance), with unification required.

**`src/agents/` (26 files):**  
Mostly shells/facades. Each exports `AgentConfig` (name, system prompt, tools including `invoke-skill`, capabilities). Real logic lives in corresponding knowledge-skills MCPs.  

Examples (from exhaustive researcher pass):
- `refactorer.ts` → Shell for `refactoring-strategies.server.ts` → **Autonomous Engine**
- `code-reviewer.ts`, `security-auditor.ts` → Shells for review skills → **External Governance** (primary) + Engine
- `researcher.ts`, `project-analysis` related → **Inference**
- `backend-engineer.ts` etc. → **Autonomous Engine**

**`src/opencode/agents/` (42 *.yml):**  
Declarative prompt/persona definitions. Explicit `skill:` mapping to real MCP skills. Battle-tested for OpenCode.  

Examples:
- `refactorer.yml` (skill: refactoring-strategies) → **Autonomous Engine**
- `code-reviewer.yml` → **External Governance**
- `architect.yml`, `strategist.yml` → **Inference** + Governance

**Usage in Grok CLI:** Almost never direct. Grok path is MCP registration only. These are vestigial in our primary context but valuable for OpenCode surface.

**v2 Recommendation:**  
Unify both surfaces into a single MCP/skill + declarative persona registry. Most `src/agents/*.ts` become thin adapters or are retired. OpenCode YAMLs become MCP-exposed personas.

**Risk:** High if cut without unification plan — dual representations will cause drift.

### 3.2 Orchestrator Rift (`src/orchestrator/` vs `src/mcps/orchestrator/`)

**Top-Level `src/orchestrator/` (Legacy Heavy):**  
- `enhanced-multi-agent-orchestrator.ts` + interfaces
- `multi-agent-orchestration-coordinator.ts` (central workflow logic)
- `orchestrator.ts` (StringRayOrchestrator — still exported from root)
- `agent-spawn-governor.ts`
- `intelligent-commit-batcher.ts`, `universal-librarian-consultation.ts`, etc.

Still actively imported by:
- `inference/inference-cycle.ts` (agentSpawnGovernor)
- `validation/orchestration-flow-validator.ts`
- `processors/implementations/commit-batcher-processor.ts`
- `postprocessor/PostProcessor.ts`
- `delegation/` and tests

**MCP `src/mcps/orchestrator/` (Modern Active):**  
- `server.ts` (OrchestratorServer — thin adapter)
- `handlers/` (task, complexity, status)
- `execution/execution-planner.ts`
- Imports the legacy `MultiAgentOrchestrationCoordinator` in places

**Active vs Vestigial:**  
- MCP version = Primary active path in Grok CLI (registered via `grok mcp add`).  
- Top-level = Legacy but still wired (critical dependency risk).

**v2 Ownership:**  
All real orchestration → **Autonomous Engine** (via `src/mcps/orchestrator/`).  
Top-level logic migrated or deprecated. Orchestrator concept evolves into "embryonic Governance CLI" support.

**Risk:** Extremely High. Cutting without full dependency map will break proposal → execution flow.

### 3.3 Enforcement Layer (`src/enforcement/` + MCP surface)

**Structure (after multiple internal phases):**  
- `core/`: rule-registry, rule-executor, rule-hierarchy, violation-fixer (real logic)
- `validators/`: base + domain (architecture, code-quality, security, testing)
- `loaders/`: base, codex, agent-triage, processor, loader-orchestrator
- Facades: `rule-enforcer.ts` (now pure facade), `enforcer-tools.ts`
- MCP: `mcps/enforcer-tools.server.ts`

**Current Coupling:** Still pulls from old paths (PostProcessor, orchestrator, processor-pipeline).

**v2 Ownership:**  
- Policy/rules/Codex → **External Governance** (SSOT)
- Runtime enforcement + fixing → **Autonomous Engine**
- MCP surface → Shared

**Risk:** Medium-High. Modularization is good but coupling remains.

### 3.4 Delegation, Processors, Postprocessor (Highly Scattered)

**`src/delegation/`:** Task routing + voting + complexity + analytics.  
Split needed: Complexity/sensing → Inference; Voting/decisions → External Governance; Routing/execution → Autonomous Engine.

**`src/processors/` (25+ impls) + `src/postprocessor/`:** Mostly execution steps (autofix, validation, redeploy, monitoring, etc.).  
Strong coupling to enforcement and legacy orchestrator.

**v2 Ownership:** Predominantly **Autonomous Engine**, with analysis pieces reclaimed by Inference and policy hooks by Governance.

**Scattered Fragments (High Risk for Missing in Refactor):**  
- Many processors still import legacy orchestrator/enforcement.  
- Analytics subfolders cross all three.  
- `src/core/` (boot-orchestrator, features, logger, context) is pervasive cross-cutting.  
- `src/integrations/` (grok, hermes, openclaw) need re-mapping per subsystem.  
- Tests mirror the entire structure.

---

## 4. Grok CLI Reality (The Most Important Filter)

When running via Grok CLI:
- Primary path = MCP registration (governance + skill-invocation + enforcer-tools).
- Real engines = knowledge-skills + MCP orchestrator.
- Old `src/agents/` and top-level orchestrator = mostly vestigial (indirect only).

This must drive prioritization: Strengthen MCP paths first. Legacy agent code can be lower priority for early phases.

---

## 5. Cross-Subsystem Dependencies & Risk Register (High-Level)

**Major Dangerous Couplings:**
- Inference → legacy orchestrator (agent spawning)
- MCP orchestrator → legacy orchestrator (coordinator)
- Enforcement → legacy paths (PostProcessor, agents)
- Processors/delegation → multiple subsystems without contracts

**Risk Register (Top Items):**
- Orchestrator rift cutover breaks proposal-to-execution flow
- Dual agent surfaces (src/agents + opencode/agents) cause drift
- Scattered enforcement/processor logic leads to missed guardrails
- Cross-cutting core/ integrations not re-mapped

---

## 6. Phased Refactoring Plan (Across All Phases — High-Level)

**Phase 0: Deep Mapping & Boundary Definition (Current)**  
- Complete this workbook to full depth (all major areas + cross dependencies).  
- Lock subsystem ownership contracts.  
- Produce per-area migration plans and task templates.

**Phase 1: Stabilize Inference + External Governance**  
- Strengthen Inference (reflections, state, analytics reclamation).  
- Make External Governance the undisputed SSOT (move policy/enforcement policy here).  
- Freeze legacy agent development.

**Phase 2: Birth the Autonomous Engine**  
- Consolidate orchestration, processors, postprocessor, execution enforcement under Engine.  
- Make MCP orchestrator the canonical execution surface.  
- Reclaim knowledge-skills under Engine (with clear Governance/Inference slices).

**Phase 3: Major Legacy Cleanup**  
- Deprecate/absorb `src/agents/` (unify with opencode/agents into MCP personas).  
- Remove duplicated orchestration logic.  
- Clean delegation scattering.

**Phase 4: Close Feedback Loops & Full Integration**  
- Implement governed Engine → Inference feedback.  
- Allow Governance to shape execution strategy.

**Phase 5: Legacy Retirement & v2 Cutover**  
- Large-scale deprecation of old surfaces.  
- Final integration, testing, and operational maturity.

Each phase will have dedicated sub-documents with task cards, before/after trees, and subagent handoff templates (to be added in next iterations).

---

## 7. How to Use This Document (For Subagents & Future Compacted Agents)

1. Read Sections 1-3 for vision and current rift.
2. Locate your task area in Section 3 tables.
3. Read the detailed subsection for that area + relevant risks.
4. Follow the phase guidance.
5. Update this document with findings (this is the single source of truth).

This document is deliberately written to be the single artifact that allows a subagent to pick up a task with minimal prior context.

---

**This is the core blueprint for 0xRay v2.**

It will continue to be expanded with file-level detail, full per-skill tables, dependency graphs, and per-phase task breakdowns until it contains the depth required for a safe, complete, massive refactoring.

*Living document. Updated across all phases.*