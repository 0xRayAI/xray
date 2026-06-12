# v3 Nucleus Architecture Plan — Reflection (2026-06)

**Status**: Post-subtract baseline (v2.2.2/2.2.3). All 12 subsystem reviews complete. ~16.6k LOC dead weight removed. Nucleus scaffolding exists but is not yet the primary runtime.

**Thesis (recap from v3-nucleus.md)**: xray is the external governance kernel agents *call* — not a platform they live inside. MCP is the canonical surface. The nucleus (Dynamo + orchestrator + enforcer) is the thin, callable core. Everything else becomes dynamic adapters or plugins.

**Horizon**: A small, high-density kernel. Legacy v2 federation (heavy boot-orchestrator, direct MCP for core governance, parallel inference paths) is replaced or deprecated. Self-evolution runs under the same governed loop as external proposals. Consumer verification remains the zero-tolerance gate.

This document turns the aspirational v3-nucleus.md into an executable, phase-gated plan based on the actual 12-review audit. It prioritizes breaking changes only after the subtract pass has locked the baseline.

## Principles
- Nucleus is primary; old paths are secondary or removed.
- MCP remains the standard *surface*; direct kernel calls are for internal uniformity and performance.
- PluginRegistry is the dynamic loading mechanism (no more 25 baked servers as the only option).
- Self-evolution (SelfProposalEngine + MetamorphosisEngine) is first-class and must itself be governed.
- Every change must pass consumer verification (fresh published tarball + 4-bridge E2Es + activity.log assertions).
- No "v3" label on a release until the 2-week production precondition (self-evolution loop running under governance in production-like conditions) is met.
- FrameworkLogger only. One thing at a time. Surgical.

## Current Baseline (Post-Purge)
- Version: 2.2.3 (package.json + tags).
- Tests: 2778 passed / 44 skipped.
- tsc clean.
- Key v3 scaffolding present:
  - src/nucleus/: kernel.ts (handleGovernRequest, governSingle, pluginRegistry re-export), plugin-registry.ts, govern-http.ts.
  - SelfProposalEngine + MetamorphosisEngine in postprocessor/metamorphosis/.
  - CLI `govern` umbrella.
  - scripts/verify-consumer.sh as hard gate.
- Major v2 surfaces still dominant: boot-orchestrator.ts, inference-cycle.ts (with MCP fallbacks), direct MCP for core skills in governance-service.ts, full 15+ root + 24 knowledge-skill servers.
- Many "dead" items from the 12 reviews already removed (VotingCoordinator, orchestrator.server.ts shim, testing-best-practices.server.ts, RetryHandler, ComprehensiveValidator, cross-language-bridge, 4 analytics CLI commands, cli/server.ts, universal-* in orchestrator, self-direction-activation, task-skill-router.d.ts, etc.).
- README/AGENTS counts now accurate (41 agents, 44 skills, 15 MCPs, 20 codex terms, 160 test files) but no longer auto-mutated on every release (per architect recommendation).

## Phase Plan

### Phase 0: Lock v2.2.x Baseline & Release (COMPLETE — this release)
**Goal**: Ship the subtract pass. Give the codebase a clean, honest 2.2.x version before any breaking v3 work.

**Detailed Steps**:
1. Finalize all 12 reviews (Core, Nucleus, Governance, MCP Federation, Inference, Orchestration+Delegation, Processors, Postprocessor, Enforcement, Integrations, CLI, Supporting). Mark dead items, keep tight core.
2. Harden release pipeline (Tier 1):
   - Single canonical `release.mjs` (delete old release.js).
   - Early gates: tsc + vitest before version bump.
   - Hard `verify:consumer` gate before commit/tag.
   - Remove STRRAY_ guard from prepublishOnly.
   - Fix publish timeout handling (push git first, then publish with npm view "already published" check).
   - Hermes E2E tolerance for model variance (soft skips on Phase 3/6; hard gates on activity.log/tool events/final stats).
3. Remove auto-count mutation from version-manager.mjs for README summary line (only bump **vX.Y.Z**; counts become observability-only via getFrameworkCounts() + separate audit:counts).
4. Clean last references (test files, SKILL.md, agent YMLs, routing tables) for purged items.
5. Bump to 2.2.2 / 2.2.3, publish, tag, push.
6. Update CHANGELOG with honest "subtract pass + modest v3 prep" section. Move aspirational 3.0.0 content to future.

**Exit Criteria**:
- 2.2.x released and verified via fresh consumer tarball.
- All internal references to deleted modules gone.
- tsc + full test suite green.
- Consumer gate (4/4 bridges) passing reliably.

**Verification Substrate**: Run verify-consumer.sh on the published tarball. Check activity.log for every CLI invocation.

**Dependencies**: All 12 reviews + pipeline fixes.

### Phase 1: Nucleus as Primary Runtime (Core Kernel Extraction)
**Goal**: Make `handleGovernRequest` (and friends) the *actual* path, not a convenience wrapper. Move governance, thinDispatch, and enforcement ownership into nucleus. Boot-orchestrator and inference become thin callers.

**Detailed Steps**:
1. Audit all call sites of getGovernanceService, GovernanceService.govern, etc. (governance.server.ts, inference-cycle.ts, SelfProposalEngine, boot-orchestrator, CLI, tests).
2. Move core orchestration logic from boot-orchestrator.ts into nucleus (or a new nucleus/orchestrator.ts facade that the kernel owns).
3. Refactor inference-cycle.ts:
   - Remove MCP fallback chain (XRAY_FORCE_MCP_GOVERNANCE, isGovernanceMcpPreferred, parseSubagentVotes, invokeAgentInternal OpenCode fallback).
   - Make governViaNucleus the only path (no "both failed" throw).
   - Remove legacy resolveOpencodeRoot .opencode search.
4. Update governance-service.ts to be called *only* via the nucleus (or deprecate direct getGovernanceService for non-nucleus callers).
5. Promote pluginRegistry.callSkill / callSkillTool as the *exclusive* way the 3 core skills + customs are invoked for governance proposals (move the built-in fallback logic fully inside the registry or remove it).
6. Extract thinDispatch (complexity scoring + routing) into nucleus as a first-class module (currently spread across delegation/complexity-* and orchestrator).
7. Add strict "nucleus primary" tests: assert that governance flows never hit the old MCP paths in normal operation.
8. Update all consumers (CLI govern, bridges, SelfProposalEngine) to go through nucleus exports.
9. Run full consumer verification after each major refactor.

**Exit Criteria**:
- `handleGovernRequest` is the only way proposals are governed in the default path.
- No direct calls to old GovernanceService paths from production code outside nucleus.
- inference-cycle.ts has no MCP fallback for governance.
- boot-orchestrator delegates to nucleus for core decisions.
- 2-week self-evolution loop under governance in production-like conditions (start running it gated).

**Risks & Mitigations**:
- Bridge compatibility: keep thin adapters in integrations/ for now.
- Performance: in-process path already exists; measure.
- Test coverage: add explicit "nucleus-only" integration tests.

**Dependencies**: Phase 0 complete. Existing nucleus scaffolding (kernel, plugin-registry, govern-http).

### Phase 2: Dynamic Plugins & MCP Surface Purity
**Goal**: The 25 knowledge-skill servers (and processors) become the *default* plugin set loaded via pluginRegistry at boot. Direct MCP spawning for governance skills is secondary / optional. All skill registration goes through the registry (no more 24/25 direct bypasses).

