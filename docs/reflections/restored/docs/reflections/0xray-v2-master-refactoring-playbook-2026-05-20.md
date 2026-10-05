# 0xRay v2 — Master Refactoring Playbook
**Date:** 2026-05-20  
**Status:** Authoritative Master Blueprint (Compaction-Survivable)  
**Role:** Architect + Principal Engineer (self-contained execution constitution)  
**Primary Audience:** Any future agent or human who must pick up the v2 refactoring after context loss.

---

## Compaction Survival Section (Read This First After Any Context Reset)

**If you have almost no prior context, read these sections in order:**

1. This header + "The Immutable Core Thesis" (below)
2. "Document Map & How to Use the Supporting Artifacts"
3. "5-Phase Roadmap with Entry/Exit Criteria"
4. "Current State Reality (Condensed from Exhaustive Researcher Pass)"
5. "Branching, CI & Work Management Policy"

Everything else is detail you can load on demand from the referenced raw mapping and phase plans.

**Core Source of Truth Files (all under `docs/reflections/`):**
- This playbook (navigation + policy + high-level execution)
- `0xray-v2-researcher-full-codebase-mapping-2026-05-20.md` (raw exhaustive current-state ownership tables, inventories, risks — 38.5 KB of ground truth)
- `0xray-v2-phase-1-execution-plan-2026-05-20.md` (tactical first 2–4 weeks)
- `0xray-v2-migration-and-cutover-strategy-2026-05-20.md`
- `0xray-v2-protected-paths-and-validation-contract-2026-05-20.md`
- `0xray-v2-refactor-governance-protocol-2026-05-20.md` (when it exists)

The five 2026-05-19 documents (`thesis`, `workbook`, `blueprint`, `active-surface-analysis`, `vision`) are historical context. Do not treat them as more current than the 2026-05-20 researcher mapping.

**Golden Rule After Compaction:** Never start coding changes until you have re-read the Protected Paths contract and the current Phase Execution Plan. The live Grok CLI / MCP surface must remain green at every commit.

---

## The Immutable Core Thesis (Never Violate)

**0xRay *is* the orchestrator.**

It is being deliberately re-architected into three clean, interdependent subsystems with strict boundaries:

### 1. Inference (Sensing & Proposal Generation)
**Job:** Observe reality (logs, sessions, state, reflections, external signals, pattern engines), detect problems/opportunities, and generate high-quality, evidence-backed proposals.

**Must Own:** Pattern detection/accumulation, session/log/state/reflection ingestion & synthesis, proposal creation with confidence/evidence.

**Must NEVER Own:** Final decision on whether work happens, direct execution of changes, runtime enforcement.

### 2. External Governance (Decision Layer & Single Source of Truth)
**Job:** Be the non-bypassable conscience. Every significant decision (including "how should this be executed?") passes through structured multi-skill review + mandatory Dynamo Solar integration, producing weighted, auditable decisions.

**Must Own:** Policy, Codex, rules, review orchestration, auditable decisions, execution strategy governance.

**Must NEVER Own:** Generating original proposals, performing execution.

### 3. Autonomous Engine (Governed Execution)
**Job:** Receive only work that has passed Governance. Plan, decompose, orchestrate MCPs/skills/tools, execute safely with verification/rollback, deliver (PRs, integrations), and send structured feedback to Inference.

**Must Own:** Planning, orchestration (canonical MCP orchestrator), safe execution, delivery, feedback loops.

**Must NEVER Own:** Deciding "should we do this work?", creating the original proposals.

**Legacy v1 Paradigm (to be retired or absorbed):** Agent-centric shells (`src/agents/`, top-level `src/orchestrator/`, direct spawning). These are increasingly vestigial in the primary Grok CLI usage path.

**Emerging v2 Paradigm (primary active surface):** MCP + skill-first (governance.server.ts + knowledge-skills + orchestrator MCP + enforcer-tools). This is where real work happens today in the Grok CLI.

---

## Current State Reality (Condensed from 2026-05-20 Exhaustive Researcher Pass)

**Coverage Achieved:** 100% src/ top-level directories (22+), ~450+ files conceptually mapped, 100% MCP servers (including ~30 knowledge-skills), all three declarative agent surfaces, .opencode/ full tree, skills/ (src + .opencode mirrors), runtime MCP connections (Dynamo 20 tools, grok_com_github 42, strray-governance 2, strray-skills 13), tests (119 files mirroring structure).

