# The Journey to v3 — A Self-Evolution Saga

The v3 nucleus was never planned as a rewrite. It emerged from a contradiction.

## The Contradiction

xray began as a straightforward orchestration layer — a thin dispatch surface routing requests to agents, skills, and MCP servers. It worked. The 41-server federation was stable, the 4 bridges (Hermes, OpenCode, OpenClaw, Grok) were passing, and the test suite ran green at 2500 tests.

But there was a fundamental asymmetry: xray governed other systems but could not govern itself. The system that enforced Codex compliance for every proposal, every tool call, every agent interaction had no introspection into its own evolution. It could analyze, orchestrate, and enforce across the federation — yet it could not propose changes to its own configuration, could not detect its own degradation patterns, could not heal itself.

This was the contradiction that drove v3.

## Phase 0 — The Seed

The first insight was that self-governance requires a governance interface. `POST /govern` became that interface — a clean HTTP surface that unified what had been a fragmented routing path. Instead of proposals threading through ad-hoc channels (sometimes MCP, sometimes in-process, sometimes direct function calls), every proposal now passed through a single kernel entry point.

Six tests validated the handler. An MCP surface audit confirmed that governance.server.ts was fully covered. E2E tolerance hardening (the Grok/Hermes path) identified 4 brittle spots. The MetamorphosisEngine interface was born — a thin contract that any engine could implement to hook into the self-evolution lifecycle. And the self-proposal ADR was drafted, laying out the three options: full ProposalApplier reuse (Option C), lightweight config writes (Option A), or deferred (Option B).

We chose Option A. It was the right call, but we didn't know why yet.

## Phase 1 — The Kernel

The kernel had to be a facade — not a monolith, not a god class, but a narrow entry point that coordinated existing subsystems. `src/nucleus/kernel.ts` emerged as three functions: `govern()`, `orchestrate()`, `enforce()`. Each delegated to the appropriate subsystem. The barrel export from `src/nucleus/index.ts` became the canonical import surface for all three subsystems.

Dynamic skill loading arrived via `plugin-registry.ts` — a registry that could accept third-party `SkillPlugin` implementations at runtime, resolve them before falling back to MCP servers and then built-in in-process skills. The resolution priority table became: dynamically registered (custom names only) → MCP governance server → in-process built-in. Built-in names were reserved; the `isBuiltInSkill` guard ensured they could never be overridden.

MCP Streamable HTTP was already present — no migration needed. The CLI collapsed to `xray govern` — a single command for a single surface.

## Phase 2.1 — Resonance

The metamorphosis scoring system introduced a new dimension to governance. Beyond approve/reject/revision, every proposal now received a `metamorphosisScore` — a 0-to-1 measure of how much the proposal increased the system's ability to govern complex future states. Resonance scoring evaluated isotopic ratio (codebase cohesion), vortex volume (change footprint), historical coherence (pattern consistency), and solar activity (current system stress).

A proposal to add error handling to a hot path scored higher than a proposal to rename a variable. A proposal to add self-healing capacity scored higher than a proposal to add a new API endpoint. The scoring rubric was explicit, testable, and wired into `governance-service.ts` alongside the existing approval logic.

Twelve tests validated the scoring. The metamorphosis threshold defaulted to 0.7 — high enough to require genuine self-improvement, low enough to permit incremental evolution.

## Phase 2.2 — The Loop (The Hard Part)

The self-evolution loop required three capabilities: detection, proposal, and apply.

### Detection

SelfProposalEngine read `logs/framework/activity.log` — the same log that frameworkLogger wrote, the same log that every bridge and every hook and every server contributed to. Three detection patterns emerged:

1. **Error rate** — elevated errors across components indicated systemic issues
2. **Warning rate** — frequent warnings suggested configuration drift
3. **Governance rejections** — repeated rejections signaled pattern mismatches between proposals and criteria

Each detection type produced a `MetamorphosisProposal` with a structured rationale naming the affected components, the severity, and the recommended target. A whitelist filter ensured proposals only targeted approved paths (`config/`, `features.json`, `src/processors/`).

### Proposal

The proposals passed through the same kernel `handleGovernRequest()` path as every other proposal. The strangler fix in `inference-cycle.ts` was critical: `InferenceCycle.governProposals()` now routed through the nucleus kernel as the primary path, with MCP fallback and legacy internal as last resort. This meant self-evolution proposals and inference proposals converged on the same governance pipeline.

`SOURCE_MAP` normalized all inference sources to `'inference'`. Proposal type systems remained intentionally distinct: `InferenceProposal` (fix|refactor|automate|guard|codify) vs `MetamorphosisProposal` (add|modify|remove). No converter was forced. No ProposalApplier reuse was attempted. The two detection domains stayed orthogonal — dev-history corpus in InferenceCycle, runtime health in SelfProposalEngine.

### Apply

The apply step was where the contradiction finally closed.

