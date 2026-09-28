# 0xRay Active Surface Analysis — Grok CLI Context

**Date:** 2026-05-19  
**Status:** Diagnostic Reference Document (Historical)  
**Audience:** Core team / architectural decision making  
**Scope:** Focused on what is *actually exercised* when using 0xRay through the Grok CLI (as opposed to OpenCode, direct Node usage, or other integrations).

> **2026-05-20 Execution Layer Update**  
> The Grok CLI reality filter described here remains critical. For the actual rules, protected paths, and current execution strategy built on top of this analysis, use the 2026-05-20 set starting from the Documentation Index.

---

## Purpose

This document maps the current state of the codebase against real usage in the Grok CLI environment. It separates components into three categories to make the architectural rift visible and actionable during the 0xRay v2 transition.

The goal is to clearly answer:
- What is the *primary active path* today?
- What is in transition?
- What is legacy but still wired in (and therefore risky to touch carelessly)?

---

## Context: Grok CLI Usage Model

When 0xRay is used via the Grok CLI:

- The primary integration mechanism is **MCP registration** (not direct agent invocation).
- The main entry points are:
  - `governance.server.js`
  - `skill-invocation.server.js` (knowledge skills)
  - `enforcer-tools.server.js`
  - The MCP orchestrator (`src/mcps/orchestrator/`)
- The old agent system and top-level orchestrator are only reached indirectly (if at all).

This is a critical filter. Many parts of the codebase that look central when reading the source tree are effectively invisible or secondary in the Grok CLI experience.

---

## Active Surface Categories

### 1. Primary Active Path (What actually does the work in Grok CLI)

| Component | Location | Role in Grok CLI | Notes |
|---------|----------|------------------|-------|
| Governance MCP | `src/mcps/governance.server.ts` + `src/governance/` | Core decision layer + Dynamo integration | Heavily used and exposed |
| Knowledge Skills / Skill Invocation | `src/mcps/knowledge-skills/` + `skill-invocation.server.ts` | Primary way specialized capabilities are delivered | This is where most "agent-like" behavior now lives |
| MCP Orchestrator | `src/mcps/orchestrator/` | Task planning, execution coordination, complexity handling | The modern orchestration surface |
| Enforcer Tools (MCP) | `src/mcps/enforcer-tools.server.ts` | Guardrails exposed as tools | Moving enforcement out of the old agent model |
| Inference Layer | `src/inference/` | Pattern detection and proposal generation | Active but still relatively lightweight |
| External Governance Integration | `src/integrations/governance/` | Connection to Dynamo Solar SSOT | Required for full governance |

**Observation:** The real work is happening through **MCPs and skills**, not through the old named agents.

### 2. Transitioning (Being refactored or re-layered)

| Component | Location | Current State | Direction |
|---------|----------|---------------|---------|
| Top-level Orchestrator | `src/orchestrator/` (especially `enhanced-multi-agent-orchestrator.ts`, `orchestrator.ts`) | Still contains significant logic | Being partially absorbed or called by the MCP orchestrator |
| Rule Enforcement System | `src/enforcement/` | Heavily refactored into registries, executors, violation fixers, etc. | Moving from "Enforcer agent" model toward infrastructural guardrails + MCP exposure |
| Agent Registry & Routing | `src/agents/registry.ts` + delegation logic | Still present and importable | Being demoted from primary abstraction to optional backend |
| Boot Orchestrator / Kernel Orchestrator | `src/core/boot-orchestrator.ts`, `src/core/orchestrator.ts` | Early activation and coordination logic | Unclear long-term ownership |

These components are not dead, but they are no longer the primary interface in the Grok CLI world.

### 3. Legacy but Still Wired (Vestigial or rarely exercised in Grok CLI)

| Component | Location | Status | Risk Level |
|---------|----------|--------|------------|
| Individual Specialized Agents | `src/agents/` (refactorer, code-reviewer, backend-engineer, etc.) | Large surface area, low direct usage in Grok CLI | Medium — easy to break things that still route through them |
| OpenCode Agent Definitions | `src/opencode/agents/` (40+ .yml files) | Tied to OpenCode plugin path | Low for Grok CLI users, high for OpenCode users |
| Many legacy processors and postprocessors | `src/processors/`, `src/postprocessor/` | Some still reference old agent routing | Medium |
| Direct agent invocation patterns | Scattered across delegation, inference-cycle (in non-MCP paths), etc. | Still exist as fallback logic | High — can create surprising behavior |

These areas represent the "old 0xRay" that was built around the assumption that agents were the primary unit of intelligence and action.

---

## Key Findings — The Rift in Practice

1. **Two different orchestration realities exist side-by-side**
   - The top-level `src/orchestrator/` still holds a lot of the "thinking" and coordination logic.
   - The MCP orchestrator (`src/mcps/orchestrator/`) is the one actually surfaced to Grok CLI users.
   - There is duplication and unclear ownership between these two layers.

2. **The Agent Abstraction has already lost its centrality in the Grok CLI path**
   - While the agent directory is large and well-organized, the Grok integration path primarily goes through MCPs and skills.
   - Many agents are effectively vestigial in the current primary usage model.

3. **Enforcement is in the middle of a healthy migration**
   - It has moved from a monolithic `RuleEnforcer` toward modular components + MCP exposure.
   - This direction aligns well with the v2 vision (guardrails as core infrastructure, not as an agent).

4. **The real "work engines" in Grok CLI are MCPs and skills**
   - This validates the emerging view that 0xRay v2 should treat hooks, plugins, skills, and MCPs as first-class, while treating the old agent model as a legacy execution backend.

---

## Implications for 0xRay v2

- The new three-subsystem model (Inference, External Governance, Autonomous Engine) should be built primarily on top of the **MCP + skills layer**, not the old agent/orchestrator layer.
- A significant amount of code in `src/agents/`, parts of `src/orchestrator/`, and some legacy routing logic can likely be retired or heavily reduced once the new subsystems are in place.
- The "orchestrator" and "enforcer" concepts should be fully promoted from agents to **core MCPs/skills** that sit at the heart of the system.
- Any future parallel work (worktrees + multiple Grok CLIs) should be explicitly told: "In the Grok CLI context, the active surface is MCPs and skills. The old agent system is legacy."

---

## Recommended Next Steps

1. Use this document as the reference when writing Work Plans for future worktrees.
2. Explicitly decide the fate of the top-level `src/orchestrator/` during v2 boundary definition (absorb, deprecate, or split).
3. Create a clear "Legacy Surface" list that can be used during cleanup sprints.
4. Ensure the Governance layer (External + internal) owns the story of what is active vs. deprecated.

---

*This document is intended as a living diagnostic artifact to guide the v2 transition. It should be updated as more of the system is exercised and understood.*