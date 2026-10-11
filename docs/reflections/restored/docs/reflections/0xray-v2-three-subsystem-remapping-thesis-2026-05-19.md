# 0xRay v2: Three-Subsystem Remapping Thesis

**Date:** 2026-05-19  
**Status:** Core Architectural Thesis & Refactoring Roadmap (Historical)  
**Version:** 1.0 (Initial Deep Mapping)  
**Intent:** Establish the definitive structural model for 0xRay v2 and provide a phased plan to remap the existing codebase into it.

> **2026-05-20 Execution Layer Update**  
> This document is historical vision. For actual execution, read the 2026-05-20 set in this order:  
> `0xray-v2-documentation-index-2026-05-20.md` → `0xray-v2-master-refactoring-playbook-2026-05-20.md` → current Phase Execution Plan + Protected Paths contract + `0xray-v2-researcher-full-codebase-mapping-2026-05-20.md` (raw ground truth).  
> The May 19 documents provide context only. All current policy, branching rules, authorized slices, and compaction-survivable instructions live in the 2026-05-20 execution layer.

---

## Executive Thesis

0xRay is not a collection of agents, tools, or features.

**0xRay is the orchestrator.**

Its fundamental architecture consists of three interdependent subsystems:

1. **Inference** — The sensing and proposal generation layer
2. **External Governance** — The decision and single-source-of-truth layer
3. **Autonomous Engine** — The governed execution and implementation layer

Everything else in the current codebase is either:
- Supporting infrastructure for one of these three,
- Legacy from a previous architectural era, or
- Scattered fragments that must be reclaimed and reassigned.

This document performs a deep remapping of the existing `src/` structure (and related areas) into this model, identifies the current rift, and provides a phased refactoring plan.

---

## The Three Core Subsystems (v2 Definitions)

### 1. Inference (Sensing & Proposal Generation)
**Purpose:** Continuously observe the system and environment, detect patterns/problems/opportunities, and generate high-quality, evidence-backed proposals.

**Core Responsibilities:**
- Reading and synthesizing logs, sessions, state, reflections, and external signals
- Pattern detection and accumulation
- Proposal creation (refactor, guard, fix, automate, strategic, compliance, etc.)
- Maintaining historical context for better proposals over time

**Current Partial Realization:**
- `src/inference/` (session-capture, accumulator, semantic-patterns, inference-cycle)
- Some analytics and pattern detection in `src/analytics/`
- Scattered observation logic throughout processors and monitoring

### 2. External Governance (Decision Layer & SSOT)
**Purpose:** Serve as the single source of truth for all significant decisions. Everything important must pass through it.

**Core Responsibilities:**
- Structured multi-party review (skills + external filter)
- Mandatory Dynamo Solar SSOT integration
- Producing auditable, weighted decisions
- Governing not just "should we do this?" but increasingly "how should this be done?"

**Current Partial Realization:**
- `src/mcps/governance.server.ts` + `src/governance/`
- `src/integrations/governance/`
- Dynamo Solar SSOT integration points
- Parts of `src/delegation/voting-*`

### 3. Autonomous Engine (Governed Execution)
**Purpose:** Take approved work and responsibly turn it into reality through planning, orchestration, tool use, implementation, verification, and delivery.

**Core Responsibilities:**
- Receiving governed work items
- Planning and decomposition
- Orchestration of tools, skills, and MCPs
- Safe execution with rollback and verification
- Feedback loops back into Inference
- PR creation and integration

**Current Partial Realization:**
- `src/mcps/orchestrator/` (task-handler, execution-planner, etc.)
- `src/orchestrator/` (parts of enhanced-multi-agent-orchestrator and coordination logic)
- `src/processors/` and `src/postprocessor/` (execution machinery)
- `src/enforcement/` (guardrails during execution)
- Large portions of `src/mcps/knowledge-skills/`

---

## Deep Remapping: Current Codebase → Three Subsystems

### ASCII Structural Tree (Current State vs Target)

```
0xRay Codebase (2026-05-19) — Current Reality

src/
├── agents/                          ← Mostly Legacy (Agent Era)
│   ├── refactorer.ts
│   ├── code-reviewer.ts
│   ├── 20+ other specialized agents
│   └── registry.ts
│
├── orchestrator/                    ← Hybrid / Rift Zone
│   ├── enhanced-multi-agent-orchestrator.ts   ← Legacy orchestration
│   ├── multi-agent-orchestration-coordinator.ts
│   └── orchestrator.ts
│
├── mcps/
│   ├── orchestrator/                ← Emerging Autonomous Engine Core
│   │   └── server + task-handler + execution-planner
│   ├── governance.server.ts         ← Emerging External Governance
│   ├── enforcer-tools.server.ts     ← Guardrails (Engine support)
│   └── knowledge-skills/            ← Shared Execution Capability
│
├── inference/                       ← Partial Inference Subsystem
│   └── (session-capture, accumulator, cycle)
│
├── governance/                      ← Partial External Governance
│
├── enforcement/                     ← Scattered (mostly Engine guardrails)
│   └── (heavily refactored but still mixed)
│
├── processors/ + postprocessor/     ← Mostly Autonomous Engine
│
├── delegation/                      ← Mixed (some Inference, some Engine)
│
├── analytics/                       ← Mostly Inference (pattern detection)
│
└── core/                            ← Foundational (shared by all three)
```

### Detailed Mapping Table

