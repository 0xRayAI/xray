# V3 Enforcement Pipelines (Hooks + CI + PostProcessor)

**Version**: 3.3.1  
**Date**: 2026-06-11  
**Status**: Full enforcement cascade — all TUI/CLI integrations, CI (29 validators, coverage gate, consumer check, E2E smoke, scanners, governance detector), pre-commit (LightweightValidator), and consumer postinstall. Zero assumed enforcement.

## Overview
v3 enforcement is the "how the 4 plugins actually leverage the system" (per original hard discussion). No more assumed enforcement or dead-end hooks.

Two primary entry points (the "only way enforcement happens"):
1. **TUI/CLI Hook Surfaces** (programmatic, via integrations): `enforcement-gate.ts` (beforeToolHook + afterToolHook).
2. **CI/CD**: Direct `ValidatorRegistry` + consumer verification in PRs.

All feed the full chain: ValidatorRegistry (29) → (governance deliberation if proposal-like) → v3 `PostProcessor.executePostProcessorLoop` (with sub-engines + explicit 7/8/74/77 wiring) → escalation/metamorphosis → frameworkLogger + events.

**Full Enforcement Cascade** (3.3.0–3.3.1):
- **Pre-commit**: `LightweightValidator` (run-hook.js) via shared enforcement infrastructure
- **PR CI** (6-step enforcement job): enforce-validators.mjs (full 29) + coverage gate + consumer check + E2E pipeline smoke + compat shim scanner + orphan code pre-PR check + source-change governance detector
- **PostProcessor**: Escalation on gate-sourced critical violations via `EscalationEngine`, inference blocking (confidence ≤ 0.3)
- **Consumer**: Postinstall auto-installs pre-commit hook; `verify-consumer.sh` exercises gate + registry from tarball
- **Governance**: Retro ritual (Phase 0) records enforcement changes; source-change detector auto-submits proposals on governance-interest file edits

## 1. Hook Enforcement Pipeline (TUI/CLI Integrations)
**Purpose**: Every code-producing tool call from the 4 plugins goes through v3 (no parallel legacy in host files post-P0/P1).

**Components**:
- `src/integrations/enforcement-gate.ts` (single composed source):
  - `beforeToolHook(tool, args)`: Load full `globalValidatorRegistry` (29, no filter), validate, block on error/blocking severity, compute resonance, frameworkLogger.
  - `afterToolHook(...)`: Per-pipeline validators (error-resolution/7, loop-safety/8, boot-wiring/74, console-log-usage/77), legacy ProcessorManager compat (for test-auto-creation etc., documented), v3 `PostProcessor.executePostProcessorLoop` (monitoring/analysis/autofix/escalation/redeploy/compliance/SelfProposalEngine), governance routing via `handleGovernRequest` if proposal-like result, frameworkLogger.
  - Fallbacks: Prefer `xray*` globals (with deprecation log for `strRay*`), dynamic imports for consumer/dist.
- Wirings (exclusive calls, legacy excised):
  - OpenCode: `src/plugin/xray-codex-injection.ts` (tool.execute.before/after → gate; no more inline ProcessorManager post-path).
  - Hermes: `src/integrations/hermes-agent/hermes-agent-integration.ts` + `bridge.mjs` (onPreToolCall/onPostToolCall + pre/post-process → gate; full 29, no SNIPPET_SAFE).
  - Grok: `src/integrations/grok/hooks/pre-tool-use.ts` (PreToolUse for code tools → gate; real block + `allow_with_error` on failure).
  - OpenClaw: `src/integrations/openclaw/index.ts` + `hooks/xray-hooks.ts` (MCP tool.before/after + events → gate calls + enforcement data to Gateway).
- Public surface: `src/public/XrayService.ts` + re-exports in `src/index.ts`/`package.json` exports (clean `import { beforeToolHook } from '0xray'` or XrayService for future hosts).
- Events: mcp-client.ts ToolBefore/After → gate (OpenClaw subscribes).

