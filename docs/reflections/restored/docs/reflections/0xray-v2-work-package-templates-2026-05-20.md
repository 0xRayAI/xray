# 0xRay v2 — Work Package & Slice Templates
**Date:** 2026-05-20  
**Status:** Reusable Templates for All Future Slices (Compaction-Survivable)  
**Purpose:** Every authorized piece of work on the v2 branch must be documented using (or closely following) these templates.

---

## Compaction Survival

After context loss, copy the "Full Work Package Template" below into the current Phase Execution Plan (or a new one) for every slice. Fill it out completely before starting code.

---

## Full Work Package Template

```markdown
## V2-PX-SNN — Short Descriptive Name

**Target Subsystem(s):** Inference / External Governance / Autonomous Engine (primary + secondary)  
**Boundary Being Enforced:** (exact Must Own / Never Own rule)  
**Risk Level:** Low / Medium / High / Very High  
**Phase:** 1 / 2 / 3 / 4 / 5

### Problem / Opportunity
(One paragraph from the researcher mapping or current phase plan)

### Files Changed (Ownership Before → After)
- `path/to/file.ts` (Legacy/Scattered → Inference)
- ...

### Exact Success Criteria (Measurable & Verifiable)
- [ ] Criterion 1
- [ ] Criterion 2
- ...

### Validation Requirements (Must All Pass)
1. Full relevant test suite
2. MCP / Grok CLI regression for affected paths (minimum X flows)
3. Boundary audit (zero new violations of the 3-subsystem model)
4. Activity log review for the affected modules (no unexplained legacy fallbacks)
5. Update to the 2026-05-20 researcher mapping (at least one ownership row changed)
6. ...

### Rollback Trigger & Procedure (< 30 min to safe state)
- Trigger: ...
- Steps: 1. ... 2. ...

### Agent Specialization Recommended
- Primary: @researcher / @enforcer / @architect / @orchestrator / etc.
- Review: @enforcer + Governance

### Dependencies / Cross-Team Coordination
- Must wait for / run after slice ...
- Requires Governance proposal? Yes / No (if Yes, link)

### Observability Additions
- New frameworkLogger events at ...
- Activity log queries that must be green after merge

### Post-Slice Artifacts
- Updated researcher mapping row(s)
- Short "What We Learned" section appended to this plan or the researcher mapping
- Any new template improvements discovered

**PR / Worktree:** (link once created)
**Status:** Proposed → In Progress → Validation → Complete / Rolled Back
```

---

## Minimal Slice Record (for very small changes)

Use the full template above for anything Medium risk or higher. For trivial/low-risk changes inside an already-approved slice, a short record is acceptable:

```markdown
**V2-P1-S01a** — Minor naming cleanup inside already-approved boundary
- Files: only internal renames
- Success: no behavior change, tests green, mapping comment updated
- Validation: targeted tests + boundary linter
- Status: Complete
```

---

## How to Propose a New Slice (Outside Current Phase Plan)

1. Write the full work package using the template.
2. Submit via normal Governance path (`govern_proposals` or equivalent) with clear Protected Paths impact analysis.
3. Get explicit approval before creating the topic branch or writing code.
4. Once approved, the Phase Execution Plan is updated and the slice becomes authorized.

---

**Use these templates religiously. They are the mechanism that keeps the massive refactor controlled and auditable.**

*Maintained as part of the 2026-05-20 execution layer.*