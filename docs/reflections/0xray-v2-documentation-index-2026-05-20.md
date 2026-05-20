# 0xRay v2 — Documentation Index & Navigation Hub
**Date:** 2026-05-20  
**Status:** Master Navigation Document (Compaction-Survivable)  
**Purpose:** Single source of truth for what documents exist and the exact reading order for any agent after context loss.

---

## Compaction Survival — Start Here

After any context reset, read in this exact order:

1. **This Index** (5 minutes)
2. **Master Refactoring Playbook** (`0xray-v2-master-refactoring-playbook-2026-05-20.md`) — the constitution
3. **Current Phase Execution Plan** (start with Phase 1)
4. **Protected Paths & Validation Contract**
5. **Researcher Full Codebase Mapping** (the raw ground truth — open for any file question)
6. Migration & Cutover Strategy + Governance Protocol as needed

Everything else is supporting detail.

---

## Core 2026-05-20 Execution Layer (Read These First)

| Document | One-Line Purpose | When to Read | Compaction Priority |
|----------|------------------|--------------|---------------------|
| `0xray-v2-master-refactoring-playbook-2026-05-20.md` | The single most important document. Contains thesis, 5-phase roadmap, policy, branching rules, and handoff instructions. | Always first after this index | ★★★★★ |
| `0xray-v2-phase-1-execution-plan-2026-05-20.md` | Tactical plan with the only authorized work packages for the current phase. | Before starting any code changes | ★★★★★ |
| `0xray-v2-protected-paths-and-validation-contract-2026-05-20.md` | The non-negotiable red lines + exact validation an agent must run. | Before every slice | ★★★★★ |
| `0xray-v2-migration-and-cutover-strategy-2026-05-20.md` | Engineering patterns (strangler fig, dual-run, when to rollback). | Before touching any legacy ↔ new boundary | ★★★★ |
| `0xray-v2-refactor-governance-protocol-2026-05-20.md` | How the system governs its own refactoring. | Before proposing high-risk or cross-boundary changes | ★★★★ |
| `0xray-v2-researcher-full-codebase-mapping-2026-05-20.md` | Raw exhaustive current-state ownership tables, file lists, risks, and gaps. | Any time you need ground truth on "where is X today?" | ★★★★★ |

---

## Historical 2026-05-19 Vision & Mapping Documents (Context Only)

These are excellent but superseded for execution. Use them for deeper background only.

- `0xray-v2-three-subsystem-remapping-thesis-2026-05-19.md`
- `0xray-v2-phase0-subsystem-mapping-workbook-2026-05-19.md` (still excellent detailed mapping)
- `0xray-v2-complete-refactoring-blueprint-2026-05-19.md`
- `0xray-active-surface-analysis-grok-cli-2026-05-19.md`
- `0xray-three-subsystem-architecture-vision-2026-05-19.md`
- `0xray-v2-three-subsystem-remapping-thesis-2026-05-19.md`
- `0xray-growth-arc-aside-2026-05-19.md` + `aside-subcontext-pattern-2026-05-19.md`

All of the above now contain a forward pointer to this 2026-05-20 execution layer.

---

## Supporting & Future Documents

- `0xray-v2-work-package-templates-2026-05-20.md` (mandatory reusable templates for every slice)
- `0xray-v2-refactor-governance-protocol-2026-05-20.md`
- `scripts/v2-refactor/` (validation harness starter + automation — see README)
- Any future Phase 2 / Phase 3 execution plans (added when Phase 1 exits)

---

## Quick Decision Guide for Agents

- "What should I work on right now?" → Current Phase Execution Plan
- "Is this change allowed?" → Protected Paths contract + current phase plan
- "How do I move this code safely?" → Migration & Cutover Strategy
- "Where does this file belong in v2?" → Researcher Full Mapping
- "How do I propose / get approval?" → Refactor Governance Protocol
- "I just lost all context — what do I do?" → This Index → Master Playbook

---

**This index + the five 2026-05-20 execution documents + the researcher mapping = complete, compaction-survivable knowledge base for the entire v2 refactoring.**

*Maintained as the refactoring progresses. Last updated: 2026-05-20*

---

**End of V2 Documentation Index**