**Data Flow** (plugin tool call → full v3):
Tool (write/edit) → beforeToolHook (registry scan + block) → tool executes → afterToolHook (validators + PostProcessor loop + governance if needed) → frameworkLogger + mcp events.

**Codex Terms Wired** (via matrix `integration-hook-service`):
8/74/77/79/80/81 (full 29 in before; per-pipeline + v3 loop in after). Terms 69-71 via governance routing.

**Testing**: Gate tests (before + after coverage), E2E in verify-consumer (now exercises gate in consumer tarball per v3.2.1), integration tests.

**Notes** (Codex-aligned):
- No dead ends/bridge: Hosts call gate only (P0/P1 excised duplicates, consistent logged fallbacks, prefer xray*).
- Part of pipeline: Explicit, not assumed. Legacy PM only inside gate for compat (documented, minimal).
- frameworkLogger everywhere in gate.

## 2. CI/CD Enforcement Pipeline
**Purpose**: Full registry on every PR/commit + consumer verification (closes "or in ci/cd" half of original requirement).

**Components**:
- `scripts/ci/enforce-validators.mjs`: Direct load of ValidatorRegistry (29, **no** snippet-safe filter from old bridge.mjs), ctx for write, run all, report violations, exit on count. Supports --all, explicit paths, or git diff auto-detect.
- `.github/workflows/ci.yml` enforcement job (6 steps):
  1. `enforce-validators.mjs --all` (full 29 validators)
  2. Coverage gate (vitest thresholds: stmts 60%, branches 50%, funcs 55%, lines 60%)
  3. Consumer package enforcement check (registry + gate exercise from tarball)
  4. E2E pipeline smoke test (4-step cascade: gate → escalation → CI → consumer)
  5. Compat shim scanner (term 78 — scans for legacy fallback patterns, non-blocking)
  6. Orphan code pre-PR check (term 73 — git diff deletion protocol, 6-check)
  7. **Source-change governance detector** (Phase 1 — auto-submits proposals when codex/enforcement files change)
- Consumer: `scripts/verify-consumer.sh` (Phase 5b: registry load + before/afterToolHook from installed tarball in temp consumer dir; runs in PR CI now).
- Consumer postinstall: `scripts/hooks/install-hooks.cjs` auto-installs pre-commit hook in consumer projects (called from postinstall.cjs + setup.cjs step 8). Idempotent, dev + consumer paths.
- Pre-commit: `scripts/hooks/run-hook.js` — inline regex replaced with `LightweightValidator` + gate call via dynamic import. Full shared enforcement path.
- Related: `ci-cd-auto-fix.cjs`, release.yml, other workflows.

**Data Flow**:
PR → CI enforcement (full 29 via script) → coverage gate → consumer pack/install/exercise → E2E pipeline smoke → compat shim scan → orphan code check → governance detection → activity.log + pass/fail.

**Codex Terms Wired** (ci-lint + ci-enforce-consumer + ci-pipeline-smoke + ci-compat-shim + ci-orphan-code + ci-governance-detect):
- 11 (tsc), 16/24/26/34/36/41/46/47 (now via enforce-validators full registry).
- 73 (orphan code), 75 (coverage gate), 76 (consumer verification), 78 (compat shim).
- 7/69-71/74/77/79-81 (cross-pipeline).
- Phase 1 source-change governance detector (governance-terms).

**Codex Changes (3.2.0 → 3.2.1)**: 8 ci-lint terms partial→wired, gapsRemaining reduced, ci-gate activeForTerms expanded, new ci-enforce-consumer pipeline entry.
**Addition (3.3.0–3.3.1)**: E2E pipeline smoke (4 pipelines), compat shim scanner (non-blocking), orphan code pre-PR check, coverage gate, consumer postinstall auto-hooks, LightweightValidator pre-commit, source-change governance detector.

**Testing**: 2880+ (gate + E2E consumer + pipeline smoke + scanners), typecheck clean.

