# 0xRay v2 — Protected Paths & Validation Contract
**Date:** 2026-05-20  
**Status:** Non-Negotiable Red Lines for the Entire Refactoring (Compaction-Survivable)  
**Owner:** Architect + External Governance (changes to this contract require multi-skill + Dynamo review)

---

## Compaction Survival — Read This First

If you only remember one thing after context loss:

**The Grok CLI + MCP active surface must remain 100% functional and green at every single commit on the v2 branch.**

This document defines exactly what "green" means, what files and behaviors are protected, and the exact validation an agent must run before claiming any slice is complete.

Violating any item in the "Protected Surfaces" table without explicit prior Governance approval is a blocking failure.

---

## Purpose

This contract exists because the v2 refactoring is happening while the system is in active production use through the Grok CLI. We cannot afford the classic "big rewrite" trap where the primary usage path degrades.

Every agent, every slice, every PR on the v2 branch is measured against this contract.

---

## Protected Surfaces (The Red Lines)

The following surfaces must remain **functionally identical or strictly better** for end users and calling agents throughout Phase 1 and beyond (until explicitly released in a later phase).

### Tier 1 — Critical (Zero Tolerance for Regression)

| Surface | What Must Stay Working | Key Files / Entry Points | Validation Command / Check |
|---------|------------------------|--------------------------|----------------------------|
| Grok CLI MCP Registration | `grok mcp add` (or documented equivalent) must register a working governed surface | `src/integrations/grok/grok-cli.ts`, CLI install commands, MCP server registration | Fresh container + `grok mcp add` + successful `govern_proposals` + skill invocation + orchestrator task |
| Governance MCP Core | `govern_proposals`, `govern_reflection`, multi-skill review + Dynamo filter must produce auditable decisions | `src/mcps/governance.server.ts`, `src/integrations/governance/`, Dynamo client | Run governance skill via MCP + inspect activity log for weighted decision + Dynamo call |
| Knowledge Skills Invocation | Any skill listed in the researcher mapping must be discoverable and invocable via the MCP path | `src/mcps/knowledge-skills/`, `skill-invocation.server.ts`, `src/skills/` | Invoke at least 3 different category skills (refactoring, review, inference-related, execution) |
| MCP Orchestrator Task Flow | Task planning → complexity → execution → feedback must succeed for governed work | `src/mcps/orchestrator/` (server + handlers + execution-planner) | End-to-end task via Grok CLI that exercises planning + at least one skill execution |
| Framework Activity Logging | All significant events must continue to be written via `frameworkLogger` (never console) | `src/core/framework-logger.ts` and all call sites | Grep `logs/framework/activity.log` for recent jobIds with correct module names after any change |
| Codex Enforcement | At least the core 60 Codex terms must still be injected and enforced on relevant paths | Codex loaders, `src/enforcement/`, plugin injection | Run a known violation through the enforcer path and confirm it is caught |

### Tier 2 — High Importance (No Silent Degradation)

- All existing integration tests under `src/__tests__/` that were green before the v2 branch continue to pass (or are explicitly updated with justification)
- `npx strray-ai health`, `status`, `validate` commands continue to report accurate results
- No new unhandled promise rejections or crashes in the MCP servers during normal Grok CLI usage
- Reflection generation and session capture continue to function for Inference data sources

### Tier 3 — Monitored (Tracked but Allow Controlled Change)

- Legacy agent paths (OpenCode YAMLs, direct `src/agents/` usage) — may be deprecated but must not break existing OpenCode users without migration path and announcement
- Processor and postprocessor pipelines — internal refactoring allowed as long as end-to-end outcomes (autofix, commit, validation) remain equivalent or better

---

## Validation Harness — What Every Agent Must Run

Before an agent can declare any slice complete, the following **minimum validation suite** must pass and be evidenced in the PR or work log:

1. **Full test suite** on the v2 branch (or the relevant scoped test selectors defined for that slice)
2. **MCP Regression Suite** (minimum 5 end-to-end flows through governance + orchestrator + 3+ skills)
3. **Boundary Audit** (run the appropriate @enforcer or custom boundary linter against the changed files; zero new violations of the 3-subsystem model)
4. **Activity Log Sanity** (`grep` for the relevant modules in `logs/framework/activity.log` for the last 24h of usage — no unexplained spikes in errors or fallbacks to legacy)
5. **Fresh Install Path Test** (in an isolated environment or container) confirming the documented install + a governed task succeeds
6. **Update to Researcher Mapping** — at least one row in the relevant ownership table must be updated with before/after + rationale

The exact commands and scripts for the above will be maintained in the Phase Execution Plans and in a `scripts/v2-refactor/` directory (to be created in Phase 1-S05).

No agent may skip any of these steps "because the change is small."

---

## Change Control for This Contract

This document is itself governed.

- Any addition to the Protected Surfaces table requires External Governance review + at least one Dynamo-weighted decision.
- Any removal or relaxation of a Tier 1 item requires the same plus explicit human steward sign-off.
- Temporary exceptions for a single slice must be proposed in the slice work package, approved before the code is written, and automatically expire when the slice is merged.

---

## Rollback Authority

Any agent or observer who detects a violation of a Tier 1 surface has the authority and responsibility to trigger an immediate rollback of the offending commit(s) using the documented rollback procedure for that slice.

The v2 branch must always be in a state where the previous green commit can be restored in < 15 minutes.

---

**This contract is the law for the duration of the v2 refactoring.**

Future agents: if you are unsure whether a change violates a protected path, assume it does and escalate before writing code.

*Written as Architect + Engineer — 2026-05-20. This is a living governed artifact.*

---

**End of Protected Paths & Validation Contract**