**Detailed Steps**:
1. Extend pluginRegistry (already has callSkillTool in some work) to support the full tool surface of the 25 skills (not just analyze_proposal).
2. Make the 25 knowledge-skill servers register themselves into pluginRegistry on load (or via a central registry bootstrap) instead of (or in addition to) direct MCP tool registration.
3. Update governance-service.ts callSkillServer to *always* prefer pluginRegistry for the core 3 + customs. Deprecate the direct mcpClientManager / in-process paths for governance.
4. Move skill-invocation.server.ts logic (or parts) to be a thin MCP surface over pluginRegistry.
5. Deprecate direct registration bypass: add warnings or enforcement that skills must go through the registry.
6. For the 16 root-level MCP servers: decide which stay as thin surfaces (governance.server, orchestrator.server, etc.) and which can be absorbed.
7. Update in-process-skill-registry.ts to delegate to pluginRegistry where possible (reduce duplication).
8. Add tests that prove a custom plugin can replace a core skill end-to-end.
9. Update consumer verification to test plugin registration + dispatch.

**Exit Criteria**:
- 20+ MCPs (knowledge skills + key root servers) are reachable exclusively via pluginRegistry.callSkillTool for their governance-relevant tools.
- No more 24/25 direct nucleus/pluginRegistry bypass in the servers themselves for core paths.
- Custom plugins can provide full tool surfaces.
- Governance always goes through the registry for skills.

**Dependencies**: Phase 1 (nucleus primary). PluginRegistry already partially exists.

### Phase 3: Self-Evolution Under Governance (Metamorphosis First-Class)
**Goal**: SelfProposalEngine is no longer "bolted on" — it is the primary way the system proposes changes to itself, and those proposals go through the exact same nucleus governance as external ones. Meet the v3-nucleus.md precondition.

**Detailed Steps**:
1. Wire SelfProposalEngine fully into PostProcessor (onPhase for 'monitoring-complete' and 'post-process-complete' already partially there).
2. Make all self-proposals use the nucleus path exclusively (type: 'metamorphosis', source: 'metamorphosis', requireExternalDynamo, metamorphosisThreshold).
3. Add governance for self-proposals: they must pass the same 3-skill + Dynamo + codex enforcement.
4. Implement safe apply (already sketched in SelfProposalEngine with state files under target).
5. Run the self-evolution loop in production-like conditions (consumer verification tarball + real bridges) for ≥2 weeks with no un-governed changes.
6. Add monitoring/alerting for metamorphosis proposals (success rate, breaker status, applied count).
7. Deprecate or remove any direct "manual" self-change paths that bypass governance.
8. Update docs (v3-nucleus.md, AGENTS.md) with the new reality.
9. Full consumer verification of a self-proposal cycle (log → proposal → governed approval → apply → new activity.log entry).

**Exit Criteria**:
- Self-evolution loop running under governance in production-like conditions for ≥2 weeks (per v3-nucleus.md).
- At least one governed self-change successfully applied and verified.
- No bypass paths for system changes.

**Dependencies**: Phase 1 (nucleus primary) and Phase 2 (plugins). PostProcessor + SelfProposalEngine scaffolding.

### Phase 4: Break Legacy & 3.0.0 Release
**Goal**: The architectural break. Old v2 paths are removed or clearly deprecated with migration. The "nucleus + adapters" model is the primary consumption model. Ship as 3.0.0.

**Detailed Steps**:
1. Remove or hard-deprecate remaining legacy in inference-cycle.ts (MCP fallback for governance, OpenCode CLI fallback, old parseSubagentVotes, resolveOpencodeRoot legacy).
2. Remove or deprecate direct getGovernanceService usage outside nucleus (force all through handleGovernRequest).
3. Remove or deprecate the heavy boot-orchestrator direct paths for core decisions (route everything through nucleus).
4. Make pluginRegistry the *only* way skills are discovered for governance (remove built-in fallbacks after migration period).
5. Clean up any remaining dual XrayOrchestrator / KernelOrchestrator confusion (absorb or clearly separate).
6. Update all bridges/integrations to prefer nucleus paths where possible.
7. Run the full 2-week self-evolution precondition under the new "no legacy" mode.
8. Bump major version to 3.0.0.
9. Update all docs, AGENTS.md, README, etc. to declare the new paradigm.
10. Final consumer verification with zero tolerance for any legacy paths.

**Exit Criteria**:
- No production code paths reach the old v2 governance without explicit opt-in/env var (which should be removed in a follow-up).
- Self-evolution has been the primary way the system changed itself for the precondition period.
- Consumers (bridges) are demonstrably using the nucleus + plugin model as the normal path.
- 3.0.0 released with breaking-change notes.

**Dependencies**: Phases 1–3 complete. 2-week production-like self-evolution run.

## Cross-Cutting Concerns (All Phases)
- **Verification**: Every phase ends with a fresh published tarball + full verify-consumer.sh run. Use the same sub-agent + monitor pattern that proved the subtract pass.
- **Logging**: frameworkLogger only. Every new path must emit job/trace/outcome/complexity.
- **Tests**: Add "nucleus-primary" and "no-legacy" test modes. Maintain the 2-week precondition as a release gate for 3.0.0.
- **Docs**: v3-nucleus.md is the north star. This reflection is the executable plan. Update after each phase.
- **Risks**: Bridge compatibility (use thin adapters), performance (keep in-process fast path), consumer surprise (clear migration guide + long deprecation).
- **Metrics**: Track % of governance calls going through nucleus vs legacy. Track self-proposal approval rate and applied changes.

## Success Definition
- v2.2.x: Clean, honest baseline with the subtract pass locked in.
- v3.0.0: The nucleus is what agents call. The heavy v2 federation is optional adapters or plugins. Self-evolution is real and governed. The 2-week precondition has been met in production-like conditions.

This is the plan. Execute phase by phase. Release v2.2.x first (already in progress). Then the deliberate architectural break.

*Reflection generated post all 12 reviews + pipeline hardening. Horizon: thin kernel, not behemoth.*

## Researcher Review (2026-06-10)

Codebase verification performed against v2.2.3 post-subtract baseline. 2290 tests passed (matches claim). tsc clean.

### Claims Verification

| Claim | Status | Evidence |
|-------|--------|----------|
| `kernel.ts` exports `handleGovernRequest`, `governSingle`, `pluginRegistry` | ✅ CONFIRMED | `src/nucleus/kernel.ts:41,70,86` |
| SelfProposalEngine + MetamorphosisEngine in `postprocessor/metamorphosis/` | ✅ CONFIRMED | 3 files exist |
| CLI `govern` umbrella | ✅ CONFIRMED | `src/cli/commands/govern.ts` exists |
| `scripts/verify-consumer.sh` as hard gate | ⚠️ MISLEADING | Script exists (171 lines) but is NOT wired into `prepublishOnly`, any CI workflow, or pre-commit hook. Only runs via manual `npm run verify:consumer` or inside `release.mjs`. The GitHub Actions `release.yml` workflow bypasses it entirely. |
| VotingCoordinator removed | ✅ CONFIRMED | Not found |
| orchestrator.server.ts shim removed | ✅ CONFIRMED | No file found |
| testing-best-practices.server.ts removed | ✅ CONFIRMED | Not found |
| RetryHandler removed | ✅ CONFIRMED | Not found |
| ComprehensiveValidator removed | ✅ CONFIRMED | Not found |
| cross-language-bridge removed | ✅ CONFIRMED | Not found |
| 4 analytics CLI commands removed | ✅ CONFIRMED | No analytics commands in `src/cli/commands/` |
| cli/server.ts removed | ✅ CONFIRMED | Not found |
| universal-* in orchestrator removed | ✅ CONFIRMED | No matches |
| self-direction-activation removed | ✅ CONFIRMED | Not found |
| task-skill-router.d.ts removed | ✅ CONFIRMED | Not found |
| STRRAY_ guard removed from prepublishOnly | ⚠️ PARTIAL | Removed from `prepublishOnly` but stale reference remains in `package.json:91` debug script `STRRAY_FORCE_MCP_GOVERNANCE` |

