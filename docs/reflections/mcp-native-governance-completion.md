# Reflection: Making Inference Governance Fully MCP-Native

**Date**: 2026-05-15  
**Branch**: inference/refactor + master  
**Commit**: 906f794e6

## Executive Summary

We completed the long-standing goal of making proposal governance in the inference cycle truly driven by **individual knowledge-skill MCP servers** when `STRRAY_FORCE_MCP_GOVERNANCE=true`.

Previously, even with the flag set, the system would still fall back to the legacy `architect` + `VotingCoordinator` path (and ultimately `opencode run --agent`) because the orchestrator's `executePlan` was simulated and `invokeAgentInternal` had a narrow acceptance gate.

Through a series of precise, layered changes, we made the individual skill servers (`code-review`, `security-audit`, `researcher`) the authoritative source for `DECISION / CONFIDENCE / REASONING` on every proposal, while preserving the two-oscillator model (internal skills + external Dynamo governance).

## The Problem (Before)

- The orchestrator MCP server’s `orchestrate-task` tool returned only generic “Tool executed” acknowledgments.
- `executePlan` in `TaskHandler` was purely simulated.
- `invokeAgentInternal` would only accept responses containing old-style `PROPOSAL:` blocks, otherwise falling back to `invokeViaOpencode`.
- Governance voting was still performed by an `"architect"` agent through the legacy coordinator.
- Hardcoded `.opencode/` paths and `OpenCodeSpawnGate` made the system feel tied to one host.

The flag existed in name but did not fully deliver a pure MCP experience.

## The Solution (Precision Changes)

### 1. Make the Orchestrator Real
- Rewrote `executePlan` to detect known MCP skill servers and actually call them via `mcpClientManager.callServerTool(agent, "analyze_proposal", ...)`.
- Added support for more agent name aliases (`code-reviewer` → `code-review`, `refactorer` → `refactoring-strategies`, etc.).
- Real `agentOutputs` are now captured and returned.

### 2. Force the Pure Path at the Governance Layer
- Added an early return in `governProposals` (and a defensive check in `governProposalsInternal`) that routes directly to `governProposalsWithIndividualSkills` when the flag is set.
- This method calls the three real skill servers per proposal and builds votes from their structured responses.
- External Dynamo governance is still merged afterward (best of both oscillators).

### 3. Harden the Invocation Layer
- `invokeAgentInternal` now trusts responses containing `DECISION:` text.
- In pure MCP mode it throws a clear error instead of ever calling `invokeViaOpencode`.

### 4. Provider-Agnostic Cleanup (Option A)
- Renamed `OpenCodeSpawnGate` → `AgentSpawnGate` with generic error messages.
- Replaced the custom `resolveOpencodeRoot` walk with `getConfigDir()` / `resolveConfigPath()` from the existing `config-paths.ts` utility.
- Added explicit guards inside `invokeViaOpencode` itself so it is unreachable in pure mode.

### 5. Apply Phase Consistency (Option B)
- Updated `applyCodeChange`, `applyGuard`, and `applyAutomation` to choose real MCP skill server names (e.g. `refactoring-strategies`, `code-review`, `testing-strategy`) when the flag is set.
- This ensures the post-approval implementation phase also benefits from the real orchestrator dispatch.

## Results

- When `STRRAY_FORCE_MCP_GOVERNANCE=true`:
  - Proposal **voting** is performed by the individual knowledge-skill MCP servers.
  - The orchestrator performs real work instead of simulation.
  - Zero `opencode run --agent` calls occur for governance or apply in the pure path.
  - The system still correctly merges with external (Dynamo) governance.

- The architecture is now much closer to the original vision: the orchestrator coordinates, but the actual intelligence and decisions come from the specialized skill MCP servers.

## Lessons Learned

- **Simulation is the enemy of progress.** As long as `executePlan` returned fake data, every downstream path would eventually fall back to the legacy implementation.
- **Defense in depth works.** Having the pure-MCP check in both `governProposals` and `governProposalsInternal`, plus inside `invokeViaOpencode`, made the behavior robust.
- **Provider-agnostic naming matters.** Renaming the spawn gate and using the existing `config-paths` resolver removed a lot of implicit OpenCode assumptions with very little code change.
- **Apply phase must also be considered.** Voting is only half the story; if the implementation of approved proposals still went through legacy agents, the benefit would be limited.

## Remaining Polish (Future)

- Full removal or stronger deprecation of the `invokeViaOpencode` + NDJSON path (currently only reachable when the flag is off).
- Adding richer “apply/implement” tools on the skill servers (beyond `analyze_proposal`) so the orchestrator can drive actual code changes more intelligently.
- More comprehensive end-to-end tests that assert the absence of OpenCode spawns under the pure-MCP flag.

## Final State

The core goal has been achieved: **the individual knowledge-skill MCP servers are now the primary source of truth for inference proposal governance**.

The flag `STRRAY_FORCE_MCP_GOVERNANCE=true` is no longer aspirational — it meaningfully changes the execution path to be MCP-native.

---

*Written after the final verification run and commit 906f794e6 on 2026-05-15.*