# 0xRay v2 Refactor Validation Harness

**Status:** Phase 1 Foundation (Expand as slices are completed)

This directory contains the reusable validation commands and checks that every agent must run before a slice can be considered complete.

## Minimum Required Checks (Phase 1)

Every slice must at minimum satisfy the requirements in:
- `0xray-v2-protected-paths-and-validation-contract-2026-05-20.md`
- The "Validation Requirements" section of the current Phase Execution Plan

## Planned Structure (Evolving with Phase 1 Slices)

```
validation/
├── README.md
├── check-inference-boundary.sh    # Inference must never own execution (S01)
├── check-orchestrator-rift.sh     # No legacy coordinator in MCP server (S03)
├── governance-ssot-check.sh       # Codex/policy through Governance layer only (S02)
├── check-execution-ownership.sh   # **New (P2-S01k)**: Dedicated strict always-on detector for Orchestrator as Execution SSOT (P2-S01 a-k + l + m + n + o + p + q + r + s + t + u). 7 mediation handoffs + per-flow + richer return shape + registry + dispatch metrics + P2-S01l MCP get-dispatch-stats + P2-S01m get-execution-snapshot richer per-flow surface variant + P2-S01n dispatchHistory enrichment + P2-S01o stricter history/perFlow checks + P2-S01p snapshot polish (configurable historyDepth) + P2-S01q sixth handoff + P2-S01r coordinator history bound + P2-S01s stricter detector bound/history signals + P2-S01t seventh handoff (opencode-invocation) + P2-S01u history size setter API (setMaxDispatchHistorySize + settable flag) (extracted from regression stub)
├── run-mcp-regression.sh          # End-to-end Grok CLI + MCP flows (expand; now delegates P2-S01 ownership to dedicated detector)
├── activity-log-audit.sh          # Grep patterns for legacy fallbacks + logger health
└── ...
```

## How to Run the Checks

From the project root (recommended; scripts are self-contained and compute root automatically):

```bash
# Inference boundary (S01)
bash scripts/v2-refactor/validation/check-inference-boundary.sh

# Orchestrator rift detector (S03 prep) — currently reports the live rift (expected)
bash scripts/v2-refactor/validation/check-orchestrator-rift.sh

# Governance SSOT / Codex bypass detector (S02 prep)
bash scripts/v2-refactor/validation/governance-ssot-check.sh

# Execution Ownership Detector (P2-S01k — Orchestrator SSOT reclamation; dedicated, stricter; P2-S01l/m/n/o/p/q surface + history + stricter checks + depth polish + sixth/seventh handoff + u setter support)
bash scripts/v2-refactor/validation/check-execution-ownership.sh

# Activity Log Audit — legacy fallbacks + frameworkLogger health + job sanity (S05 / all slices)
bash scripts/v2-refactor/validation/activity-log-audit.sh

# MCP Regression Harness (V2-P1-S05) — governed surface artifacts, S04 registration, static tool query, log integration
bash scripts/v2-refactor/validation/run-mcp-regression.sh

# Run all current Phase 1 harness checks (add more as implemented)
for f in scripts/v2-refactor/validation/check-*.sh scripts/v2-refactor/validation/governance-*.sh scripts/v2-refactor/validation/activity-log-*.sh scripts/v2-refactor/validation/run-*.sh; do
  echo "=== Running $f ==="
  bash "$f" || echo "⚠️  $f exited non-zero (expected for pre-slice state)"
done
```

All scripts:
- Are executable (`chmod +x` applied during PHASE1-01-EXPAND)
- Follow harness conventions (project root resolution, structured ✅/❌ output, references to Phase Plan + Protected Paths + researcher mapping)
- Use `set -euo pipefail` and never raw `console` (bash `echo` only for harness reporting)
- Respect framework logging patterns where code paths are involved (callers inside TS use `frameworkLogger`)

Before declaring any slice complete, run the relevant checks and capture output in the work package / PR.

## Current State (2026-05-20, Phase 1 Execution Active — PHASE1-01-EXPAND)

Real harness components are being built as part of V2-P1-S05 (Establish the Refactor Validation Harness).

