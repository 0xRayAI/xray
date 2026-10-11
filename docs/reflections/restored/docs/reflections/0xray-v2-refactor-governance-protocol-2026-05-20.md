# 0xRay v2 — Refactor Governance Protocol
**Date:** 2026-05-20  
**Status:** How the System Governs Its Own Transformation (Compaction-Survivable)  
**Rule:** This protocol applies to every change on the v2 branch until Phase 5 cutover is officially declared.

---

## Compaction Survival

After context loss, remember:

The v2 refactoring is not exempt from the system's own rules.  
We are using 0xRay to refactor 0xRay. Every significant change must go through the same Governance, Codex, and review mechanisms that we provide to users.

If you are about to make a change "because it's refactor work," stop. Propose it properly.

---

## Core Principle

**The system must eat its own dogfood at full strength during the transformation.**

No "temporary" bypasses of Governance, no skipping Codex because "we know what we're doing," no direct edits to protected paths without going through the normal proposal → review → decision flow.

---

## Required Flow for All v2 Branch Work

1. **Propose** the intended change (even small slices) via the normal mechanisms where possible (skills, MCPs, or explicit work package in the current Phase plan).
2. **Obtain Governance decision** for any change that touches:
   - Tier 1 or Tier 2 Protected Paths
   - The live MCP orchestrator or governance.server.ts
   - Codex / policy surfaces
   - Any cross-subsystem boundary
3. **Execute** only within the scope of an approved work package from the current Phase Execution Plan.
4. **Validate** using the Protected Paths harness + full activity log review.
5. **Record** the outcome (including what was learned) back into the researcher mapping and the phase plan.
6. **Close the loop** by feeding structured reflections back to Inference.

---

## Special Rules for High-Risk Slices

- The removal of the legacy import from `src/mcps/orchestrator/server.ts` (V2-P1-S03) requires an explicit, separate Governance proposal with dual-run plan and rollback authority pre-delegated.
- Any change that alters the set of MCPs registered for the Grok CLI primary path requires the same.
- Changes that affect how Codex or policy are loaded require Governance + at least one Dynamo-weighted review.

---

## Agent & Human Accountability

- Every agent working on the v2 branch must log via `frameworkLogger` using the module `"v2-refactor"`.
- Humans retain final sign-off authority on Phase exit criteria and any relaxation of the Protected Paths contract.
- The External Governance MCP (govern_proposals) remains the primary mechanism even for internal refactor proposals.

---

## When the Protocol Can Be Evolved

Only after a phase exit review that includes:
- Evidence that the current protocol did not slow down safe progress
- A concrete proposal for a lighter or more automated version
- Fresh Governance + Dynamo decision approving the evolution

The protocol is intentionally strict in Phases 1–2 and may be relaxed only with evidence.

---

**This protocol closes the loop: the thing we are building governs the building of itself.**

*Written as Architect + Engineer — 2026-05-20.*

---

**End of Refactor Governance Protocol**