**Notes**: Bypasses old bridge filter entirely. Script uses console for CI output (acceptable like run-hook; hygiene maintained elsewhere).

## 3. PostProcessor Pipeline (v3 Core, Now Reachable from Hooks/CI)
**Purpose**: Post-action intelligence (monitoring → analysis → fix → escalate → redeploy → self-evolve).

**v3 Components** (`src/postprocessor/PostProcessor.ts` + subdirs):
- `executePostProcessorLoop`: Explicit validator wiring (globalValidatorRegistry for 7/8/74/77 + context conversion from Map to string for RuleValidationContext).
- Sub-engines:
  - MonitoringEngine (ci-pipeline status, etc.).
  - FailureAnalysisEngine + CodeChangeAnalyzer.
  - AutoFixEngine + FixValidator.
  - EscalationEngine.
  - RedeployCoordinator.
  - ArchitecturalComplianceChecker (MCP calls).
  - SelfProposalEngine / MetamorphosisEngine (terms 69-71, scores, circuit breakers; triggered from gate/inference).
  - SuccessHandler, PostProcessorReporter, RegressionAnalysisService.
- Triggers: GitHookTrigger, WebhookTrigger, APITrigger (archive/cleanup, etc.).
- Integration: Now called from gate afterToolHook (and legacy paths for compat). Also from CI/consumer indirectly.

**Legacy Compat**: processor-manager.ts still exists/used inside gate for testAutoCreation etc. (no host-side duplicates post-cleanup).

**Data Flow** (from hooks): afterToolHook → validators + executePostProcessorLoop (full sub-engines) → escalation if needed → SelfProposal if meta → frameworkLogger + events.

**Codex**: Terms 7/8/74/77 wired explicitly. PostProcessor now escalates critical violations from gate context (severity error/blocking → EscalationEngine). Inference proposals with confidence ≤ 0.3 filtered.

**Testing**: Postprocessor tests, integration, E2E.

## Cross-Cutting + Other Pipelines (Summary Updates to Inventory)
- **Inference + Governance**: generateProposals (async, validators 1/3/5), handleGovernRequest (nucleus + 3 MCPs + Dynamo), SelfProposalEngine. Triggered from gate on proposals.
- **MCP/Tool Events**: mcp-client.ts events → gate (OpenClaw) + servers (enforcer-tools, governance, processor-pipeline).
- **Pre-commit/Git Hooks**: run-hook.js (TS + Codex/Console validator dynamic + inline) + log maintenance via PostProcessor triggers. Partially enhanced via gate for plugins.
- **CI/CD Consumer**: verify-consumer.sh (packaging + 4 E2E bridges + now gate/registry + plugin test + activity.log).
- **Logging**: frameworkLogger (all enforcement/gate/PostProcessor decisions → activity.log + .opencode/logs).
- **Boot/Nucleus**: v3 thin (kernel, orchestrator, plugin-registry, thin-dispatch) replaces old boot. Gate/PostProcessor activated here.
- **Orchestration/Routing/Reporting/Session/Security**: As in old inventory, but now integrated with enforcement (e.g., outcome tracking feeds inference/governance; compliance in PostProcessor).

**Undocumented/Partial (Cascade Focus)**:
- Interweaves/lenses processor implementations (enforcementGaps #1)
- ESLint deliberately neutered (enforcementGaps #2) — no opinionated lint changes

## Testing + Known-Good Status
- Gate + CI script + consumer: 2880 tests, tsc clean.
- Matrix now reflects reality (no assumed).
- Codex: Progress on 2/73-74/78 (no bridge/dead-ends/shims in hook surfaces); continue to close non-blocking gaps.

## Recommendations (for docusaurus + cascade)
- This doc + updated INVENTORY.md = SSOT.
- Add diagrams (from PIPELINE_ARCHITECTURES.md) for gate flow.
- Maintain: On every enforcement change, update here + docusaurus equivalent + codex matrix + reflection.

*Part of v3 cascade to complete, integrated, known-good system.*