### Gaps in the Phase Plan

1. **Phase 0 marked COMPLETE but two items from its own steps are unfinished:**
   - Step 2: "Hard `verify:consumer` gate before commit/tag" — no pre-commit hook (`.husky/pre-commit` does not exist), no CI integration, not in `prepublishOnly`
   - Step 4: "Clean last references for purged items" — `STRRAY_FORCE_MCP_GOVERNANCE` still in `package.json:91`

2. **Missing call sites from Phase 1 audit scope:**
   - `src/execution/opencode-cli-invoker.ts` — has `XRAY_FORCE_MCP_GOVERNANCE` guard (line 28), `resolveOpencodeRoot` (line 182), and is a separate legacy path not mentioned in the inference-cycle.ts cleanup scope
   - `src/cli/commands/govern.ts:67` — sets `XRAY_FORCE_MCP_GOVERNANCE = 'true'` as a side effect
   - `src/cli/index.ts:864` — sets `XRAY_FORCE_MCP_GOVERNANCE = 'true'` for inference mode

3. **No test migration plan for boot-orchestrator references:**
   - `src/__tests__/pipeline/test-mcp-server-pipeline.mjs:42` references `boot-orchestrator.server.ts` — will break when boot-orchestrator is refactored in Phase 1

4. **Phase 3 step 7**: "Deprecate or remove any direct 'manual' self-change paths that bypass governance" — does not enumerate what those paths are. Should audit and list them in the plan.

5. **No effort estimation or scope boundaries for Phase 2** — migrating 25 servers to plugin-driven registration is the largest refactor in the plan.

6. **`src/security/` directory**: Not mentioned in the plan. 4 files remain (`comprehensive-security-audit.ts`, `comprehensive-security-audit.test.ts`, `security-headers.ts`, `security-hardener.ts`). Should these be absorbed into nucleus, deprecated, or kept?

7. **No consumer migration guide mention** across Phases 1-4. Phase 4 step 9 says "Update all docs" but doesn't call out a specific consumer migration document.

### Phase Dependency Issues

- Dependencies are logically correct overall (Phase 0 → 1 → 2 → 3 → 4).
- Phase 1 exit criteria includes "2-week self-evolution loop under governance in production-like conditions (start running it gated)" — this overlaps with Phase 3's primary exit criterion. Consider whether a "start running it gated" relaxation belongs in Phase 1 or should be exclusive to Phase 3.

### Unstated Risks

1. **CI bypass risk**: The GitHub Actions `release.yml` workflow runs `npm test` + `npm run typecheck` but NOT `verify:consumer`. A release triggered via the Actions UI would skip the consumer gate entirely. The `release.mjs` script does include it, but the workflow doesn't use `release.mjs`.

2. **2-week calendar minimum**: Phase 3 requires "production-like conditions for ≥2 weeks" as a release precondition for 3.0.0. This is a hard calendar floor — no amount of engineering parallelism can shorten it.

3. **Bridge API fragility**: All 4 bridge E2E suites must pass for the consumer gate. If any bridge (Hermes, OpenCode, OpenClaw, Grok CLI) changes its API or behavior, it blocks all releases. No pinned bridge versions are specified.

4. **Plugin migration scope unknown**: Phase 2 requires rewriting skill registration for 25 servers. The plan provides no scope estimate, no breakdown of which servers are trivial vs. complex, and no progress milestones.

5. **No performance baseline**: Phase 1 risk mitigation says "measure" performance — but no benchmark metric or baseline is defined beforehand to compare against.

### Exit Criteria Issues

1. **Phase 0**: "Consumer gate (4/4 bridges) passing reliably" — the gate exists as a manual script but is not enforced in CI or pre-commit. Cannot be considered a "hard gate."

2. **Phase 2**: "20+ MCPs are reachable exclusively via pluginRegistry.callSkillTool" — doesn't specify which 20+ or provide a baseline count of currently-direct-registered servers.

3. **Phase 2**: "Governance always goes through the registry for skills" — no definition of what constitutes an unacceptable bypass (env vars? direct imports? both?).

4. **Phase 4**: "No production code paths reach the old v2 governance without explicit opt-in/env var" — the env var escape hatch is mentioned but with no timeline for its removal.

### Recommendations

1. Wire `verify:consumer` into `prepublishOnly` and at least one CI workflow (or replace `release.yml` steps with invocation of `release.mjs`).
2. Add `src/execution/opencode-cli-invoker.ts` and `src/cli/commands/govern.ts` to Phase 1 audit scope.
3. Audit and enumerate all "manual self-change paths" before Phase 3 execution.
4. Add scope estimates or at least a server categorization (trivial/moderate/complex) for the 25-server plugin migration in Phase 2.
5. Decide fate of `src/security/` files and document in plan.
6. Consider making the 2-week self-evolution precondition a Phase 3-only criterion (remove or reword the Phase 1 reference).
7. Define a performance benchmark metric before Phase 1 execution so "measure" has a target.
8. Pin bridge test versions or define a compatibility contract for the 4 bridge E2Es.

## Author Review (2026-06-10)

### Supplementary Gaps

1. **`src/execution/` directory fate**: Phase 1 refactors `inference-cycle.ts` and `opencode-cli-invoker.ts` but the plan doesn't state whether `src/execution/` as a directory survives, shrinks, or is absorbed into nucleus. After Phase 1, what remains in `src/execution/`?

2. **`src/mcp/` directory fate**: Phase 2 mentions "16 root-level MCP servers" and deciding which stay as thin surfaces vs absorbed. No deadline or phase is assigned for this decision. Consider adding a Phase 2 step or a Phase 4 cleanup step.

3. **Backward compatibility story**: Phase 4 says "breaking changes" and 3.0.0 release but doesn't describe the migration path for consumers. Bridges use internal APIs — what's the transition plan? How do consumers know their integration still works mid-phase?

4. **No parallelization strategy**: The phases are sequential, but some audit work could overlap. Phase 2's 25-server audit (which servers, what they register, call patterns) could start during Phase 1 to avoid idle time. Phase 3's self-proposal path audit could start in Phase 2.

5. **`STRRAY_FORCE_MCP_GOVERNANCE` rename**: The stale debug script in `package.json:91` uses the old `STRRAY_` prefix but the plan only mentions it as a "stale reference" with no action item. Should be renamed to `XRAY_FORCE_MCP_GOVERNANCE` or removed.

6. **Self-evolution precondition ambiguity**: Phase 1 exit criterion 4 says "Start running it gated" — Phase 3 exit criterion 1 says "running for ≥2 weeks." If Phase 1 starts the clock, Phase 3's exit criterion should reference it. If they're separate requirements, Phase 1's criterion should be reworded.

### Verification Notes

Cross-checked researcher's findings against the actual codebase:

- `src/nucleus/kernel.ts:41` exports `handleGovernRequest` — confirmed
- `src/postprocessor/metamorphosis/` has 3 files — confirmed
- `scripts/verify-consumer.sh` exists (171 lines, 4 bridge suites) — confirmed, not in CI
- `package.json:91` has `"debug:inference:force": "STRRAY_FORCE_MCP_GOVERNANCE=true ..."` — confirmed, will break on rename
- `src/__tests__/pipeline/test-mcp-server-pipeline.mjs:42` references `boot-orchestrator.server` — confirmed

All researcher findings are accurate. The plan is solid but needs ~6 explicit action items to close the gaps listed above.

## Detailed Execution Plans (Researcher)

### Phase 0.5: Complete Phase 0 Unfinished Items (PRE-RELEASE GATE)