**Key New Precision Findings (not fully visible in May 19 synthesis):**
- The orchestrator rift is **live in the active MCP path**: `src/mcps/orchestrator/server.ts` still directly imports `MultiAgentOrchestrationCoordinator` from the legacy top-level `src/orchestrator/`.
- Three distinct yml agent surfaces exist (`root/agents/` ~28 files with archive/, `src/opencode/agents/` 42, `.opencode/agents/` 42) — major drift/dupe risk.
- Skills duplication: `src/skills/` (authoritative SKILL.md + registry) vs `.opencode/skills/` (installed mirror).
- Partial MCP registration in Grok CLI path: `grok-cli.ts` only registers governance + skills; full set (orchestrator, enforcer-tools, etc.) is incomplete or via other paths.
- Policy/Codex surfaces are scattered across enforcement/loaders, core/codex-*, opencode/, .opencode/strray/, enforcement/validators.
- Inference still contains significant execution/apply logic (inference-cycle.ts) — boundary violation.
- Many processors, postprocessor, delegation, and core components still wire directly to legacy orchestrator/enforcement/agents.

**High-Level Ownership (from researcher tables):**
- **Inference (primary):** `src/inference/` (needs purification), `src/analytics/`, parts of delegation (complexity/sensing), session/state as data sources, researcher + project-analysis + strategist skills.
- **External Governance (primary):** `src/mcps/governance.server.ts` + `src/governance/` + `integrations/governance/` (Dynamo), enforcement policy loaders/validators, review-oriented skills (code-review, security-audit, testing-strategy, framework-compliance-audit), unified Codex surfaces.
- **Autonomous Engine (primary):** `src/mcps/orchestrator/` (must become canonical — remove legacy imports), all knowledge-skills execution engines, `src/processors/` + `src/postprocessor/`, execution parts of delegation/routing, enforcer-tools runtime, security hardener/scanner (execution), cli/install commands, most of security/monitoring/reporting.
- **Legacy / High Vestigial:** `src/agents/` (26 ts shells), `src/orchestrator/` (10 files, heavy legacy), root/agents/ yml, parts of core/ (boot-orchestrator copies, agent-spawn-gate), many processor/postprocessor imports.

**Overall Risk Posture:** High. The live Grok CLI surface depends on the emerging MCP layer while large amounts of legacy code are still wired into critical paths. Any cut must be surgical.

Full raw tables, exact file lists, and per-area rationale live in the 2026-05-20 researcher mapping. Read that file for any detailed ownership question.

---

## 5-Phase Roadmap with Entry / Exit Criteria

### Phase 0 — Deep Mapping & Boundary Definition (COMPLETE — 2026-05-19/20)
**Entry:** Recognition that the architectural rift was blocking safe progress.  
**Exit Criteria (all met):**
- 5 vision/thesis documents + active-surface analysis (May 19)
- Exhaustive raw codebase mapping with 100% surface coverage + quantified gaps (May 20 researcher)
- Clear Must Own / Never Own boundaries documented and repeated
- This Master Playbook + supporting execution docs created

**Artifacts:** The 6 documents listed in the Compaction Survival section.

### Phase 1 — Stabilize Core Subsystems + First Safe Slices (Next 2–4 Weeks)
**Primary Owner:** Architect + Engineer (with Inference + Governance specialists)  
**Entry Criteria:**
- This playbook + Phase 1 Execution Plan approved
- Protected Paths contract + validation harness in place
- Branch created (long-lived `v2/refactor/three-subsystem` recommended)
- Researcher mapping integrated into working memory

**Exit Criteria (must all be true before Phase 2):**
- Inference layer purified: `inference-cycle.ts` no longer owns apply/execution/spawn (all moved or gated behind Governance)
- External Governance is the undisputed single source for Codex/policy (all loaders point to one place)
- First 2–3 safe slices completed with zero regressions on Grok CLI MCP path (see Phase 1 doc for exact slices)
- Legacy orchestrator import count in active MCP surface reduced by ≥60% with tests
- All changes pass the Protected Paths validation contract on every commit

