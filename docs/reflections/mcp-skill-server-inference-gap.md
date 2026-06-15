# MCP Skill Server Inference Gap

**Date:** 2026-06-15
**Severity:** Major architectural gap
**Status:** Confirmed

## Finding

The three governance skill MCP servers (`code-review`, `security-audit`, `researcher`) are structural shells with **zero LLM/AI inference capability**. They perform keyword matching against hardcoded patterns and return pre-written reasoning strings in a `DECISION:/CONFIDENCE:/REASONING:` format.

This was discovered when `govern_proposals` returned `abstain` with 0.5 confidence and "No reasoning provided" — the default fallthrough when no keywords match.

## Architecture Trace

### Governance Flow

```
govern_proposals / govern_reflection (MCP tool)
  → GovernanceService.govern()           [src/governance/governance-service.ts:56]
    → runGovernanceWithTimeout()          [line 126]
      → Promise.all([
          callSkillServer("code-review"),     [line 136]
          callSkillServer("security-audit"),  [line 137]
          callSkillServer("researcher"),      [line 138]
        ])
      → callSkillServer()                [line 170-224]
        → mcpClientManager.callServerTool("analyze_proposal")
          → child node subprocess (configured in ServerConfigRegistry)
        → parseVoteFromText()            [line 328]
          → regex extract DECISION:/CONFIDENCE:/REASONING:
```

### Skill MCP Handlers (all identical pattern)

| Server | File | Keywords Matched | Default |
|--------|------|-----------------|---------|
| code-review | `knowledge-skills/code-review.server.ts:466-512` | aml/kyc, psd2, gdpr, extract method, test coverage, flaky | approve / 0.82 |
| security-audit | `knowledge-skills/security-audit.server.ts:1123-1173` | same + beneficial ownership, ubo, pep screening | approve / 0.82 |
| researcher | `researcher.server.ts:483-529` | same + technical debt | approve / 0.80 |

### What's Missing

- No `processProvider()`, `invokeModel()`, `callLLM()`, or any model invocation exists in `src/mcps/` or `src/governance/`
- The MCP servers are configured as `node` subprocesses (via `ServerConfigRegistry`), but contain no inference logic
- `callSkillServer()` at `src/governance/governance-service.ts:170` routes to the MCP client tool call — it does not inject any LLM context or reasoning

### Only Real AI Signal

The optional **External Dynamo Solar SSOT** integration (`InferenceGovernanceIntegration.checkProposal()` at `governance-service.ts:280`) is the only path that can produce LLM-backed governance, and it's an external service call, not an in-process capability.

## Impact

- All governance deliberation is deterministic rule-based matching, not AI reasoning
- `govern_proposals` / `govern_reflection` cannot provide meaningful analysis unless keyword-triggered
- The 3-skill MCP committee design is architecturally prepared for LLM-backed voting but the actual inference wiring was never implemented
- Self-governance claims are misleading — the system has structure but no intelligence

## Recommended Fix

Wire an **LLM Provider abstraction** into each skill MCP server so `analyze_proposal` passes the proposal to a configurable model (local or remote) rather than running keyword matching. Options:

1. **Hermes Agent bridge** — reuse existing hermes-agent integration to call Hermes for governance analysis
2. **Generic LLM provider** — add a `processProvider()` call to each skill server (OpenAI-compatible API)
3. **MCP-to-MCP delegation** — have each skill server call out to a dedicated `llm-proxy` MCP server that handles the inference

The simplest fix: add an optional `processProvider()` in `governance-service.ts` that, after collecting keyword-based votes, passes the proposal text to a configured LLM with appropriate system prompts for each skill role.