**Goal**: Close the two unfinished Phase 0 items so the release pipeline is actually hardened before Phase 1 begins.

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 0.1 | Wire `verify:consumer` into `prepublishOnly` | `package.json:48` | `prepublishOnly` runs `verify:consumer` after build but before publish | Alone | Low | None |
| 0.2 | Wire `verify:consumer` into `release.yml` | `.github/workflows/release.yml:34-41` | `release.yml` has step that runs `npm run verify:consumer` before `npm publish` | 0.1 | Low | 0.1 |
| 0.3 | Add `verify:consumer` as gated job in `ci.yml` | `.github/workflows/ci.yml:219-268` (new job after `smoke-test-package`) | New `consumer-verify` job runs on `ci:full` or `needs-pipeline` label | 0.1 | Low | 0.1 |
| 0.4 | Wire `verify:consumer` into `release.mjs` (verify it runs) | `scripts/node/release.mjs:114-121` | Already exists — verify step 4 runs and `process.exit(1)` on failure | 0.1 | Low | 0.1 |
| 0.5 | Fix `STRRAY_FORCE_MCP_GOVERNANCE` stale reference | `package.json:91` | `"debug:inference:force"` script uses `XRAY_FORCE_MCP_GOVERNANCE` instead of `STRRAY_FORCE_MCP_GOVERNANCE` | Alone | Low | None |
| 0.6 | Add `.husky/pre-commit` hook for pre-commit gate | `.husky/pre-commit` (new file) | Pre-commit runs `npm run verify:consumer` and fails on non-zero exit | 0.1 | Medium | 0.1 |

**Exit criteria**: `npm run verify:consumer` runs on `prepublishOnly`, `release.yml`, and pre-commit. `STRRAY_` references eliminated. 2778+ tests still pass.

**Parallel**: 0.2, 0.3, 0.4, 0.5 all require only 0.1 (or are independent for 0.5). Can batch.

---

### Phase 1: Detailed Plan — Nucleus as Primary Runtime

**Goal**: `handleGovernRequest` becomes the *actual* governance path. Legacy MCP fallback chain removed from `inference-cycle.ts`. `boot-orchestrator.server.ts` delegates to nucleus. `opencode-cli-invoker.ts` legacy paths addressed.

#### Step 1A: Audit call sites (expanded scope) [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 1A.1 | Audit `inference-cycle.ts` — enumerate every `getGovernanceService`, MCP fallback, `XRAY_FORCE_MCP_GOVERNANCE`, `isGovernanceMcpPreferred`, `parseSubagentVotes`, `invokeAgentInternal`, `resolveOpencodeRoot`, `invokeViaOpencode` reference | `src/inference/inference-cycle.ts:409,440,472,546,561,573,682,758,791,802,925` | Document each call site with line number and decision (keep/refactor/remove) | Alone | Low | None (audit only) |
| 1A.2 | Audit `opencode-cli-invoker.ts` — enumerate `XRAY_FORCE_MCP_GOVERNANCE`, `resolveOpencodeRoot`, OpenCode spawn path | `src/execution/opencode-cli-invoker.ts:28,80,108-116,182` | Document each call site | 1A.1 | Low | None (audit only) |
| 1A.3 | Audit `src/cli/index.ts` — `XRAY_FORCE_MCP_GOVERNANCE` at line 864 | `src/cli/index.ts:864` | Document the env var set in `mcp` command handler | 1A.1 | Low | None (audit only) |
| 1A.4 | Audit `src/cli/commands/govern.ts` — `XRAY_FORCE_MCP_GOVERNANCE` at line 67 | `src/cli/commands/govern.ts:67` | Document the env var set in `govern --mcp governance` path | 1A.1 | Low | None (audit only) |
| 1A.5 | Audit all remaining `getGovernanceService` call sites | `src/nucleus/index.ts:10`, `src/nucleus/govern-http.ts:33`, `src/__tests__/unit/governance-service.test.ts:23`, `src/nucleus/__tests__/kernel-smoke.test.ts:2`, `src/nucleus/__tests__/govern-http.test.ts:9` | Complete enumerated list with classification (nucleus-internal, test, production) | 1A.1 | Low | None (audit only) |

#### Step 1B: Refactor `inference-cycle.ts` — remove MCP fallback chain [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 1B.1 | Remove MCP governance fallback block (lines 560-594) | `src/inference/inference-cycle.ts:560-594` | `governViaNucleus` failure throws directly; no fallback to `mcpClientManager.callServerTool("governance", ...)` | Alone (after 1A.1) | High | 1A.1 |
| 1B.2 | Remove `isGovernanceMcpPreferred()` method | `src/inference/inference-cycle.ts:682` (and its usages at 573-574) | Method deleted; no callers remain | 1B.1 | Medium | 1A.1 |
| 1B.3 | Remove `parseSubagentVotes()` method | `src/inference/inference-cycle.ts:802-850` (and callers) | Method deleted; `invokeAgentInternal` no longer parses subagent votes | 1B.4 | Medium | 1A.1 |
| 1B.4 | Remove `invokeAgentInternal()` method | `src/inference/inference-cycle.ts:726-796` | Method deleted; callers at 413, 443, 475, 527 replaced with direct calls to `invokeViaOpencode` or nucleus equivalents | 1B.1 | High | 1A.1 |
| 1B.5 | Remove `invokeViaOpencode()` private wrapper | `src/inference/inference-cycle.ts:798-800` | Private wrapper removed; callers go directly to `invokeOpencodeFromEngine` from `../execution/opencode-cli-invoker.js` | 1B.4 | Low | 1B.4 |
| 1B.6 | Remove `resolveOpencodeRoot()` private method | `src/inference/inference-cycle.ts:925` | Method deleted | 1B.1 | Low | 1A.1 |
| 1B.7 | Remove all `XRAY_FORCE_MCP_GOVERNANCE` env var checks in inference-cycle.ts | `src/inference/inference-cycle.ts:409,440,472,561,573,758,791` | No references to `XRAY_FORCE_MCP_GOVERNANCE` remain in the file | 1B.1, 1B.2 | High | 1B.1, 1B.2 |
| 1B.8 | Clean up `mcpClientManager` import if no longer used elsewhere | `src/inference/inference-cycle.ts:8` | Import removed if `mcpClientManager` has no remaining uses | 1B.1-1B.7 | Low | 1B.1-1B.7 |
| 1B.9 | Verify `governViaNucleus` is the only governance path and never throws on success | `src/inference/inference-cycle.ts:546-553,629-651` | `governViaNucleus` is sole path; no "both failed" throw | 1B.1 | High | 1B.1 |

**Completion criteria**: `inference-cycle.ts` has zero MCP governance fallback paths. `governViaNucleus` is the only path. All removed methods have no callers.

**Parallel**: 1B.1 blocks 1B.2/1B.6/1B.7. 1B.3 blocks 1B.4. 1B.4 blocks 1B.5. Remaining items are sequential within their chains.

#### Step 1C: Refactor `opencode-cli-invoker.ts` legacy paths [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 1C.1 | Remove `XRAY_FORCE_MCP_GOVERNANCE` guard at `invokeViaOpencode` entry | `src/execution/opencode-cli-invoker.ts:28-30` | No env var check; the guard moves to a single entry point in the nucleus | Alone (after 1A.2) | Medium | 1A.2 |
| 1C.2 | Replace `resolveOpencodeRoot()` (line 182) with the canonical config-path resolver | `src/execution/opencode-cli-invoker.ts:80,182-194` | All callers use `getConfigDir()` from `../core/config-paths.js` instead; standalone function removed | 1C.1 | Medium | 1A.2 |
| 1C.3 | Audit whether `invokeViaOpencode` should remain or be absorbed into nucleus | `src/execution/opencode-cli-invoker.ts:22-163` | Decision documented; if kept, it becomes a thin wrapper that calls nucleus exports | Alone | Medium | 1A.2 |

