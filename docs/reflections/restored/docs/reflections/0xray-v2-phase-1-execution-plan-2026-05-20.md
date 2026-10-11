# 0xRay v2 — Phase 1 Execution Plan
**Date:** 2026-05-20  
**Phase:** 1 — Stabilize Core Subsystems + First Safe Slices  
**Status:** Authoritative Tactical Plan (Compaction-Survivable)  
**Primary Owner:** Architect + Engineer (with support from Inference, Governance, and Enforcer specialists)

---

## Compaction Survival Section (Read First After Context Loss)

If you have limited context:
1. Re-read the 3-subsystem boundaries from the Master Playbook (`0xray-v2-master-refactoring-playbook-2026-05-20.md`)
2. Read the "Entry / Exit Criteria" and "Authorized Work Only" sections below
3. Open the raw researcher mapping (`0xray-v2-researcher-full-codebase-mapping-2026-05-20.md`) for any file ownership question
4. Only work on the slices explicitly listed in this document (V2-P1-S01 through S06). No other changes are authorized in Phase 1.

This document + the Master Playbook + the researcher mapping are sufficient for a new agent to begin safe Phase 1 work.

---

## Phase 1 Purpose & Strategic Intent

Phase 1 is **not** about completing the full v2 refactor.  
It is about **creating a stable, governed foundation** from which the rest of the work can proceed with acceptable risk.

**Primary Objectives:**
- Enforce the core boundaries on the two most violated subsystems (Inference and External Governance)
- Remove the single most dangerous live coupling in the active surface (legacy import inside MCP orchestrator)
- Establish the "Protected Paths" validation harness so every future change can be proven safe
- Complete the Grok CLI MCP registration surface so the primary usage path is fully under v2 control
- Deliver 4–6 small, reversible, fully validated slices that give the team confidence and data

**Non-Objectives (explicitly out of scope for Phase 1):**
- Mass deletion of `src/agents/` or top-level `src/orchestrator/`
- Full skills reorganization or yml unification
- Any change that touches `governance.server.ts` without extra steward review
- Any slice not listed below

---

## Entry Criteria (Must Be True Before Any Phase 1 Code Is Written)

- Master Playbook and this Phase 1 plan have been read and understood by the executing agent(s)
- Long-lived branch `v2/refactor/three-subsystem` exists and all work happens on it (or topic branches from it)
- The raw 2026-05-20 researcher mapping is available and treated as current-state truth
- At least one human or governance-approved steward has signed off on the Protected Paths contract (see companion document)
- Framework is building and all existing tests are green on the v2 branch

---

## Exit Criteria (All Must Be Demonstrably True)

1. Inference boundary enforced: `src/inference/inference-cycle.ts` contains **zero** apply, execution, spawn, or side-effect logic. It only senses and proposes.
2. External Governance is the single source of truth for at least one major policy surface (Codex + at least two loaders point to it exclusively).
3. The live rift import is removed from `src/mcps/orchestrator/server.ts` (no more direct `MultiAgentOrchestrationCoordinator` import from legacy).
4. Grok CLI MCP registration (`grok-cli.ts` + install paths) registers the full governed surface (governance + skills + orchestrator + enforcer-tools at minimum).
5. A reusable "refactor validation harness" exists and passes on every commit to the v2 branch (covers the Protected Paths).
6. Zero regressions on the primary Grok CLI / MCP execution path for the duration of Phase 1 (measured via framework activity logs + targeted MCP regression tests).
7. All six authorized slices (or the final agreed subset) are complete, validated, and documented with before/after ownership in the researcher mapping style.

Only when an agent can prove all seven items with evidence (logs, test output, PR links, updated mapping) is Phase 1 considered complete.

---

## Authorized Work Only — The Six Safe Slices

**No other changes are permitted in Phase 1.**  
Any agent that attempts work outside these slices must first update this plan via Governance and obtain explicit approval.

### V2-P1-S01 — Purify Inference Cycle (Boundary Enforcement — Highest Priority)
**Target Subsystem:** Inference (remove execution ownership)  
**Risk Level:** High (but contained if done carefully)  
**Primary Files:**
- `src/inference/inference-cycle.ts` (main target)
- Any callers that expect it to perform side effects (processors, postprocessor, delegation, core)