| Current Component                  | Primary Subsystem (Target)     | Current Reality                  | Vestigial % | Action Recommendation |
|------------------------------------|--------------------------------|----------------------------------|-------------|-----------------------|
| `src/agents/` (all)                | Autonomous Engine (legacy)     | Still heavily present            | High (70-80%) | Deprecate most; keep only as execution backends |
| `src/orchestrator/` (top-level)    | Autonomous Engine (core)       | Hybrid legacy + real logic       | Medium      | Refactor core logic into MCP orchestrator; deprecate agent-centric parts |
| `src/mcps/orchestrator/`           | Autonomous Engine (core)       | Primary active orchestration     | Low         | Expand significantly |
| `src/inference/`                   | Inference                      | Partial but directionally correct| Low         | Strengthen + expand data sources (esp. reflections) |
| `src/governance/` + governance MCP | External Governance            | Strongest of the three           | Low         | Make this the undisputed center |
| `src/enforcement/`                 | Autonomous Engine (guardrails) | Transitioning well               | Medium      | Fully integrate as Engine guardrail infrastructure |
| `src/mcps/knowledge-skills/`       | Autonomous Engine (capabilities)| Primary work engines             | Low         | Elevate as first-class shared capability layer |
| `src/processors/` + postprocessor/ | Autonomous Engine              | Heavy execution machinery        | Medium      | Reclaim and reorganize under Engine |
| `src/delegation/`                  | Mixed (Inference + Engine)     | Scattered routing logic          | High        | Split: pattern routing → Inference; task routing → Engine |
| `src/analytics/`                   | Inference                      | Pattern detection & learning     | Low         | Deepen integration with Inference layer |
| `src/agents/` (OpenCode YAMLs)     | Legacy (OpenCode-specific)     | Tied to old agent model          | Very High   | Isolate or retire for non-Grok paths |
| `src/integrations/` (various)      | Cross-cutting                  | Mostly integration glue          | Medium      | Re-scope per subsystem |

---

## The Rift — Why This Mapping Matters

The codebase currently contains **two competing mental models** running in parallel:

- **v1 Mental Model**: "We have many specialized agents. The orchestrator coordinates them. The enforcer keeps them in line."
- **v2 Mental Model**: "0xRay *is* the orchestrator. Real work happens through MCPs, skills, hooks, and plugins. Governance is the central nervous system. Inference feeds it proposals. The Engine executes under governance."

This rift is visible in:
- Duplication between top-level orchestrator and MCP orchestrator
- Large agent surface that is decreasingly relevant in the Grok CLI path
- Enforcement logic that has been refactored multiple times without a clear home
- Inference existing in a half-realized state while old agent machinery remains bloated

The goal of v2 is not to delete everything old, but to perform a disciplined **remapping and reclamation** so that every line of code has a clear owner among the three subsystems.

---

## Phased Refactoring Plan (High-Level)

### Phase 0: Deep Mapping & Boundary Definition (Current)
- Complete this document and the Active Surface Analysis
- Define clear ownership contracts for each subsystem
- Identify all cross-subsystem dependencies
- Create the "Governed Parallel Development Protocol"

### Phase 1: Stabilize the Core (Inference + Governance)
- Strengthen Inference to become a proper sensing layer (add reflection ingestion, better state reading)
- Hardened External Governance as the undisputed decision authority
- Freeze new features in legacy agent/orchestrator paths

### Phase 2: Birth the Autonomous Engine as a First-Class Layer
- Consolidate execution logic from processors, postprocessor, parts of orchestrator, and enforcement into the Engine
- Make the MCP orchestrator the primary execution surface
- Begin migrating high-value skills and MCPs under Engine ownership

### Phase 3: Major Cleanup & Deprecation
- Systematically retire or absorb legacy agent code
- Remove duplicated orchestration logic between top-level and MCP orchestrator
- Re-home or delete scattered delegation and analytics logic

### Phase 4: Full Integration & Feedback Loops
- Implement governed feedback from Engine → Inference
- Make governance decisions affect execution strategy (not just approval)
- Operationalize the Aside pattern as a cross-cutting cognitive capability

### Phase 5: Legacy Retirement & v2 Cutover
- Declare large portions of the old agent/orchestrator surface deprecated
- Migrate remaining consumers (OpenCode paths, etc.) or isolate them
- Achieve a codebase where the three subsystems are the dominant, visible structure

---

## Core Principles for the Refactor

1. **No Duplication Without Governance** — If functionality exists in two places, one must be marked legacy or the split must be explicitly governed.
2. **Subsystems Own Their Boundaries** — Inference does not execute. The Engine does not decide. Governance does not sense or execute.
3. **MCPs and Skills are First-Class** — The new architecture privileges MCPs, skills, and hooks over named agents.
4. **Documentation as Constitution** — Every worktree and parallel effort must be given the current version of the three-subsystem vision and this mapping.
5. **The Orchestrator is the System** — Individual components serve the orchestrator (0xRay), not the other way around.

---

## ASCII Dependency Tree (Target State)

```
                          0xRay (The Orchestrator)

                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
            ┌──────────────┐ ┌──────────┐ ┌──────────────┐
            │   INFERENCE  │ │ EXTERNAL │ │  AUTONOMOUS  │
            │   (Sensing)  │ │GOVERNANCE│ │   ENGINE     │
            │              │ │  (SSOT)  │ │  (Execution) │
            └──────┬───────┘ └────┬─────┘ └──────┬───────┘
                   │              │              │
                   │              │              │
            Proposals       Decisions       Approved Work
                   │              │              │
                   └──────────────┴──────────────┘
                                      │
                            Governed Execution
                            + Feedback Loops
```

---

**This document is the core thesis for the 0xRay v2 refactoring effort.**

It will be updated as the mapping deepens and the phased work progresses.

---

*Written during the architectural turning point of the project. This is not a task list — it is the structural truth we are moving toward.*