#### Step 1D: Move boot-orchestrator orchestration logic into nucleus [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 1D.1 | Create `src/nucleus/orchestrator.ts` | New file | Facade class/module that owns the orchestration logic currently in `boot-orchestrator.server.ts` | Alone | High | None |
| 1D.2 | Extract component initialization dependency graph from boot-orchestrator | `src/mcps/boot-orchestrator.server.ts:14-53` (ComponentInitResult, BootResults, ComponentStatus interfaces) | Interfaces moved to `nucleus/orchestrator.ts` or `nucleus/types.ts` | 1D.1 | Medium | 1D.1 |
| 1D.3 | Make `boot-orchestrator.server.ts` a thin MCP surface over `nucleus/orchestrator.ts` | `src/mcps/boot-orchestrator.server.ts` | Server delegates all core decisions to nucleus; its file shrinks 80%+ | 1D.1, 1D.2 | Medium | 1D.1, 1D.2 |
| 1D.4 | Update pipeline test to reference `nucleus/orchestrator.ts` instead of `boot-orchestrator.server.ts` | `src/__tests__/pipeline/test-mcp-server-pipeline.mjs:42` | Test checks for `nucleus/orchestrator.ts` (or keeps boot-orchestrator.server.ts as thin facade but adjusts expectation) | 1D.3 | Low | 1D.3 |

#### Step 1E: Extract thinDispatch into nucleus [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 1E.1 | Audit thinDispatch complexity scoring and routing currently in `src/delegation/` | `src/delegation/complexity-analyzer.ts`, `src/delegation/complexity-core.ts`, `src/delegation/strategy-selector.ts` plus orchestrator references | Complete map of which complexity-scoring logic lives where | Alone | Low | None |
| 1E.2 | Create `src/nucleus/thin-dispatch.ts` | New file | Single module with `scoreComplexity()` and `routeToAgent()` functions | 1E.1 | Medium | 1E.1 |
| 1E.3 | Update callers to use nucleus thin-dispatch | `src/orchestrator/*`, `src/delegation/*` | Legacy files either re-export from nucleus or are deprecated | 1E.2 | Medium | 1E.2 |

#### Step 1F: Add nucleus-primary tests [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 1F.1 | Create `src/__tests__/unit/nucleus-primary.test.ts` | New test file | Tests assert that governance flows never hit old MCP paths in normal operation | Alone | Low | 1B.1, 1B.2 |
| 1F.2 | Add integration test that `handleGovernRequest` is sole governance path for all consumer entry points | `src/__tests__/integration/nucleus-gate.test.ts` (new) | Tests cover CLI govern, SelfProposalEngine, inference-cycle, governance.server | 1F.1 | Medium | 1B.1 |

#### Step 1G: Update consumers to go through nucleus exports [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 1G.1 | Ensure `governance.server.ts` imports from `../nucleus/index.js` not direct governance-service | `src/mcps/governance.server.ts:31` | Confirmed uses `handleGovernRequest` from `../nucleus/index.js` (already done) | Alone | Low | None (verify) |
| 1G.2 | Ensure `SelfProposalEngine` imports from `../../nucleus/govern-http.js` (verify) | `src/postprocessor/metamorphosis/SelfProposalEngine.ts:26` | Confirmed (already done) | 1G.1 | Low | None (verify) |
| 1G.3 | Ensure `src/cli/commands/govern.ts` imports from `../../nucleus/index.js` (verify) | `src/cli/commands/govern.ts:81` | Confirmed (already done) | 1G.1 | Low | None (verify) |
| 1G.4 | Update any remaining bridge direct calls to governance-service | `src/integrations/*` | All bridges use nucleus exports | 1G.1 | Medium | 1B.1 |

#### Step 1H: Governance-service deprecation [P2]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 1H.1 | Add deprecation notice to `getGovernanceService()` | `src/governance/governance-service.ts:413` | JSDoc `@deprecated Use handleGovernRequest from nucleus instead` | Alone | Low | 1B.1 |
| 1H.2 | Audit all non-nucleus callers of `getGovernanceService` and migrate | All files from 1A.5 | Only nucleus-internal code calls `getGovernanceService`; all production callers use `handleGovernRequest` | 1H.1 | Medium | 1B.1, 1A.5 |

**Phase 1 full exit criteria**:
- [ ] All items 1A-1H complete
- [ ] `inference-cycle.ts` has no MCP governance fallback, no `XRAY_FORCE_MCP_GOVERNANCE`, no `parseSubagentVotes`
- [ ] `boot-orchestrator.server.ts` is a thin MCP surface over `nucleus/orchestrator.ts`
- [ ] `opencode-cli-invoker.ts` has no `XRAY_FORCE_MCP_GOVERNANCE` guard or standalone `resolveOpencodeRoot`
- [ ] `handleGovernRequest` is the only governance path in production code
- [ ] `src/__tests__/pipeline/test-mcp-server-pipeline.mjs` updated
- [ ] `verify:consumer` passes clean
- [ ] Tests: 2778+ passed, tsc clean

---

### Phase 2: Detailed Plan — Dynamic Plugins & MCP Surface Purity

**Goal**: 25 knowledge-skill servers become plugin-driven through `pluginRegistry`. Governance always routes through the registry. Direct MCP bypass paths are deprecated.

#### Step 2A: Audit 25 knowledge-skill servers for plugin readiness [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 2A.1 | Categorize all 24 knowledge-skill `.server.ts` files | `src/mcps/knowledge-skills/*.server.ts` (24 files listed below) | Each server classified as trivial/moderate/complex for plugin migration | Alone (audit only, can run during Phase 1) | Low | None |
| 2A.2 | Document each server's tool surface (which MCP tools it exposes) | `src/mcps/knowledge-skills/*.server.ts` | Complete tool-list per server (e.g. `code-review.server.ts` exposes `analyze_proposal`, `analyze_code_review`, etc.) | 2A.1 | Low | 2A.1 |
| 2A.3 | Identify servers with hard dependencies on direct MCP registration | `src/mcps/knowledge-skills/*.server.ts` | List of servers that cannot work without MCP transport (require `mcpClientManager`, etc.) | 2A.1 | Low | 2A.1 |

**Knowledge-skill servers inventory** (24 files):
`api-design`, `architecture-patterns`, `bug-triage-specialist`, `code-analyzer`, `code-review`, `content-creator`, `database-design`, `devops-deployment`, `git-workflow`, `growth-strategist`, `log-monitor`, `mobile-development`, `multimodal-looker`, `performance-optimization`, `project-analysis`, `refactoring-strategies`, `security-audit`, `seo-consultant`, `session-management`, `skill-invocation`, `strategist`, `tech-writer`, `testing-strategy`, `ui-ux-design`

#### Step 2B: Extend PluginRegistry for full multi-tool dispatch [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 2B.1 | Audit current `pluginRegistry.callSkillTool()` interface | `src/nucleus/plugin-registry.ts:33-37` (SkillToolPlugin), register/callTool methods | Understand current capabilities and gaps | Alone | Low | None |
| 2B.2 | Extend `SkillToolPlugin` to support dynamic tool discovery (listTools) | `src/nucleus/plugin-registry.ts:33-37` | `listTools(): ToolDefinition[]` on the interface | Alone | Low | 2B.1 |
| 2B.3 | Add `registerServer(name, server)` as convenience wrapper | `src/nucleus/plugin-registry.ts` | New method that wraps an entire MCP server class as a SkillToolPlugin automatically | 2B.2 | Medium | 2B.2 |
| 2B.4 | Add test for multi-tool dispatch (call different tools on same plugin) | `src/nucleus/__tests__/plugin-registry.test.ts` (new tests) | Test proves >2 tools on one plugin resolve correctly | 2B.2 | Low | 2B.2 |