**Key Risks:** Boundary violations in Inference, partial MCP registration, live rift import in orchestrator server.

**Success Metrics:** See Phase 1 Execution Plan.

### Phase 2 — Birth the Autonomous Engine as First-Class Canonical Layer
**Primary Owner:** Engineer + Orchestrator specialists  
**Entry:** Phase 1 exit criteria met + Governance is stable as SSOT.  
**Exit Criteria:**
- `src/mcps/orchestrator/` is the single source of truth (zero direct imports of legacy `enhanced-multi-agent-orchestrator` or `MultiAgentOrchestrationCoordinator` from active paths)
- Processors + postprocessor + execution delegation fully reclaimed under Engine ownership with clean interfaces
- Knowledge-skills surface reorganized by subsystem (execution skills clearly under Engine)
- All high-risk legacy wiring in processors/postprocessor/delegation removed or explicitly governed
- Grok CLI + MCP registration matrix is complete and canonical (one install path registers the full governed surface)

**Key Work:** Strangler-fig extraction of the orchestrator rift, dual-run period with monitoring, interface contracts.

### Phase 3 — Major Cleanup & Systematic Deprecation of Legacy Surfaces
**Primary Owner:** Refactorer + Enforcer specialists  
**Entry:** Phase 2 exit + Engine is observably the dominant execution path in metrics/logs.  
**Exit Criteria:**
- `src/agents/` (ts) and top-level `src/orchestrator/` marked deprecated in code + docs; only thin adapters remain if any
- Three yml surfaces unified or clearly one is the source of truth with automated drift detection
- Skills duplication resolved (single source + build step)
- Policy/Codex surfaces unified under Governance
- Test suite updated to reflect new ownership (no tests still hitting deprecated paths as primary)

**Key Risk:** OpenCode consumers and non-Grok paths still relying on old surfaces.

### Phase 4 — Full Integration & Feedback Loops + Aside Pattern
**Primary Owner:** Inference + Governance + Storyteller specialists  
**Entry:** Legacy surfaces are mostly retired or isolated.  
**Exit Criteria:**
- Governed feedback loop from Engine → Inference is operational (reflections, state, session, pattern engines feed proposals)
- Governance decisions affect not only "approve/reject" but "recommended execution strategy"
- Aside subcontext pattern is operationalized as a cross-cutting cognitive capability (used by Inference for parallel hypothesis exploration)
- End-to-end v2 mental model can be demonstrated in a single session with full audit trail through all three subsystems

### Phase 5 — Legacy Retirement & v2 Cutover
**Primary Owner:** Architect + Release specialists  
**Entry:** Phase 4 complete + production metrics show v2 paths dominant for >90 days.  
**Exit Criteria:**
- Large portions of old agent/orchestrator surface removed or fully isolated behind compatibility shims
- All consumers (OpenCode, Hermes, OpenClaw, direct) either migrated or explicitly on a deprecated-but-supported path with clear timeline
- Codebase structure visibly reflects the three subsystems (directory layout, import rules, documentation)
- A new agent can read only this playbook + the researcher mapping + Phase 5 exit report and understand the entire system

**Final Success Metric:** The v2 architecture is the default mental model for every developer and agent working in the repository.

---

## Document Map & How to Use the Supporting Artifacts

- **This Master Playbook** — Always read first after compaction. Contains policy, roadmap, navigation, and high-level constraints.
- **Researcher Full Codebase Mapping (2026-05-20)** — The ground-truth current-state document. Open it when you need exact file ownership, import paths, counts, or to answer "where does X live today?"
- **Phase 1 Execution Plan** — The tactical checklist for the immediate next work. Contains concrete safe slices, work-package templates, validation steps, and rollback triggers.
- **Migration & Cutover Strategy** — The "how" document. Read before touching any code that crosses the rift.
- **Protected Paths & Validation Contract** — The red lines. Read before every significant change. Defines what must never regress.
- **Refactor Governance Protocol** — How changes to the system during the refactor are themselves governed (Codex, reviews, Dynamo, etc.).
- **Work Package Templates** (`0xray-v2-work-package-templates-2026-05-20.md`) — Reusable templates every slice must follow.
- `scripts/v2-refactor/` — Validation harness and automation (see README there).

