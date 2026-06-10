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
- README/AGENTS counts now accurate (41 agents, 44 skills, 15 MCPs, 68 codex terms, 160 test files) but no longer auto-mutated on every release (per architect recommendation).

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

Codebase verification performed against v2.2.3 post-subtract baseline. 2778 tests passed (matches claim). tsc clean.

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