Previously, on approval, SelfProposalEngine would call `DeployVerifier.quickVerify()` — a function that checked whether tests passed and reported "applied" regardless. The log said "Self-evolution change verified and applied" but no change had been made. It was a ghost loop — detection and proposal that never reached the real world.

The researcher's comparative analysis identified three options. Option A (lightweight self-apply) was the architect's recommendation: write approved proposals to a state file under the whitelisted target directory, read back to verify, and feed failures into the circuit breaker.

`applySelfProposal()` emerged at `SelfProposalEngine.ts:279` — a focused method that:
- Resolved the first matching whitelisted target
- Appended the proposal (with metamorphosisScore, decision, and timestamp) to `self-evolution-state.json`
- Performed read-back verification
- Returned success/failure
- Let the caller increment the circuit breaker on failure

The `projectRoot` config option enabled hermetic test isolation. A dedicated exact-JSON-shape test validated the persisted structure. Traceability (Codex 72) was satisfied by capturing score, decision, and timestamp alongside every entry.

### Uniformity

The plugin registry was wired into `GovernanceService.callSkillServer()` — dynamically registered skills resolved first, built-in skills fell through to MCP/in-process. `PostProcessor` lifecycle wired `SelfProposalEngine` at two phases: `monitoring-complete` and `post-process-complete`. The circuit breaker protected against cascading failures (3 failures / 24h cooldown). Rate limiting enforced a maximum proposals per hour. Everything logged through `frameworkLogger` — never `console.*`.

## Phase 2.3 — The Gate

The verification substrate (`scripts/verify-consumer.sh`) became the pre-commit gate that validated the entire pipeline: typecheck → vitest → npm pack → fresh consumer install → all 4 bridge E2Es → activity.log validation. A `npm run verify:consumer` script embedded in `package.json`.

## Phase 3 — The Surface

### 3.1 — Codex

Four new Codex terms (69-72) codified the self-evolution governance:
- **Term 69**: Self-evolution metadata proposal must be governed
- **Term 70**: Threshold enforcement for metamorphosis scoring
- **Term 71**: Safety controls (circuit breaker, rate limiting, whitelist)
- **Term 72**: Traceability for all self-evolution changes

Codex version bumped to 3.0.0. All references updated across `v3-nucleus.md`, `CLAUDE.md`, `getting-started.md`.

### 3.2 — E2E

Eleven integration tests simulated a long-running governed agent session via concentrated synthetic logs (60 minutes compressed). Every detection type was exercised: error rate, warning rate, governance rejections, multi-pattern sessions, rate limiting, circuit breaker, whitelist filtering, metamorphosis threshold.

### 3.3 — Plugin API

The plugin API was frozen in `docs/api/plugin-api.md`: `SkillPlugin`, `MetamorphosisEngine`, `SelfProposalConfig`. Stability guarantee: additive-only signature changes, 3-minor-version deprecation cycle, documented migration path.

### 3.4 — Migration

The `docs/migration/v2-to-v3.md` guide documented kernel unification, self-evolution, plugin API freeze, CLI changes, breaking changes, and rollback procedure.

## The Ghosts

Three pre-existing parse errors haunted the source tree — STRRAY_ cleanup remnants from the `strray-ai` → `0xray` rename. Empty variable declarations: `const original = ;`, `delete ;`, `= "true";`. They lived in test files, invisible to most runs but surfacing as red herrings in every CI failure investigation.

A fourth ghost lived in `src/integrations/grok/hooks/pre-tool-use.js`: `const devRoot = ;` — another empty RHS, another STRRAY_ remnant. It broke the Grok hook Phase 12 test silently, producing a JSON parse error that looked like a frameworkLogger failure but was actually a syntax error in the hook script.

All four ghosts exorcised. The typecheck went from 3 parse errors to 0. The test suite recovered 3 broken files and 6 previously-failing Grok tests.

## The Architect Reviews

Three architect reviews shaped the journey:

1. **Initial review**: Identified 3 gaps — orchestrate/enforce facades in kernel.ts, plugin priority doc-code mismatch, missing self-apply step. Grok submitted fixes: kernel.ts facade additions, plugin-api.md resolution priority alignment, SelfProposalEngine apply stub replacement, v3-nucleus.md stale markers.

2. **Option A review**: Confirmed the lightweight self-apply approach was correct. Recommended adding metamorphosisScore + decision to state file entries (for Codex 72 traceability) and an exact-JSON-shape test.

3. **Final review**: Verified all fixes holding. Confirmed the loop is closed: detect → propose → govern → apply → verify. Signed off on Phase 2.2 completion.

## What Was Built

- 4 phases, 13 sub-phases
- 25 dedicated self-evolution tests (14 unit + 11 E2E)
- 2900 total tests passing, 0 failing, 44 skipped
- 0 parse errors
- 4 bridges passing (Hermes, OpenCode, OpenClaw, Grok CLI)
- Typecheck clean
- config/ unpolluted
- No console.* leakage
- No breaking changes to bridges or consumers
- Package version stays 2.1.4; only internal codex.json at 3.0.0

