# 0xRay v2 — Migration & Cutover Strategy
**Date:** 2026-05-20  
**Status:** Engineering Playbook for Safe, Reversible Extraction (Compaction-Survivable)  
**Primary Audience:** Any Engineer or Agent performing code movement across the legacy ↔ v2 boundary

---

## Compaction Survival — Read This First

If you have limited context, the rules are simple:

- Never delete or bypass legacy code until a governed replacement is **live and monitored** for the active Grok CLI / MCP surface.
- Always prefer **strangler-fig** (new path runs in parallel, old path is gradually starved of traffic) over **big-bang replacement**.
- The live MCP orchestrator and governance.server.ts are the last places you are allowed to introduce risk.
- Every cutover must have a < 30 minute rollback path that returns the system to the previous green state.

This document + the Protected Paths contract + the current Phase Execution Plan tell you exactly how to move code without violating the above.

---

## Core Migration Philosophy

We are not "replacing" the old architecture.  
We are **starving it** while the new three-subsystem architecture becomes the only path that receives new work and new governance.

**Preferred Pattern: Modified Strangler Fig**

1. Introduce the new (v2) implementation behind a narrow interface or feature flag.
2. Run both old and new in parallel for a controlled period (dual-run).
3. Route new governed work exclusively to the new path.
4. Monitor for divergence, errors, and performance.
5. Only after confidence + Governance approval, remove callers from the old path.
6. Finally, delete or fully deprecate the old implementation.

**Anti-Patterns (Forbidden in Phase 1–2 without explicit exception):**
- Direct deletion of legacy orchestrator / agents code
- Changing behavior of `governance.server.ts` or the MCP orchestrator entry points without dual-run
- Any change that makes the Grok CLI registration or skill invocation path different for end users during the transition

---

## Recommended Cutover Order (Derived from Researcher Mapping)

The researcher mapping (2026-05-20) identified the following risk concentrations. Cut in this rough order:

**Phase 1 (Current — Low-to-Medium Blast Radius First)**
1. Inference purification (remove execution from inference-cycle) — mostly internal to one subsystem
2. Governance Codex/Policy unification — high value, contained blast radius if done via loader delegation
3. MCP registration completion — mostly additive / configuration
4. First small legacy import removal inside MCP orchestrator (the specific `MultiAgentOrchestrationCoordinator` import)

**Phase 2 (Higher Risk — After Phase 1 Confidence)**
5. Full extraction of remaining legacy coordinator logic from MCP orchestrator
6. Processors + postprocessor reclamation under Engine (start with lowest-dependency processors)
7. Enforcement runtime guardrails fully under Engine while policy stays under Governance

**Later Phases**
8. Agent shells deprecation / unification of the three yml surfaces
9. Skills directory canonicalization
10. Final legacy surface isolation or deletion

Never reverse this order without updating the plan and obtaining Governance approval.

---

## Concrete Patterns to Use

### Pattern A — Interface Extraction (for Orchestrator Rift)
When a file in the active MCP surface (`src/mcps/orchestrator/server.ts`) imports legacy code:

1. Define a narrow interface owned by the Engine (e.g., `IOrchestrationCoordinator`)
2. Implement the interface with the migrated logic (or a thin adapter during dual-run)
3. Have the MCP orchestrator depend only on the interface
4. Keep the legacy implementation behind the interface until traffic is fully migrated
5. Add frameworkLogger events at the interface boundary for observability

### Pattern B — Loader Delegation (for Governance SSOT)
When multiple places load Codex/policy:

1. Create the single Governance-owned service
2. Have every old loader become a thin delegator (one or two lines)
3. Add a deprecation marker + automated detection of any direct file reads bypassing the service
4. Only after all call sites are delegating, move the actual data

### Pattern C — Dual-Run with Metrics (for High-Risk Cuts)
For the orchestrator rift removal and any change to task execution:

- Instrument both paths
- Run new path for 100% of new governed proposals
- Run old path for a decreasing percentage of traffic (or for comparison only)
- Compare outcomes, latency, error rates, and reflection quality in the activity log
- Only promote to 100% new path after Governance + Protected Paths validation

---

## Rollback Playbook (General)

For any slice:

1. Identify the last known green commit on the v2 branch (must be < 24h old during Phase 1)
2. Revert the minimal set of commits that introduced the regression (prefer revert over manual fix when under time pressure)
3. Confirm via the validation harness that Tier 1 Protected Paths are green again
4. Update the researcher mapping and the slice work package with the rollback reason and what was learned
5. Do not re-attempt the same approach without a revised plan

Each individual slice work package in the Phase plans must contain its own specific 30-minute rollback steps.

---

## Observability Requirements During Migration

Every cutover must increase (never decrease) observability across the boundary:

- Add `frameworkLogger` events with clear `jobId` / `traceId` at every handoff between legacy and new code
- Ensure the activity log can answer "which path did this governed task take?" for at least 30 days after the cut
- Any divergence between old and new paths must be logged as a structured event (not just console noise)

---

## When to Stop a Cutover

Stop and rollback immediately if any of the following occur:

- A Tier 1 Protected Path (see Protected Paths contract) shows functional regression for any user or agent
- Error rate or latency on the Grok CLI MCP path increases by >10% for >1 hour
- Governance decisions stop being produced or lose auditability
- Any agent reports that they can no longer complete a previously working governed task

Confidence is more important than velocity in Phases 1–2.

---

**This strategy, combined with the Master Playbook, Phase 1 Execution Plan, and Protected Paths contract, gives any future agent a repeatable, low-risk method for moving code across the architectural rift.**

*Written as Architect + Engineer — 2026-05-20.*

---

**End of Migration & Cutover Strategy**