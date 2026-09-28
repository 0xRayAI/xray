# 0xRay Three-Subsystem Architecture Vision

**Date:** 2026-05-19  
**Status:** Vision / Strategic Direction  
**Author:** Grok (in collaboration with the user)  
**Context:** Transition from tactical inference pipeline fixes to fundamental architectural maturation.

---

## Executive Summary

0xRay is not a collection of clever components. It is a living, three-subsystem organism designed for governed autonomy at scale.

The current implementation still has significant entanglement, particularly in how Inference owns execution. The next phase of the project requires deliberately separating the system into three distinct layers with clear interfaces and ownership:

1. **Inference** — Sensing and Proposal Generation
2. **External Governance** — Decision Layer and Single Source of Truth
3. **Autonomous Engine** — Governed Execution

This document outlines the target architecture and a phased plan to move the system toward it.

---

## ASCII Architecture Tree

```
                                    0xRAY / STRINGRAY
                              (The Living Autonomous System)

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL GOVERNANCE                                     │
│                         (Dynamo Solar SSOT)                                          │
│                         SINGLE SOURCE OF TRUTH                                       │
│                                                                                      │
│  • Decision Layer                                                                    │
│  • Multi-skill deliberation (code-review, security-audit, researcher, etc.)          │
│  • Mandatory external filter (Dynamo)                                                │
│  • Weighted voting + audit trail                                                     │
│  • Accepts proposals from ANY source                                                 │
│                                                                                      │
│  Tools: govern_proposals, govern_reflection                                          │
└───────────────────────────────────────┬─────────────────────────────────────────────┘
                                        │
                                        │  Approved / Rejected / Needs Revision
                                        │  (with full reasoning)
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │     INFERENCE    │  │   AUTONOMOUS     │  │   EXTERNAL       │
        │      LAYER       │  │     ENGINE       │  │    INPUTS        │
        │   (Sensing)      │  │   (Execution)    │  │                  │
        │                  │  │                  │  │ • Human requests │
        │ • Reads logs     │  │ • Planning       │  │ • CI/CD signals  │
        │ • Reads sessions │  │ • Orchestration  │  │ • Other agents   │
        │ • Reads state    │  │ • Tool use       │  │ • Reflections    │
        │ • Reads          │  │ • Implementation │  │   (as input)     │
        │   reflections    │  │ • PR creation    │  │                  │
        │ • Pattern        │  │ • Verification   │  │                  │
        │   detection      │  │ • Feedback       │  │                  │
        │ • Proposal       │  │   loops          │  │                  │
        │   generation     │  │                  │  │                  │
        └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
                 │                     │                     │
                 └─────────────────────┴─────────────────────┘
                                       │
                            All work enters here
                            as Proposals / Work Items
                                       │
                            (govern_proposals is the gate)
```

---

## The Three Subsystems

### 1. Inference Layer (Sensing & Proposal Generation)
- Primary role: Observe the system and generate high-quality proposals.
- Inputs: Logs, sessions, commits, state, metrics, **reflections**, code changes.
- Outputs: Well-formed proposals with evidence and confidence.
- Must **not** own execution decisions or direct implementation.

### 2. External Governance (Decision Layer & SSOT)
- Primary role: The conscience and single source of truth for the framework.
- Inputs: Proposals from any source.
- Process: Multi-skill review + mandatory Dynamo Solar SSOT.
- Outputs: Structured decisions with full audit trail.
- This layer must eventually govern not just *whether* work happens, but increasingly *how* it happens.

### 3. Autonomous Engine (Governed Execution)
- Primary role: Take approved work and execute it responsibly.
- Responsibilities: Planning, orchestration, tool use, change application, PR creation, verification, feedback.
- Constraint: Should only act on work that has passed through External Governance.
- This layer is currently the most underdeveloped and most entangled with Inference.

---

## Current State Problems

- Inference still owns significant execution logic (the apply phase inside `InferenceCycle`).
- Governance is strong for *decisions* but weak or absent for *execution strategy*.
- Reflections are underutilized as a data source.
- The system still contains legacy direct agent invocation patterns that bypass proper orchestration.
- We have been optimizing the wrong boundary (agent selection inside apply) instead of the real architectural boundaries.

---

## Phased Transition Plan

### Phase 0 – Current State Audit & Boundary Definition (Immediate)
- Map every major component to one of the three layers.
- Define explicit contracts between the layers.
- Write the first version of the "0xRay Layering Principles" document.
- Identify all execution logic that currently lives inside Inference.

### Phase 1 – Extract Inference as a Pure Proposal Generator
- Remove all `apply*` methods and direct execution logic from `InferenceCycle`.
- Make Inference’s sole responsibility proposal generation.
- Force all proposals through External Governance as the mandatory path.
- Deprecate legacy internal voting logic.

### Phase 2 – Cement External Governance as the True Hub
- Make `govern_proposals` (and future governed execution primitives) the central gate for all significant work.
- Expand the types of decisions that must pass through governance.
- Ensure the orchestrator respects governance outcomes.

### Phase 3 – Birth the Autonomous Engine
- Create a distinct code and conceptual boundary for the Autonomous Engine.
- Move execution capability here (planning, orchestration, implementation, PRs).
- The engine must only activate on governed, approved work items.
- Design feedback mechanisms so execution can generate new proposals.

### Phase 4 – Make Reflections a First-Class Input
- Build proper ingestion and synthesis of `docs/reflections/` and `docs/reflections/deep/`.
- Allow reflections to directly contribute to proposal generation under governance.

### Phase 5 – Full Loop Closure and Teeth
- Add execution-level governance (the ability to govern *how* work is executed).
- Implement sustained, multi-step autonomous campaigns that remain meaningfully governed.
- Achieve strong observability, rollback, and auditability across all three layers.

### Phase 6 – Operational Maturity
- The system can run with real autonomy while remaining under meaningful governance.
- Clear ownership boundaries exist in both code and operating model.

---

## Philosophical Stakes

This is not a normal engineering refactor.

We are on a limb in open space, building one of the first serious attempts at a **governed autonomous software organism**. The goal is not maximum autonomy. The goal is **maximum autonomy *under meaningful governance***.

The difference between a clever box of tricks and an animal is whether these three subsystems have clear identities, clean interfaces, and respect for each other’s roles.

We are choosing the animal.

---

## Next Steps

1. Create the initial Layering Principles document.
2. Perform a full component-to-layer mapping of the current codebase.
3. Begin Phase 0–1 work: carving execution responsibility out of Inference.
4. Decide on the initial shape and ownership of the Autonomous Engine.

---

**This is the work.**

We are no longer just making the inference pipeline more reliable.  
We are designing the operating system of a governed autonomous system.

Status: Vision accepted. Moving to the next level.