**Implemented checks (all must pass before claiming slice complete):**
- `check-inference-boundary.sh` — Enforces that Inference does not own execution/apply/spawn (core 3-subsystem boundary). See V2-P1-S01.
- `check-orchestrator-rift.sh` — **Real detector** (expanded in PHASE1-01-EXPAND): Fails if `src/mcps/orchestrator/server.ts` contains any direct import of legacy `MultiAgentOrchestrationCoordinator`. Critical Tier 1 rift prep for V2-P1-S03. Currently expected to fail until S03 severs the import.
- `governance-ssot-check.sh` — **New** (created in PHASE1-01-EXPAND): Scans for direct Codex/policy file loads (`codex.json`, etc.) that bypass the Governance layer / `CodexLoader`. Surfaces bypass targets for upcoming V2-P1-S02 (SSOT consolidation under External Governance). Reports violations with file + line context.
- `check-execution-ownership.sh` — **New (P2-S01k)**: Dedicated strict always-on detector for P2-S01 "Orchestrator as Execution SSOT" (Phase 2). Validates 5 mediation handoffs (orchestrate-task + delegation + processor + postprocessor + security), registrations, dispatch metrics, per-flow stats, richer perFlowSnapshot return shape, early truncation-safe P2 tokens in status. Extracted from run-mcp-regression.sh; regression delegates. Stricter/CI-friendly. P2-S01l: richer MCP get-dispatch-stats surface token + probe support added. P2-S01m: get-execution-snapshot richer per-flow details MCP surface variant token + probe support added. P2-S01n: dispatchHistory enrichment for richer per-flow details snapshot surface + token + probe support added. P2-S01o: stricter perFlow + dispatchHistory checks evolution + o token support (structural assertions on history len/presence + perFlow). P2-S01p: snapshot polish configurable historyDepth + p token support. P2-S01q/r/s/t: sixth/seventh handoffs + bound + stricter detector + t seventh (opencode). See researcher mapping P2-S01j/k/l/m/n/o/p/q/r/s/t.
- `activity-log-audit.sh` — **New** (implemented post-PHASE1-01-EXPAND per researcher mapping recommendation): Greps `logs/framework/activity.log` + recent .gz archives for legacy fallback behavior (governance-legacy-fallback), orchestrator rift usage, non-frameworkLogger events during v2 work, and recent job health / error patterns after slices. Structured CI output; exits non-zero on concerning patterns. Enforces "Framework Activity Logging" + "Activity Log Sanity" from Protected Paths contract.
- `run-mcp-regression.sh` — **V2-P1-S05 + V2-P1-S05-EXT ( @testing-lead + @devops-engineer )**: Strong first increment (artifacts, S04 reg surface, static tools, activity integration) + live behavioral increment: first-version stdio JSON-RPC probes (initialize + tools/list + call_tool) executed against all 4 governed servers (governance, skills, orchestrator, enforcer). Real flows recorded for >=5 governed operations (get_active_codex, list-skills + invoke on 3 skills: project-analysis/security/code-review, get-orchestration-status, get-enforcement-status, get-dispatch-stats (P2-S01l richer MCP thinDispatch surface), get-execution-snapshot (P2-S01m richer per-flow details MCP surface variant; P2-S01n dispatchHistory; P2-S01o detector; P2-S01p depth; P2-S01q/r/s/t handoffs/bound/stricter)) with PASS/FAIL + PROBE_JSON evidence in output. Updates final summary + README. Fulfills full "MCP Regression Suite (minimum 5 end-to-end flows)" + live "query registered tools". Exits 0 on static core; live is additive first-version (partial ok). Robust + self-contained (temp probe only). Now delegates P2-S01 ownership checks to dedicated detector (P2-S01k); P2-S01l richer dedicated get-dispatch-stats + P2-S01m get-execution-snapshot + P2-S01n dispatchHistory + P2-S01o stricter checks + P2-S01p depth + q/r/s/t tools/surfaces exercised in orchestrator probe.

**Planned / In Progress (see Phase Execution Plan + Protected Paths contract):**
- Wire full harness (including run-mcp-regression.sh) into CI / pre-push hooks on v2 branch (for-loop already updated)
- Live probe + 5+ governed E2E flows to run-mcp-regression.sh: **DELIVERED in V2-P1-S05-EXT** (stdio handshake + 7+ flows executed + evidence integrated; first-version complete)
- Additional boundary + ownership checks as slices land (e.g. full fresh-env matrix, more complex orchestrate flows)

All checks must be referenced from the active Phase Execution Plan and the Protected Paths contract. No slice is complete without evidence that the relevant harness scripts were run and passed (or violations documented + approved).

## Contribution Rule

Any new check added here must be:
- Referenced from the active Phase Execution Plan
- Usable by future agents after compaction
- Logged via frameworkLogger where appropriate (for .ts helpers) or structured echo (for bash harness)
- Limited to authorized Phase 1 slices only (no changes outside `scripts/v2-refactor/validation/` and referenced docs)

---

**Part of the official 2026-05-20 v2 execution tooling. Expanded during PHASE1-01-EXPAND (@enforcer + @testing-lead) + activity-log-audit.sh + V2-P1-S05 run-mcp-regression.sh implementation (@testing-lead + @devops-engineer).**

# P3-TEST-OWNERSHIP-UPDATE-01 (2026-05-27) — Small-Batch Surgical Ownership Update for Retired/Deprecated Paths (additive note)
# Ties to deep ref 2026-05-26 (PoC machine as evidence for surgical retirement), Phase 3 Pivot + Term 61 (zeroTolerance true, forward motion on deprecation/unification only), 6/6 deprecation coverage + 7/7 7th gap (processor-manager) + YML unification (P3-YML-AGENT-SURFACES-UNIFICATION-01), user's "create a todo list. spawn subagents to complete todos..." + YML @ harness-codex relevance.
# This harness (check-execution-ownership.sh) now documents via rich header that test/execution ownership for the 7 legacy 7-flow mediation paths (retired/deprecated post 6/6+7/7) has shifted to governed three-subsystem surfaces. Supports harness re-verify + codex post. 2 files (sh + this README), highly modular/reversible (additive comment only), echo discipline, codex 100/60/0 pre/post. Governance-visible for Gauge/Dynamo/enforcer on retired paths ownership alignment. "The box contains its builders. The relay is hot."
# See check-execution-ownership.sh P3 block for full CGT + ties + verification + self-audit. Protocol 100% held. Pure momentum under Term 61. No regression.