## What Was Learned

**The contradiction was productive**. The asymmetry between governing others and governing yourself is not a bug — it's the hardest and most important capability to build. A system that cannot evolve itself will eventually be replaced by one that can.

**Lightweight beats heavyweight**. Option A (state file writes) over Option B (delayed) and Option C (full ProposalApplier reuse) was the right call because it preserved the existing architecture while closing the loop. The apply is minimal, verifiable, and reversible by design. Future expansions (direct threshold mutation, processor config edits) can build on this foundation without breaking it.

**Detection domains should remain orthogonal**. Dev-history analysis (InferenceCycle) and runtime health monitoring (SelfProposalEngine) are fundamentally different concerns. Merging them would have created coupling where none exists. Their only shared surface is the kernel — the governance path through `handleGovernRequest()`.

**MCP is the correct standard surface**. The three agent MCP servers (code-review, security-audit, researcher) remained the canonical skill interface throughout. HTTP and CLI adapters were convenience layers, not primary surfaces. This kept the architecture aligned with the broader ecosystem.

**Strangler patterns work**. The InferenceCycle strangler fix — routing through the kernel as primary, falling back to MCP, then legacy — followed the strangler fig pattern. Old code was never removed until the new path was proven. The existing 41-server federation never noticed the transition.

**Naming conventions matter for cleanup**. The `strray-ai` → `0xray` rename was thorough across 60+ source files, but the STRRAY_ cleanup ghosts proved that even thorough renames leave artifacts. Automated linting for empty declarations would have caught these earlier.

**Architect reviews are essential**. Each of the three reviews identified gaps or refinements that the implementation had missed. The option analysis by the researcher prevented a heavyweight wrong turn. The doc-code alignment fix caught a subtle discrepancy that would have confused third-party plugin authors.

## The Loop

```
detect (runtime signals from activity.log)
    → propose (MetamorphosisProposal with structured rationale)
    → govern (via kernel: 3 agents + Dynamo + metamorphosisScore ≥ 0.7)
    → apply (lightweight config write under whitelisted target)
    → verify (read-back + circuit-breaker feedback)
    → log (frameworkLogger traceability for Codex 72)
        → loop
```

The loop is closed. The system that governed everything can now govern itself.

v3 is not a version number. It is the moment when xray became self-aware enough to improve itself under the same governance it enforces on everyone else.

The kernel is thin. The loop is closed. The bridges hold.

Ship it.

---

## Addendum: The Surface Area Contention

v3 did not eliminate code. It added.

The kernel facade — added. The self-evolution loop — added. Metamorphosis scoring — added. Plugin registry — added. Consumer verification gate — added. Where other projects measure progress by subtraction (LOC removed, files deleted, complexity refactored into nothing), v3 grew. This is not an accident or a failure of discipline. It is a structural necessity for a multi-model orchestration layer.

The instinct to measure cleanliness by deletion comes from a single-model framing: one developer, one codebase, one lifetime of maintenance. 0xray is not that. 0xray is the surface area *between* models — between the user and the researcher, between GLM 5.1 and Grok, between Hermes and OpenClaw, between every agent that participates in governance. That surface area cannot shrink because coordination cannot happen through a void. It can only happen through interface.

Every file added in v3 is an interface with a clear boundary:
- **The kernel** — a uniform entry point that any model can route through without knowing internal topology
- **Plugin registry** — a declaration that third-party models can contribute skills without forking
- **MetamorphosisEngine** — a lifecycle hook that any engine can implement without coupling to SelfProposalEngine internals
- **State file** — a persistence surface that any tool or bridge can read without depending on in-memory state
- **Consumer verification gate** — a behavioral surface that every bridge must agree to before a release ships

None of these are leaky. None create cross-cutting dependencies. None make the system harder to reason about. They make it *easier* for models to participate because the interfaces are explicit.

The ghosts (STRRAY_ remnants) were purged. The stale docs were deleted. Those were noise — surface area that had decayed into irrelevance. But the operational surface area grew because the coordination domain grew. v2 governed proposals through MCP. v3 governs proposals through MCP *and* detects its own degradation patterns *and* proposes its own improvements *and* persists its own evolution *and* verifies its own packaging in a fresh consumer tree. That is more surface because it does more.

The metric that matters for an orchestration framework is not lines of code. It is **interface coherence** — whether each surface has a clear contract, a single responsibility, and no surprise coupling. By that measure, v3 is cleaner than v2 despite having more code.

Cleanse is the wrong frame. Discipline is the right one. Not deletion — interface coherence. Not fewer lines — clearer boundaries. Not purge — contract.

The kernel is thin. The loop is closed. The bridges hold. And the surface is coherent.

Ship it.