**Work Package:**
- Extract all apply/execution/spawn/agent-invoke logic into either:
  - A new Engine-owned module, or
  - A Governance-gated facade that the cycle can call but does not own
- Update `inference-cycle.ts` so its public API is purely: `observe()`, `detectPatterns()`, `generateProposals()`
- Add strong typing / interfaces that make future execution leakage a compile error
- Write or update tests that prove the cycle no longer has side effects

**Validation Requirements:**
- Run full inference-related test suite + any MCP path that exercises inference
- Framework activity log grep for "inference-cycle" shows only sensing/proposal events after change
- No new violations of "Inference Must Never Own execution"

**Rollback Trigger:** Any test regression on inference-related MCP flows or >2 new boundary violations detected by enforcer in the same session.

**Best Suited Agents:** @researcher (for impact analysis), @enforcer (boundary checking), @architect (interface design), @bug-triage-specialist (if regressions appear)

**Estimated Complexity:** Moderate–High (10–18 complexity)

### V2-P1-S02 — Consolidate Codex / Policy Under External Governance (SSOT)
**Target Subsystem:** External Governance  
**Risk Level:** Medium (high blast radius if done wrong)

**Primary Files (minimum set to touch):**
- `src/enforcement/loaders/codex-loader.ts` and related loaders
- `src/core/codex-formatter.ts` + `codex-injector.ts`
- `src/opencode/codex.codex` + `.opencode/strray/codex.json` + `.opencode/enforcer-config.json`
- At least two validator or processor call sites that currently load Codex from multiple places

**Work Package:**
- Create (or designate) a single Governance-owned Codex/Policy service
- Move the authoritative Codex definition under `src/governance/` (or a new `policy/` subdir owned by Governance)
- Update the minimum number of loaders so they all delegate to the new service
- Add a deprecation warning (or hard error in dev) for any direct file reads of old Codex locations
- Update documentation in the researcher mapping style

**Validation Requirements:**
- Changing the Codex in the single Governance location is sufficient for all enforcement paths
- Existing Codex tests + enforcement integration tests pass
- `governance.server.ts` can now answer "give me the current active Codex" for any consumer

**Rollback Trigger:** Any path that previously enforced Codex now silently skips rules.

**Best Suited Agents:** @enforcer, @governance (via MCP), @code-reviewer, @researcher

### V2-P1-S03 — Sever the Live Legacy Import in MCP Orchestrator Server (Rift Removal)
**Target Subsystem:** Autonomous Engine (make MCP orchestrator canonical)  
**Risk Level:** Very High (touches active Grok CLI path)

**Primary Files:**
- `src/mcps/orchestrator/server.ts` (the exact import line)
- `src/orchestrator/multi-agent-orchestration-coordinator.ts` (and related)
- Any handler or execution-planner that uses the legacy coordinator

**Work Package:**
- Replace the direct import with one of:
  - A thin governed interface/adapter that the MCP orchestrator owns
  - Migrated logic (preferred for long-term)
  - Dual-run with feature flag + metrics for at least one full day of usage
- Add explicit logging (frameworkLogger) around the transition point
- Update any tests that were relying on the old import path

**Critical Validation (non-negotiable):**
- Full Grok CLI MCP task execution regression (planning, complexity, execution of at least 3 different skill types)
- No increase in orchestrator-related errors in `logs/framework/activity.log` for 24h after merge
- The MCP orchestrator can still be registered and used via `grok mcp add` without falling back to legacy

**Rollback Trigger:** Any MCP task that previously succeeded now fails or produces different (worse) output, or any increase in "orchestrator rift" warnings.

**Best Suited Agents:** @orchestrator (via MCP), @enforcer, @testing-lead, @bug-triage-specialist

**This is the most dangerous single change in Phase 1. It must be done with extreme care and full dual-run monitoring.**

### V2-P1-S04 — Complete Grok CLI MCP Registration Surface
**Target:** Make the primary usage path fully v2-controlled

**Primary Files:**
- `src/integrations/grok/grok-cli.ts` (or equivalent registration logic)
- CLI install commands (`src/cli/commands/grok-install.ts`, mcp-install, skill-install)
- Any other place that calls `grok mcp add` or equivalent

