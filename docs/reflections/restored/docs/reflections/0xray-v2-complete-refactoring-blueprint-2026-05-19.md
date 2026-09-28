# 0xRay v2 — Complete Refactoring Blueprint

**Status:** Master Architectural Plan (Historical)  
**Date:** 2026-05-19  
**Version:** 1.0 (Initial Full Blueprint)  
**Author Role:** Acting as Lead Architect + Principal Engineer

> **2026-05-20 Execution Layer Update**  
> For current execution, branching rules, authorized slices, and compaction survival, read the 2026-05-20 documents via `0xray-v2-documentation-index-2026-05-20.md`. This blueprint is valuable historical context only.

**Purpose:**  
This document is the single source of truth for the 0xRay v2 refactoring. It is written at a level of detail so that even a subagent with limited context can pick up a task, understand the "why", the "what", the "how", the risks, and the success criteria.

It is designed to survive context compaction.

---

## 1. Executive Summary & Core Thesis

**Current State (v1):**  
0xRay is a powerful but architecturally fractured system. It contains two overlapping paradigms:
- An older **agent-centric model** (large `src/agents/`, top-level orchestrator, direct agent spawning).
- An emerging **MCP + skill-first model** that is already the dominant active surface in the Grok CLI.

This has created significant duplication, unclear ownership, scattered logic, and technical debt.

**Target State (v2):**  
0xRay itself *is* the orchestrator.  
It is cleanly structured around three interdependent subsystems:

1. **Inference** — Sensing, pattern detection, and proposal generation.
2. **External Governance** — Decision authority and Single Source of Truth.
3. **Autonomous Engine** — Governed execution, orchestration, and delivery.

All code, MCPs, skills, and processes must map cleanly into one (or more) of these three. Legacy agent concepts are demoted to implementation details or retired.

**Scope of v2:** This is a **major architectural refactoring**, not incremental improvement. Significant portions of the current codebase (especially the old agent layer and duplicated orchestration logic) are expected to be deprecated or heavily restructured.

---

## 2. The Three Subsystems — Precise Definitions

### Inference (Sensing & Proposal Generation)
**Mission:** Continuously observe reality and generate high-quality proposals.

**Core Responsibilities:**
- Ingest and synthesize sessions, logs, state, reflections, and external signals
- Detect recurring patterns and problems
- Generate proposals with evidence and confidence
- Maintain long-term memory for better future proposals

**Boundaries:**
- Does **not** decide whether work happens
- Does **not** execute changes

### External Governance (Decision Layer & SSOT)
**Mission:** Be the single source of truth for all significant decisions.

**Core Responsibilities:**
- Structured multi-skill + Dynamo review
- Weighted, auditable decisions
- Policy and rule definition
- Governance of *how* execution should occur

**Boundaries:**
- Does **not** generate proposals
- Does **not** perform execution

### Autonomous Engine (Governed Execution)
**Mission:** Take approved work and deliver it safely and effectively.

**Core Responsibilities:**
- Planning and decomposition
- Orchestration of tools, skills, and MCPs
- Safe execution, verification, and rollback
- Delivery (PRs, integrations, etc.)
- Feedback loops back to Inference

**Boundaries:**
- Only acts on work that has passed through Governance
- Does not make high-level "should we do this?" decisions

---

## 3. Current State Deep Map (Before State)

### 3.1 High-Level ASCII Tree

```
0xRay Current Architecture (Before - 2026-05-19)

src/
├── agents/                              [Legacy - Mostly Shells]
│   └── 25+ agent implementations
├── opencode/agents/                     [Legacy Prompts - Valuable]
├── orchestrator/                        [Old Multi-Agent Coordination - Major Debt]
├── mcps/
│   ├── orchestrator/                    [Modern Execution Orchestration - Active]
│   ├── governance.server.ts             [Modern Governance Surface - Active]
│   ├── enforcer-tools.server.ts
│   └── knowledge-skills/                [Real Capability Engines - Very Active]
├── inference/                           [Partial - Needs Strengthening]
├── governance/                          [Partial - Needs Strengthening]
├── enforcement/                         [Scattered - In Transition]
├── processors/                          [Execution Machinery - Scattered]
├── postprocessor/                       [Execution + Healing - Scattered]
├── delegation/                          [Highly Fragmented]
├── analytics/                           [Mostly Inference - Scattered]
├── core/                                [Foundational - Mixed Ownership]
└── integrations/                        [Cross-cutting - Mixed]
```

### 3.2 Major Area Ownership Table (Before)

| Area                              | Current Primary Owner (de facto) | Health | Duplication Risk | Notes |
|-----------------------------------|----------------------------------|--------|------------------|-------|
| `src/agents/`                     | Legacy Agent Model               | Poor   | High             | Mostly shells |
| Top-level `src/orchestrator/`     | Mixed                            | Poor   | Very High        | Major rift |
| `src/mcps/orchestrator/`          | Autonomous Engine (emerging)     | Good   | Medium           | Best current execution surface |
| `src/inference/`                  | Inference (partial)              | Medium | Low              | Directionally correct |
| `src/governance/` + MCP           | External Governance (partial)    | Good   | Low              | Strongest of the three |
| `src/enforcement/`                | Mixed                            | Medium | Medium           | Needs clear split |
| `src/processors/` + postprocessor | Mixed (mostly execution)         | Medium | High             | Needs major reclaim |
| `src/delegation/`                 | Highly fragmented                | Poor   | Very High        | Critical cleanup target |
| `src/mcps/knowledge-skills/`      | Autonomous Engine (de facto)     | Good   | Low              | Real engines |