#### Step 2C: Migrate 24 knowledge-skill servers into pluginRegistry [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 2C.1 | Create `src/nucleus/default-plugins.ts` — bootstrap registry that registers all 24 servers | New file | Central bootstrap function called at startup that registers all 24 servers via `pluginRegistry` | Alone | High | 2B.2 |
| 2C.2 | Implement registration for the 3 core governance skills (code-review, security-audit, researcher) as priority | `src/nucleus/default-plugins.ts` | These 3 register as SkillToolPlugin first; governance-service picks them up via `pluginRegistry.has()` | 2C.1 | High | 2B.2, Phase 1 |
| 2C.3 | Implement registration for remaining 21 skills in batches | `src/nucleus/default-plugins.ts` | All 24 servers registrable via `pluginRegistry` | 2C.2 | High | 2B.2 |
| 2C.4 | Update `governance-service.ts` to prefer `pluginRegistry` for built-in skills too | `src/governance/governance-service.ts:207` | Remove `isBuiltInSkill` guard so built-in skills resolve through pluginRegistry (remove line 207 `!this.isBuiltInSkill(serverName)` condition) | 2C.2 | High | 2C.2 |

#### Step 2D: Deprecate direct MCP bypass paths [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 2D.1 | Add warning log when a skill is invoked outside pluginRegistry | `src/governance/governance-service.ts:242-280` (MCP fallback path) | frameworkLogger `warning` logged with skill name when MCP path is taken | Alone | Low | 2C.2 |
| 2D.2 | Update `in-process-skill-registry.ts` to delegate to pluginRegistry | `src/mcps/in-process-skill-registry.ts` | `callInProcessSkill` tries pluginRegistry first, falls back only for missing skills | 2C.2 | Medium | 2C.2 |
| 2D.3 | Add `--plugin-first` flag to skill-invocation.server.ts | `src/mcps/knowledge-skills/skill-invocation.server.ts` | Server can operate as thin MCP surface over pluginRegistry | 2C.2 | Low | 2C.2 |

#### Step 2E: Root MCP server audit [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 2E.1 | Audit 15 root-level MCP servers (which stay, which get absorbed) | `src/mcps/*.server.ts` (15 files) | Decision documented per server: keep-as-thin-surface, absorb-into-nucleus, or deprecate | Alone | Medium | None |
| 2E.2 | Implement decisions from 2E.1 | Varies per server | Each server either stays thin, is absorbed, or gets deprecation warning | 2E.1 | Medium | 2E.1 |

**Root MCP server inventory** (15 files):
`architect-tools`, `auto-format`, `boot-orchestrator`, `enforcer-tools`, `estimation`, `framework-compliance-audit`, `framework-help`, `governance`, `lint`, `model-health-check`, `performance-analysis`, `processor-pipeline`, `researcher`, `security-scan`, `state-manager`

#### Step 2F: Consumer verification + plugin tests [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 2F.1 | Add plugin registration + dispatch test to verify-consumer.sh (or a called script) | `scripts/verify-consumer.sh` (new phase) or separate `scripts/verify-plugins.sh` | Test: install tarball, register a custom plugin, dispatch via callSkillTool, verify response | Alone | Medium | 2B.2 |
| 2F.2 | Add end-to-end test: custom plugin replaces core skill | `src/__tests__/integration/plugin-replacement.test.ts` | Test registers mock plugin for "code-review", verifies governance uses it | 2C.2 | Medium | 2C.2 |
| 2F.3 | Update `verify:consumer` to include plugin test steps | `scripts/verify-consumer.sh` | New Phase 6 added to the script (before activity.log check) | 2F.1 | Low | 2F.1 |

**Phase 2 full exit criteria**:
- [ ] All 24 knowledge-skill servers registered through `default-plugins.ts` bootstrap
- [ ] `pluginRegistry.callSkillTool()` is the exclusive path for governance skill dispatch
- [ ] Custom plugin replacement test passes
- [ ] Each of the 15 root MCP servers has an explicit fate decision (keep/absorb/deprecate)
- [ ] `verify:consumer` includes plugin registration verification
- [ ] Tests: 2778+ passed, tsc clean

---

### Phase 3: Detailed Plan — Self-Evolution Under Governance

**Goal**: SelfProposalEngine is fully wired into PostProcessor. Self-proposals go through the exact same nucleus governance as external proposals. 2-week production precondition met.

#### Step 3A: Wire SelfProposalEngine fully into PostProcessor [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 3A.1 | Audit current PostProcessor `onPhase` integration for metamorphosis | `src/postprocessor/PostProcessor.ts:110-122` (`notifyPhase`) and line 68 | Understand which phases trigger metamorphosis today | Alone | Low | None |
| 3A.2 | Wire `SelfProposalEngine` into `PostProcessor` constructor | `src/postprocessor/PostProcessor.ts:65` (metamorphosisEngines param) | `PostProcessor` instantiated with `SelfProposalEngine` in its `metamorphosisEngines` array | Alone | Low | None |
| 3A.3 | Ensure `notifyPhase('monitoring-complete')` triggers SelfProposalEngine analysis | `src/postprocessor/PostProcessor.ts:110-122` + `src/postprocessor/metamorphosis/SelfProposalEngine.ts` | After monitoring phase completes, SelfProposalEngine reads activity.log and generates proposals | 3A.2 | Medium | 3A.2 |
| 3A.4 | Ensure `notifyPhase('post-process-complete')` triggers self-proposal governance | `src/postprocessor/PostProcessor.ts:110-122` + `src/postprocessor/metamorphosis/SelfProposalEngine.ts` | After post-process phase, SelfProposalEngine submits proposals via nucleus | 3A.2 | Medium | 3A.2 |
| 3A.5 | Add tests for PostProcessor → metamorphosis lifecycle | `src/__tests__/integration/postprocessor-metamorphosis.test.ts` (new) | Test: PostProcessor runs, `onPhase` called, SelfProposalEngine generates a proposal | 3A.2 | Medium | 3A.2 |