**Work Package:**
- Ensure a single `npx strray-ai install` or `grok mcp add` command (or documented sequence) registers the full required surface: governance, skills, orchestrator, enforcer-tools, and any other Phase 1 critical MCPs
- Remove or clearly deprecate partial registration paths
- Add a health-check command that verifies all expected MCPs are registered and responsive

**Validation:**
- Fresh Grok CLI environment can run a full governed task (propose → govern → execute) using only the documented install path
- `npx strray-ai status` or equivalent reports the complete v2 surface

**Best Suited Agents:** @devops-engineer, @researcher, @enforcer

### V2-P1-S05 — Establish the Refactor Validation Harness (Protected Paths Foundation)
**Target:** Infrastructure for all future slices

**Work:**
- Create the first version of the "refactor validation contract" (see companion Protected Paths document)
- Implement the minimal automated checks (test selectors, boundary linters, MCP regression suite, frameworkLogger grep rules)
- Place reusable scripts under `scripts/v2-refactor/validation/` (initial scaffolding already exists — see README there)
- Wire the harness into CI on the v2 branch (required step on every push)
- Document the exact command an agent must run before declaring a slice complete

**Validation:** The harness itself passes on a clean v2 branch and fails appropriately when a protected path is violated in a test change.

**Best Suited Agents:** @testing-lead, @enforcer, @architect

**Note:** S05 will turn the existing stubs in `scripts/v2-refactor/validation/` into real automated checks.

### V2-P1-S06 — Early Codex / Policy Surface Unification (Stretch / Parallel)
**Target:** Governance SSOT (smaller scope than S02 if S02 is too large)

Can be done in parallel with S02 or as a follow-up if S02 proves larger than expected. Focus on moving at least the core Codex + one loader fully under Governance ownership with automated detection of bypasses.

---

## Work Package Template (Use This Format for Every Slice)

Use the full reusable templates defined in `0xray-v2-work-package-templates-2026-05-20.md`.

Every slice must be documented with at minimum:
- ID + Short Name
- Target subsystem + specific boundary being enforced
- Files touched (before → after ownership)
- Exact success criteria (measurable)
- Validation command(s) an agent must run
- Rollback trigger + rollback steps (max 30 min to safe state)
- Agent specialization recommendation
- Link to the PR or worktree where the slice lives
- Post-slice update to the researcher mapping (ownership table row changed)

No slice is "done" until the researcher mapping has been updated to reflect the new ownership.

---

## Success Metrics & Sign-Off Checklist

Before any agent or human can declare Phase 1 complete, the following must be true and evidenced:

- [ ] All six slice IDs have corresponding completed work packages with PRs
- [ ] Inference-cycle.ts passes a boundary audit (zero execution ownership)
- [ ] Governance is the single source for Codex in at least the primary enforcement paths
- [ ] `src/mcps/orchestrator/server.ts` has no legacy coordinator import
- [ ] Fresh Grok CLI install + task execution works end-to-end through the full v2 surface
- [ ] Refactor validation harness is in CI and blocks merges on violation
- [ ] Zero P1 regressions in `logs/framework/activity.log` for MCP/governance/orchestrator paths across the entire phase
- [ ] Updated researcher mapping + this plan both reflect the new state
- [ ] Master Playbook "Phase 1 Exit Criteria" checklist can be checked off with links to evidence

Only after the above checklist is 100% complete and reviewed via External Governance does the project move to Phase 2.

---

## Agent Coordination Rules for Phase 1

- Only one high-risk slice (S03) may be in active development at any time.
- All other slices may run in parallel provided they do not touch overlapping files.
- Every slice must produce a short "What I Learned" section that is appended to the researcher mapping or this plan.
- Any unexpected coupling discovered must be immediately escalated to the Architect before continuing.

---

**This Phase 1 Execution Plan, together with the Master Playbook and the 2026-05-20 researcher mapping, gives any future agent everything required to execute the first controlled stage of the v2 refactoring safely and precisely.**

*Written as Architect + Engineer — 2026-05-20. This plan is a living document and must be updated after every slice.*

---

**End of Phase 1 Execution Plan**