---

## 4. Target State Deep Map (After State)

### 4.1 High-Level ASCII Tree (Target)

```
0xRay v2 Target Architecture

                              0xRay (The Orchestrator)

                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
    ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
    │   INFERENCE   │         │    EXTERNAL   │         │  AUTONOMOUS   │
    │   (Sensing)   │         │   GOVERNANCE  │         │    ENGINE     │
    │               │         │    (SSOT)     │         │  (Execution)  │
    └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
            │                         │                         │
            │                         │                         │
     Proposals                  Decisions               Approved Work
            │                         │                         │
            └─────────────────────────┴─────────────────────────┘
                                      │
                            Governed Execution + Feedback
```

### 4.2 Target Ownership Table (After)

| Area                              | v2 Primary Owner              | v2 Secondary | Status in v2 | Migration Notes |
|-----------------------------------|-------------------------------|--------------|--------------|-----------------|
| `src/agents/` (most)              | Autonomous Engine (legacy)    | None         | Deprecated   | Thin adapters only |
| `src/opencode/agents/`            | Cross-cutting (MCP personas)  | Engine/Gov   | Preserved + Unified | Convert to MCP-exposed |
| Top-level `src/orchestrator/`     | Autonomous Engine (core)      | None         | Major Cleanup| Logic migrated to MCP orchestrator |
| `src/mcps/orchestrator/`          | **Autonomous Engine** (Core)  | —            | Primary      | Becomes the heart of execution |
| `src/inference/`                  | **Inference**                 | —            | Strengthened | Expand significantly |
| `src/governance/` + MCP           | **External Governance**       | —            | Strengthened | Becomes the true SSOT |
| `src/enforcement/`                | Autonomous Engine + Gov       | —            | Reorganized  | Split by responsibility |
| `src/processors/` + postprocessor | **Autonomous Engine**         | —            | Reclaimed    | Major consolidation |
| `src/delegation/`                 | Split by concern              | —            | Restructured | Clean 3-way split |
| `src/mcps/knowledge-skills/`      | Split by skill purpose        | —            | Reorganized  | Assigned to owning subsystem |

---

## 5. Detailed Subsystem Blueprints

### 5.1 Inference Subsystem Blueprint

**Core Responsibilities (v2):**
- All pattern detection and accumulation
- Session, log, reflection, and state synthesis
- Proposal generation with evidence

**Key Directories/Components in v2:**
- `src/inference/` (expanded)
- Relevant parts of `src/analytics/`
- Relevant analysis from `src/delegation/`
- Reflection ingestion (new or expanded)

**Interfaces:**
- Outputs proposals to External Governance
- Receives feedback from Autonomous Engine

### 5.2 External Governance Subsystem Blueprint

**Core Responsibilities (v2):**
- All high-level decision making
- Multi-skill + Dynamo review
- Policy and rule ownership

**Key Directories/Components in v2:**
- `src/mcps/governance.server.ts` + `src/governance/`
- Policy/rule definitions (moved from enforcement)
- Review-oriented skills (code-review, security-audit, etc.)

**Interfaces:**
- Receives proposals from Inference
- Issues governed work items to Autonomous Engine

### 5.3 Autonomous Engine Subsystem Blueprint

**Core Responsibilities (v2):**
- All planning, orchestration, and execution
- Tool/skill/MCP coordination
- Safe delivery and verification

**Key Directories/Components in v2:**
- `src/mcps/orchestrator/` (expanded to be the core)
- Most of `src/processors/` and `src/postprocessor/`
- Execution-time enforcement
- Execution-oriented skills (refactoring-strategies, devops-deployment, etc.)

**Interfaces:**
- Receives governed work from External Governance
- Sends execution results and learnings back to Inference

---

## 6. Phased Refactoring Plan (High-Level)

**Phase 0: Deep Mapping & Boundary Definition** (Current)
- Complete this workbook to sufficient depth
- Define clear ownership contracts
- Map all major cross-subsystem dependencies

**Phase 1: Stabilize the Two Decision & Sensing Layers**
- Strengthen Inference (especially reflections and state)
- Harden External Governance as the undisputed SSOT
- Freeze new development on legacy agent paths

**Phase 2: Birth the Autonomous Engine**
- Consolidate orchestration, processors, postprocessor, and execution enforcement under the Engine
- Make `src/mcps/orchestrator/` the single source of truth for execution

**Phase 3: Major Legacy Cleanup**
- Deprecate or absorb most of `src/agents/`
- Remove duplicated orchestration logic between top-level and MCP orchestrator
- Re-home scattered delegation logic

**Phase 4: Close the Loops**
- Implement governed feedback from Engine → Inference
- Allow External Governance to influence execution strategy

**Phase 5: Legacy Retirement & Cutover**
- Large-scale deprecation of old agent/orchestrator patterns
- Final integration and operational maturity

---

## 7. How to Use This Document (For Subagents)

If you are a subagent assigned a task:

1. Read Sections 1–3 to understand the vision.
2. Find your task area in Section 4 or 5.
3. Read the relevant "Current Reality" and "Target State".
4. Check Section 5 (Dependencies & Risks) before making changes.
5. Follow the phase guidance in Section 6.
6. Update this document with your findings and progress.

This document is designed to be the single source of truth for the entire v2 effort.

---

**This is the complete initial blueprint.**

It will continue to be expanded with more file-level detail, dependency graphs, and per-phase task breakdowns as Phase 0 progresses.

---

*Master Blueprint for 0xRay v2. Written while acting as Architect & Engineer.*