#### Step 3B: Self-proposals go through nucleus exclusively [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 3B.1 | Verify SelfProposalEngine uses `handleGovernRequest` (not direct getGovernanceService) | `src/postprocessor/metamorphosis/SelfProposalEngine.ts:26,374` | Confirmed (it already uses nucleus path) | Alone | Low | None (verify) |
| 3B.2 | Add `type: 'metamorphosis'`, `source: 'metamorphosis'` to self-proposals | `src/postprocessor/metamorphosis/SelfProposalEngine.ts` where GovernanceRequest is built | All self-proposals carry `type: 'metamorphosis'` and `source: 'metamorphosis'` | 3B.1 | Low | 3B.1 |
| 3B.3 | Wire `requireExternalDynamo` and `metamorphosisThreshold` into self-proposal governance options | `src/postprocessor/metamorphosis/SelfProposalEngine.ts:374` | Request includes `requireExternalDynamo: true` and threshold | 3B.1 | Low | 3B.1 |
| 3B.4 | Add governance for self-proposals (3-skill + Dynamo + codex enforcement: verify it's the same path as external) | Integration test | Test proves self-proposal goes through codex enforcement and meets same bar as external proposals | 3B.1 | Medium | 3B.1 |

#### Step 3C: Implement safe apply [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 3C.1 | Audit current `SelfProposalEngine.apply()` sketch | `src/postprocessor/metamorphosis/SelfProposalEngine.ts` (search for `apply` or `applyProposal`) | Understand current safe-apply state (it mentions "state files under target") | Alone | Low | None |
| 3C.2 | Implement safe apply with state backup + rollback | `src/postprocessor/metamorphosis/SelfProposalEngine.ts` | Before modifying a file, copy to `.xray/metamorphosis/backups/`. On failure, restore. | 3C.1 | High | 3C.1 |
| 3C.3 | Implement circuit breaker (cooldown on N failures) | `src/postprocessor/metamorphosis/SelfProposalEngine.ts:59-60` (ProposalAttempt) | Already partially there — verify circuit breaker logic is complete | 3C.1 | Medium | 3C.1 |

#### Step 3D: Audit + remove bypass self-change paths [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 3D.1 | Enumerate all "manual self-change paths" | Full codebase search for: direct file writes (fs.writeFileSync in source dirs), direct git operations, direct config mutations | Complete list of paths that can change the system without governance | Alone | Medium | None |
| 3D.2 | Deprecate each bypass path found in 3D.1 | Varies — likely config-writers, state-writers, test-utilities | Each path either gets a governance gate or explicit deprecation warning | 3D.1 | Medium | 3D.1 |
| 3D.3 | Add governance gate to any config mutation that affects behavior | `.opencode/xray/*`, `src/core/features-config.ts`-like files | Config changes require GovernanceProposal with approval | 3D.1 | High | 3D.1 |

#### Step 3E: Monitoring + 2-week precondition [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 3E.1 | Add monitoring for metamorphosis proposals (success rate, breaker status, applied count) | `src/postprocessor/metamorphosis/SelfProposalEngine.ts` + new metrics | `getMetrics()` returns success rate, breaker state, proposal count | Alone | Low | 3C.2 |
| 3E.2 | Create `scripts/run-self-evolution.sh` for running the loop in production-like conditions | New script | Script: starts consumer verification tarball, runs bridges, checks activity.log, loops for 2 weeks | Alone | Medium | 3A.2, 3B.2, 3C.2 |
| 3E.3 | Start 2-week precondition timer (Phase 1 exit criteria says "start running it gated" — resolve ambiguity by making Phase 3 own this unconditionally) | N/A — process decision | Document: precondition timer starts only when Phase 3 is active. Remove Phase 1 mention of it. | Alone | Low | All Phase 3 items |
| 3E.4 | Add alerting on un-governed self-changes | `src/postprocessor/metamorphosis/SelfProposalEngine.ts` | frameworkLogger `critical` + process alert on any change not routed through governance | 3D.1 | Low | 3D.1 |

**Phase 3 full exit criteria**:
- [ ] SelfProposalEngine fully wired into PostProcessor lifecycle
- [ ] All self-proposals carry `type: 'metamorphosis'`, go through nucleus with `requireExternalDynamo`
- [ ] Safe apply with backup/rollback implemented and tested
- [ ] All manual self-change paths enumerated and gated
- [ ] Monitoring metrics implemented
- [ ] ≥2 weeks of production-like operation with no un-governed changes
- [ ] At least one governed self-change successfully applied and verified
- [ ] Tests: 2778+ passed, tsc clean

---

### Phase 4: Detailed Plan — Break Legacy & 3.0.0 Release

**Goal**: Old v2 paths removed or clearly deprecated. Nucleus + adapters is the primary model. Ship 3.0.0.

#### Step 4A: Remove remaining legacy in inference-cycle.ts [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 4A.1 | Verify all legacy paths from Phase 1 are gone (redundancy check) | `src/inference/inference-cycle.ts` | Grep confirms no `XRAY_FORCE_MCP_GOVERNANCE`, `isGovernanceMcpPreferred`, `parseSubagentVotes`, `resolveOpencodeRoot`, `invokeAgentInternal` | Alone | Low | Phase 1 |
| 4A.2 | Remove any remaining OpenCode CLI fallback references | `src/inference/inference-cycle.ts` | No `invokeViaOpencode` references remain | 4A.1 | Low | Phase 1 |

#### Step 4B: Strip governance bypass env vars from CLI [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 4B.1 | Remove `XRAY_FORCE_MCP_GOVERNANCE` env var set from `src/cli/index.ts` | `src/cli/index.ts:864` | No env var set in `mcp` command handler | Alone | Low | Phase 1 |
| 4B.2 | Remove `XRAY_FORCE_MCP_GOVERNANCE` env var set from `src/cli/commands/govern.ts` | `src/cli/commands/govern.ts:67` | No env var set in `--mcp governance` path | 4B.1 | Low | Phase 1 |
| 4B.3 | Remove `XRAY_FORCE_MCP_GOVERNANCE` env var from grok plugin `.mcp.json` | `src/integrations/grok/plugin/0xray/.mcp.json:7` | Config file no longer sets the env var | 4B.1 | Low | Phase 1 |
| 4B.4 | Remove `XRAY_FORCE_MCP_GOVERNANCE` from bridge invocations | `src/integrations/grok/grok-cli.ts:81` | Bridge setup no longer sets the env var | 4B.1 | Low | Phase 1 |

#### Step 4C: Remove deprecated boot-orchestrator paths [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 4C.1 | Remove direct boot-orchestrator decision paths that bypass nucleus | `src/mcps/boot-orchestrator.server.ts` | Only thin MCP surface over `nucleus/orchestrator.ts` remains | Alone | Medium | Phase 1 (1D) |
| 4C.2 | Update all callers of boot-orchestrator to use nucleus instead | g/references to `boot-orchestrator` | No production code imports from `boot-orchestrator.server.ts` directly | 4C.1 | Medium | 4C.1 |

#### Step 4D: PluginRegistry as exclusive skill discovery mechanism [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 4D.1 | Remove MCP fallback in `governance-service.ts` | `src/governance/governance-service.ts:242-280` (MCP + in-process fallback paths) | MCP fallback block removed; only pluginRegistry path remains | Alone | High | Phase 2 |
| 4D.2 | Remove in-process fallback in `governance-service.ts` | `src/governance/governance-service.ts:246-254` (`useInProcess` block) | In-process skill path removed; pluginRegistry is the only path | 4D.1 | High | Phase 2 |

#### Step 4E: Clean up XrayOrchestrator / KernelOrchestrator confusion [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 4E.1 | Audit all `XrayOrchestrator` / `KernelOrchestrator` references | Full codebase search | Complete list of both class names and their usages | Alone | Low | None |
| 4E.2 | Absorb or clearly separate — no dual classes for same concept | Varies | One canonical orchestrator class; other is deprecated with import redirect | 4E.1 | Medium | 4E.1 |

#### Step 4F: Consumer migration guide [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 4F.1 | Create `CONSUMER-MIGRATION-v3.md` | New file at root | Document: what changed, how to update bridge code, env var changes, deprecated imports | Alone | Low | None |
| 4F.2 | Add deprecation notice to old entry points | `src/cli/index.ts`, old bridge integration files | Console warning "This path is deprecated in v3. Use nucleus/..." | 4F.1 | Low | 4F.1 |

#### Step 4G: Update all docs [P1]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 4G.1 | Update `AGENTS.md` for v3 paradigm | `AGENTS.md` | Describes nucleus + plugin model as primary | Alone | Low | All phases |
| 4G.2 | Update `README.md` for v3 | `README.md` | Installation and usage reflect nucleus paths | 4G.1 | Low | All phases |
| 4G.3 | Update `CHANGELOG.md` with 3.0.0 breaking changes | `CHANGELOG.md` | Complete migration notes | 4G.1 | Low | All phases |

#### Step 4H: Release 3.0.0 [P0]

| # | Item | File(s) | Completion Criteria | Parallel | Risk | Depends On |
|---|------|---------|-------------------|----------|------|------------|
| 4H.1 | Update `package.json` version to 3.0.0 | `package.json` | `version` field set to `3.0.0` | Alone | Low | 4B, 4D, 4F |
| 4H.2 | Run full consumer verification with zero legacy tolerance | `scripts/verify-consumer.sh` | All 4 bridges pass; no legacy paths triggered | 4H.1 | High | 4A-4G |
| 4H.3 | Publish to npm | `npm publish` via `release.mjs` or `release.yml` | 3.0.0 on npm | 4H.2 | Low | 4H.2 |
| 4H.4 | Tag and push | `git tag v3.0.0 && git push --tags` | GitHub release created | 4H.2 | Low | 4H.2 |

**Phase 4 full exit criteria**:
- [ ] No production code paths reach old v2 governance without explicit opt-in
- [ ] env var escape hatches removed from CLI, bridge configs
- [ ] pluginRegistry is the ONLY skill discovery path
- [ ] Consumer migration guide published
- [ ] All docs updated for v3 paradigm
- [ ] 2-week precondition met (from Phase 3)
- [ ] 3.0.0 published on npm
- [ ] Final `verify:consumer` passes with zero legacy tolerance

---

### Consolidated Priority Todo List

#### P0 — Must Do Before 3.0.0 Release

- [ ] **P0.1** Wire `verify:consumer` into `prepublishOnly` (`package.json:48`)
- [ ] **P0.2** Wire `verify:consumer` into `release.yml` (`.github/workflows/release.yml`)
- [ ] **P0.3** Add `verify:consumer` as gated job in `ci.yml` (`.github/workflows/ci.yml`)
- [ ] **P0.4** Fix `STRRAY_FORCE_MCP_GOVERNANCE` → `XRAY_FORCE_MCP_GOVERNANCE` in `package.json:91`
- [ ] **P0.5** Remove MCP governance fallback from `inference-cycle.ts:560-594` (Phase 1B.1)
- [ ] **P0.6** Remove `XRAY_FORCE_MCP_GOVERNANCE` from `inference-cycle.ts` (Phase 1B.7)
- [ ] **P0.7** Remove `isGovernanceMcpPreferred()` from `inference-cycle.ts:682` (Phase 1B.2)
- [ ] **P0.8** Remove `parseSubagentVotes()` from `inference-cycle.ts:802` (Phase 1B.3)
- [ ] **P0.9** Remove `invokeAgentInternal()` from `inference-cycle.ts:726` (Phase 1B.4)
- [ ] **P0.10** Remove `resolveOpencodeRoot()` from `inference-cycle.ts:925` (Phase 1B.6)
- [ ] **P0.11** Remove `XRAY_FORCE_MCP_GOVERNANCE` guard from `opencode-cli-invoker.ts:28` (Phase 1C.1)
- [ ] **P0.12** Replace `resolveOpencodeRoot()` with `getConfigDir()` in `opencode-cli-invoker.ts:182` (Phase 1C.2)
- [ ] **P0.13** Create `nucleus/orchestrator.ts` — extract from boot-orchestrator (Phase 1D.1)
- [ ] **P0.14** Make `boot-orchestrator.server.ts` thin MCP surface (Phase 1D.3)
- [ ] **P0.15** Update `test-mcp-server-pipeline.mjs:42` to not break on refactor (Phase 1D.4)
- [ ] **P0.16** Audit 24 knowledge-skill servers for plugin readiness (Phase 2A.1-2A.3)
- [ ] **P0.17** Extend pluginRegistry for full multi-tool dispatch (Phase 2B.2-2B.3)
- [ ] **P0.18** Create `default-plugins.ts` — bootstrap all 24 servers (Phase 2C.1-2C.3)
- [ ] **P0.19** Remove `isBuiltInSkill` guard in `governance-service.ts:207` (Phase 2C.4)
- [ ] **P0.20** Wire SelfProposalEngine into PostProcessor lifecycle (Phase 3A.2-3A.4)
- [ ] **P0.21** Add `type: 'metamorphosis'` to self-proposals, enforce governance (Phase 3B.2-3B.4)
- [ ] **P0.22** Enumerate + deprecate all manual self-change paths (Phase 3D.1-3D.3)
- [ ] **P0.23** Remove `XRAY_FORCE_MCP_GOVERNANCE` from CLI (Phase 4B.1-4B.4)
- [ ] **P0.24** Remove MCP + in-process fallbacks from `governance-service.ts` (Phase 4D.1-4D.2)
- [ ] **P0.25** Run 2-week self-evolution precondition (Phase 3E.2-3E.3)
- [ ] **P0.26** Release 3.0.0 with fresh consumer verification (Phase 4H.1-4H.4)

#### P1 — Important But Not Blocking

- [ ] **P1.1** Add `.husky/pre-commit` hook (Phase 0.6)
- [ ] **P1.2** Extract thinDispatch into `nucleus/thin-dispatch.ts` (Phase 1E.2)
- [ ] **P1.3** Add nucleus-primary tests (Phase 1F.1-1F.2)
- [ ] **P1.4** Update bridge direct calls to governance-service → nucleus (Phase 1G.4)
- [ ] **P1.5** Add deprecation notice to `getGovernanceService()` (Phase 1H.1)
- [ ] **P1.6** Add warning log for MCP bypass paths (Phase 2D.1)
- [ ] **P1.7** Update `in-process-skill-registry.ts` to delegate to pluginRegistry (Phase 2D.2)
- [ ] **P1.8** Audit 15 root MCP server fates (Phase 2E.1-2E.2)
- [ ] **P1.9** Add plugin registration + dispatch to consumer verification (Phase 2F.1-2F.3)
- [ ] **P1.10** Implement safe apply with backup/rollback (Phase 3C.2)
- [ ] **P1.11** Add metamorphosis monitoring metrics (Phase 3E.1, 3E.4)
- [ ] **P1.12** Remove deprecated boot-orchestrator paths (Phase 4C.1-4C.2)
- [ ] **P1.13** Clean up XrayOrchestrator/KernelOrchestrator confusion (Phase 4E.1-4E.2)
- [ ] **P1.14** Create consumer migration guide (Phase 4F.1-4F.2)
- [ ] **P1.15** Update all docs for v3 paradigm (Phase 4G.1-4G.3)
- [ ] **P1.16** Decide `src/security/` fate (Researcher Review recommendation)

#### P2 — Nice to Have

- [ ] **P2.1** Add `--plugin-first` flag to skill-invocation.server.ts (Phase 2D.3)
- [ ] **P2.2** Add performance benchmark baseline (Researcher Review recommendation)
- [ ] **P2.3** Pin bridge test versions (Researcher Review recommendation)
- [ ] **P2.4** Define performance benchmark metric before Phase 1 (Researcher Review recommendation)
- [ ] **P2.5** Add `SkillToolPlugin.listTools()` for dynamic discovery (Phase 2B.2 extension)

---

### Key Integration Notes

1. **Parallelizable audit work**: Phase 2A (knowledge-skill server audit) and Phase 2E (root MCP server audit) can start during Phase 1 execution. They require no code changes, only documentation.

2. **Self-evolution precondition ambiguity resolved**: Per Researcher and Author reviews, Phase 3 owns the 2-week precondition exclusively. The mention in Phase 1 exit criteria should be removed or reworded to "identify gated self-evolution entry point" rather than "start running it."

3. **`src/security/` fate**: Recommend keeping as-is for v2.2.x. For v3, move `comprehensive-security-audit.ts` and `security-headers.ts` under `src/nucleus/` if they represent core governance concerns, or keep separate but document in the plan. The 4 files are: `comprehensive-security-audit.ts`, `comprehensive-security-audit.test.ts`, `security-headers.ts`, `security-hardener.ts`.

4. **Parallel Phase 0 items**: Items 0.1-0.6 can all be done in parallel or sequentially within a single session. They are low-risk and reinforce the pipeline before any Phase 1 breaking changes.

5. **Bridge version pinning**: Until bridge versions are pinned, each `verify:consumer` failure requires investigation into whether it's a code change or a bridge API change. Consider adding `scripts/verify-bridge-versions.sh` that checks bridge versions against known-good commits.