All supporting artifacts are listed in the V2 Documentation Index (`0xray-v2-documentation-index-2026-05-20.md`).

All documents are deliberately repetitive on the core thesis and boundaries so they survive isolation.

---

## Branching, CI & Work Management Policy

**Recommended Branch Model (until Phase 5 cutover):**
- Long-lived branch: `v2/refactor/three-subsystem` (or `refactor/v2-three-subsystem`)
- Short-lived topic branches created from it for individual safe slices
- Never merge directly to `master` from a topic branch — always through the v2 branch + protected CI gates
- Weekly (or per-phase) integration points back to master only after full Protected Paths validation + human sign-off

**CI Requirements on the v2 branch:**
- All existing tests must pass
- New "refactor validation suite" (defined in Protected Paths contract) must pass
- No new console.log / console.error (frameworkLogger only)
- AGENTS.md and file organization rules enforced
- Every commit message must reference the safe slice or work package ID

**Work Package Format (used in all Phase plans):**
Each slice is a self-contained work package with:
- ID (e.g., V2-P1-S01)
- Target subsystem + boundary being enforced
- Files changed (from → to ownership)
- Risks & Protected Paths impact
- Validation steps (must include MCP/Grok CLI regression test)
- Rollback trigger
- Estimated complexity & agent(s) best suited

Future agents must only pick up work packages that have been approved in the current Phase Execution Plan.

---

## First Three Safe Slices (High-Level Preview — Full Detail in Phase 1 Plan)

These are the only changes authorized in early Phase 1. Everything else is blocked until these are green.

**V2-P1-S01 — Purify Inference Cycle (Boundary Enforcement)**
- Move all apply/execution/spawn logic out of `inference-cycle.ts` into Engine or behind a Governance gate.
- Success: `inference-cycle.ts` only reads, detects patterns, and emits proposals. No side effects.

**V2-P1-S02 — Make Governance the Single Codex/Policy Source**
- Consolidate at least 3 scattered codex/policy loaders into one Governance-owned loader.
- Update all call sites.
- Success: Changing the Codex in one place is sufficient and auditable.

**V2-P1-S03 — Remove Live Legacy Import from MCP Orchestrator Server**
- Replace the direct import of `MultiAgentOrchestrationCoordinator` in `src/mcps/orchestrator/server.ts` with a governed interface or migrated logic.
- Dual-run + monitoring period.
- Success: No regression on task planning/execution via Grok CLI MCP path.

No other changes are authorized until these three (and any Phase 1 additions) are complete and validated.

---

## Refactor Governance Rules (High-Level)

During the entire v2 effort:
- Every non-trivial change must pass through External Governance (the same mechanism the system provides to users).
- The Codex applies at full strength — no exceptions for "refactor work."
- All agent work on the v2 branch must be proposed via the normal skill/MCP path where possible.
- The Protected Paths contract is itself governed and can only be changed with explicit multi-skill + Dynamo review.
- Any slice that touches the live MCP registration or governance.server.ts requires an extra "active surface steward" sign-off.

The system must eat its own dogfood while being refactored.

---

## Agent Handoff & Future-Proofing Instructions

Any agent arriving after compaction must:

1. Read the Compaction Survival section of this playbook.
2. Read the three-subsystem thesis (repeated above).
3. Open the 2026-05-20 researcher mapping for current-state truth.
4. Read the current Phase Execution Plan (start with Phase 1 until it declares completion).
5. Read the Protected Paths contract before writing any code.
6. Only work on approved slices from the current phase plan.
7. Log all progress via `frameworkLogger` (module: "v2-refactor", appropriate event).
8. Update this playbook and the phase plan with any new findings or adjustments discovered during execution.
9. Never violate the Must Own / Never Own boundaries — they are the constitution.

If any document is missing or out of date, the agent must first create or update the missing piece before proceeding with code changes.

---

**This document + the 2026-05-20 researcher mapping + the current Phase Execution Plan together form a complete, compaction-survivable execution constitution for the 0xRay v2 refactoring.**

No future agent should ever have to rediscover the rift, the boundaries, or the safe path from scratch.

*Written as Architect + Engineer on 2026-05-20. Updated as the refactoring progresses.*

---

**End of Master Playbook** (all other detail lives in the referenced sibling documents).