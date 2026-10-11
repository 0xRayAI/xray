# The Lexicon Mirror: When You Show a Framework Its Own Reflection

It started with 87 words.

Not code. Not a spec. Not a design document. Just a stream of consciousness — a lexicon kept in the margins of 0xRay development, a personal glossary of what the framework is *meant* to avoid and what it's *meant* to become. Terms like "fandangle" and "incandescent midcurve flub" sitting next to "succinct" and "anti-fragile." The language of someone who's been burned by their own code and decided to name the burns.

I gave this lexicon to Grok. It spat back agent theater — eight personas declaiming victory over problems they hadn't actually solved. "99.6% error prevention active." "Technical debt: 0." That's the fandangle right there. The lexicon's own warning, performed back at it as farce.

So the real question became: what happens when you hold this lexicon up to the actual framework? Not to an LLM that'll agree with anything, but to the source code itself. Which of these 87 terms are already living in the engine room, and which are still just words on a wall?

## The Research

I sent the researcher into the codebase with a mission: cross-correlate every term against actual implementation. Don't guess. Read the source. Cite the file.

What came back was a three-tier map.

### What's Already Real

Fourteen terms have genuine teeth in the framework. Not just codex entries — actual enforcement mechanisms with violation fixers and agent delegation chains.

`over-engineering` is codex term #3 with a violation path straight to the architect. `cascade-recursion` is triple-layered: codex #8 prevents infinite loops, #56 detects infinite spawn patterns, #57 rate-limits spawning. Three independent safety nets for one anti-pattern. That's not redundancy — that's experience. Someone got burned by a spawn storm and made sure it couldn't happen again.

`repetitive/redundant` maps to DRY enforcement with a violation fixer that delegates to the refactorer. `degradation` has a three-tier health system: SessionMonitor, ProcessorManager, and MemoryMonitor each tracking healthy/degraded/critical states. `regressive` has both a codex term (#48, blocking) and an actual regression testing processor at `src/processors/implementations/regression-testing-processor.ts`.

The strongest finding: `auto-heal` is real. `ViolationFixer` at `src/enforcement/core/violation-fixer.ts` doesn't just flag problems — it delegates them to agents via MCP. The inference cycle generates correction proposals and routes them through researcher review. The framework doesn't just detect errors; it initiates a repair pipeline.

`SSOT` is enforced through `validateRegistryConsistency()` at `src/agents/registry.ts:323`. The agent registry derives from `src/agents/*.ts` and everything else — opencode.json, barrel exports, expertise mappings — must align. When it doesn't, the validator catches it.

`surgical` is codex term #5, and the violation fixer specifically maps `surgical-fixes-where-needed` to the bug-triage-specialist. Not just a rule — a routing decision.

`boot-sequence` exists as `src/core/boot-orchestrator.ts` with a nine-stage ordered initialization. `introspection` is codex #6 with `JobContext` tracking outcome vs. prediction. `iterate` lives in the inference cycle's `maybeRunCycle()` loop. `pattern-analysis` accumulates `RecurringPattern` and `RecurringProblem` through `inference-accumulator.ts`.

`prod-level` is codex #1 (blocking, zero-tolerance). `verifiability` is codex #11 (type safety, blocking). These aren't aspirational — they're the hardest enforcement tier in the system.

Fourteen terms, all with source-level proof. The framework isn't just talking about these concepts. It's enforcing them.

### The Half-Truths

Fourteen more terms exist in the framework, but as shadows of what the lexicon demands.

`monkey-patching` is banned by codex #2 ("No Patches/Boiler/Stubs/Bridge Code") — but there's no runtime detection for it. The codex can flag a commit message that says "patch," but it can't catch `Object.prototype` modification or `require` hooking at runtime. The rule exists; the enforcement doesn't.

`observability` has `FrameworkUsageLogger` with structured component/action/status/detail logging, `AgentMetricsSystem` with per-agent tracking, and `SessionMonitor` health checks. But there are no trace IDs, no span correlation across agent boundaries, no causal chains. When agent A calls agent B which calls processor C, there's no single trace that ties them together. You can see what happened, but not *why* it happened or *how* it propagated.

`cross-session-coherence` is the one that hurts. `SessionStateManager` provides session state sharing. The inference accumulator persists patterns across sessions. But each OpenCode session starts with zero memory of what the last session learned. The accumulator is file-based and stores problems and patterns — not learned preferences, not corrections that worked, not decisions that were made. The framework has amnesia between sessions.

`anti-fragile` is the gap that reveals a philosophical misunderstanding. The framework is *resilient* — it recovers from failures. But anti-fragile means getting *stronger* from stress. There's no chaos testing, no deliberate fault injection, no mechanism that intentionally breaks things to verify recovery. The system survives shocks but doesn't learn from them. It's shock-absorbent, not shock-adaptive.

`smoke-tests` exist as test execution and regression processors, but there's no `npm run smoke` — no fast, minimal validation that the system boots and core pipelines work in under 30 seconds. The test suite takes 2-5 minutes. There's no quick gate.

`reflection/deep-think` is codex #6 and the inference cycle accumulates patterns, but there's no forced deliberation. No mechanism that says "stop and think deeply about this decision before proceeding." The inference cycle is asynchronous and opt-in. You can skip it. A framework that values deep thinking should *require* it at critical junctures.

`precision` has codex #5 ("Surgical Fixes") but no precision *metric*. No way to measure how targeted a change is versus how much collateral modification it introduces. "Surgical" is a rule, not a measurement.

### The Voids

Twenty-four terms have zero framework support. These are the gaps the lexicon is screaming about.

`stagger` — no rate-limiting in pipelines. Processors execute sequentially or in parallel, but nothing throttles them. When the system is under load, it doesn't slow down; it just piles on.

`disable-able-sub-calls` — processors can be toggled, but individual steps within a processor cannot. You can turn off the whole processor or nothing. No fine-grained control.

`cite-the-source` — no provenance tracking on code changes. No mechanism to trace *why* a change was made, *which* request or decision led to it. Code changes exist without ancestry.

`diverging-systems-cleansed` — no drift detection between dependent modules. When two parts of the system evolve independently, nobody notices until they break.

`catalyst` — no amplification of high-success patterns. The inference cycle detects recurring *problems*, but not recurring *successes*. It's a defect detector, not an excellence amplifier.

`inertia` — no dead-code age tracking. Files that haven't been touched in 90 days with no test coverage just... sit there. The framework has no concept of code rot.

`usurping` — no capability boundary enforcement for agents. An agent declared as a "code-reviewer" could theoretically execute operations outside its specialty. The registry knows what agents *are*, but doesn't constrain what they *do*.

`fandangle` — the lexicon's own term for ornamental complexity, the thing that looks impressive but adds nothing. No detection for it. And the Grok output was itself a fandangle — performing analysis without producing it.

`feel-simple` — no cognitive simplicity metric. No way to measure whether an API surface is actually easy to use or just looks clean from the outside.

`incandescent-midcurve-flub` — the "clever wrong answer" pattern. A solution that's brilliant but misses the actual problem. No detection for this at all. The framework can catch errors, but not correctness that solves the wrong problem.

`finite-lite` — no lightweight execution mode. Every operation runs at full weight. No way to say "just check if this would work" without actually executing it.

`run-through-paces` — no dry-run or simulation mode. No way to walk through what would happen without making it happen.

## What This Means

The lexicon isn't just a word list. It's a design philosophy encoded as tensions. Every term exists in opposition to another:

- `brevity` vs `succinct` — short isn't the same as precise
- `infinite-phase` vs `finite-lite` — unbounded ambition vs shippable scope
- `fuzzy-wuzzy` vs `precision-experience` — approximation vs earned accuracy
- `fandangle` vs `feel-simple` — performative complexity vs genuine simplicity

The framework handles the first half of each pair well — it can detect over-engineering, enforce type safety, prevent infinite loops. But it's missing the *aspirational* counterparts: the mechanisms that don't just prevent bad outcomes but actively create good ones.

The 14 well-covered terms are almost entirely **defensive** — they prevent, block, detect, enforce. The 24 complete misses are almost entirely **offensive** — they amplify, learn, adapt, simplify, trace, deliberate.

The framework is a goalkeeper with no striker.

## The Five That Matter Most

If we were to prioritize, these five gaps would shift the framework from defensive to generative:

1. **`stagger`** — Add `StaggerPolicy` to `ProcessorConfig`. Rate-limiting prevents cascade overload, which is the root cause of the worker timeouts that kept breaking the release. It's not theoretical — it's the bug we just fixed.

2. **`deep-think`** — Add a deliberation pre-processor. Before any code-modifying operation with complexity >30, require a reflection phase that generates an impact assessment. Make thinking mandatory at the moments where it matters most.

3. **`cite-the-source`** — Add a source citation post-processor. Every code modification must reference its originating request. Without provenance, the codebase is a city built without building permits.

4. **`cross-session-coherence`** — Persist `SessionSummary` at end of session, load prior summaries on start. The framework's amnesia between sessions is its biggest cognitive gap. It relearns what it already knew.

5. **`anti-fragile`** — Add chaos testing. Deliberately inject processor failures, memory pressure, and timeout spikes. Measure recovery rate. The system that tests itself under stress doesn't just survive — it adapts.

## Looking Back

The lexicon was never meant to be implemented literally. It's a tension map — a way of holding opposing forces in mind simultaneously. The mistake Grok made was resolving all the tensions into triumph. "99.6% error prevention." "Technical debt: 0." That's the incandescent midcurve flub right there — a brilliant-sounding answer that misses the actual problem.

The actual problem is: how do you build a framework that doesn't just prevent what you've learned to fear, but cultivates what you've learned to value?

The 87 terms answer that question implicitly. The 14 that are covered say "we've been burned by this before and built a wall." The 24 that are missing say "we know this matters but haven't figured out how to build it yet." The 14 that are partial say "we started but lost the thread."

The thread is still there. It's in the source code, in the gaps between what's enforced and what's aspired to, in the distance between a codex rule and a runtime mechanism.

The framework knows what it hates. Now it needs to learn what it loves.

---

## Source-Level Evidence

### Well-Covered Terms — Exact Code Locations

**over-engineering**
- Codex term #3: `.opencode/strray/codex.json:23-29` — `"Do Not Over-Engineer the Solution"`, `enforcementLevel: "medium"`
- Violation fixer: `src/enforcement/core/violation-fixer.ts:278-283` — maps `no-over-engineering` → architect → project-analysis
- Rule executor: `src/enforcement/core/rule-executor.ts:462` — `isRuleApplicable` filters `no-over-engineering` to write+newCode operations

**cascade-recursion** (triple-layered)
- Codex #8: `.opencode/strray/codex.json:64-69` — `"Prevent Infinite Loops"`, `zeroTolerance: true`, `enforcementLevel: "blocking"`
- Codex #53: `.opencode/strray/codex.json:423-429` — `"Subagent Spawning Prevention"`, blocking
- Codex #56: `.opencode/strray/codex.json:447-453` — `"Infinite Spawn Pattern Detection"`, blocking
- Codex #57: `.opencode/strray/codex.json:456-461` — `"Spawn Rate Limiting"`, blocking
- Spawn governance processor: `src/processors/implementations/spawn-governance-processor.ts` (registered at `src/processors/processor-manager.ts:364-381`)
- Rule hierarchy: `src/enforcement/core/rule-hierarchy.ts:119-175` — Kahn's algorithm topological sort prevents dependency cycles from creating infinite execution chains

**repetitive/redundant**
- Codex #16: `.opencode/strray/codex.json:127-133` — `"DRY - Don't Repeat Yourself"`
- Violation fixer: `src/enforcement/core/violation-fixer.ts:252-263` — `no-duplicate-code` and `dry-dont-repeat-yourself` both map to refactorer

**degradation** (three-tier health tracking)
- SessionMonitor: `src/session/session-monitor.ts:17-25` — `SessionHealth` type with `"healthy" | "degraded" | "critical" | "unknown"` statuses, alert thresholds configured at lines 97-108
- ProcessorManager: `src/processors/processor-manager.ts:28-33` — `ProcessorHealth` type with `"healthy" | "degraded" | "failed"`, computed at lines 828-830 based on success rate
- MemoryMonitor: `src/monitoring/memory-monitor.ts:69-99` — threshold-based alerting with configurable warning/critical/leak-detection levels
- Codex #13: `.opencode/strray/codex.json:103-109` — `"Error Boundaries and Graceful Degradation"`
- Codex #51: `.opencode/strray/codex.json:408-412` — `"Graceful Degradation"`

**regressive**
- Codex #48: `.opencode/strray/codex.json:387-389` — `"Regression Prevention"`, `zeroTolerance: true`, `enforcementLevel: "blocking"`
- Codex #60: `.opencode/strray/codex.json:478-485` — `"Regression Analysis Integration"`, includes cascade pattern detection and AI degradation pattern detection
- Regression testing processor: registered at `src/processors/processor-manager.ts:264-274`
- Violation fixer: `src/enforcement/core/violation-fixer.ts:252-263` — regression rules map to testing-lead

**resilient** (retry + fallback)
- RetryHandler: `src/postprocessor/redeploy/RetryHandler.ts:1-80` — configurable `maxRetries`, `baseDelay`, linear/exponential backoff
- PostProcessor retry: `src/postprocessor/PostProcessor.ts:1471-1481` — exponential backoff before retry
- Session failover: `src/session/session-state-manager.ts:630-688` — `configureFailover()` + `executeFailover()` with backup coordinators
- MCP client retry: `src/mcps/mcp-client.ts:37-42` — `DEFAULT_RETRY_CONFIG` with `maxRetries: 3`, `backoffMultiplier: 2`

**auto-heal / auto-correct**
- ViolationFixer: `src/enforcement/core/violation-fixer.ts:50-200` — maps violations to agents via MCP skill invocation, tracks fix success/failure
- Fix strategies registry: `src/enforcement/core/violation-fixer.ts:249-694` — 40+ rule-to-agent mappings
- Codex #50: `.opencode/strray/codex.json:400-405` — `"Self-Healing Validation"`, auto-correction with retry backoff
- Inference cycle: `src/inference/inference-cycle.ts:91-185` — `maybeRunCycle()` generates repair proposals from recurring problems, routes through governance voting, applies with deploy verification

**SSOT**
- Agent registry: `src/agents/registry.ts:29-303` — single `AGENT_REGISTRY` object, all agent definitions derive from it
- Registry consistency validator: `src/agents/registry.ts:323-370` — `validateRegistryConsistency()` checks key/name alignment, duplicate detection, required fields, valid modes/statuses
- Codex #10: `.opencode/strray/codex.json:80-85` — `"Single Source of Truth"`, high enforcement
- State manager: `src/state/state-manager.ts:10-284` — `StringRayStateManager` with disk persistence, single authoritative store

**surgical**
- Codex #5: `.opencode/strray/codex.json:38-45` — `"Surgical Fixes Where Needed"`, high enforcement
- Violation fixer: `src/enforcement/core/violation-fixer.ts:465-468` — `surgical-fixes-where-needed` maps to bug-triage-specialist

**modular**
- Codex #40: `.opencode/strray/codex.json:320-325` — `"Modular Design"`
- Processor auto-discovery: `src/processors/processor-manager.ts:82-143` — dynamic filesystem discovery, dependency injection, registration
- Processor interface: `src/processors/processor-interfaces.ts:37-56` — `IProcessor` contract with name/type/priority/enabled

**triage**
- Bug-triage-specialist agent: `src/agents/registry.ts:43-55` — registered with debugging/analysis capabilities
- Violation fixer maps error-related rules to bug-triage-specialist: `src/enforcement/core/violation-fixer.ts:330-354`
- Rule hierarchy priority ordering: `src/enforcement/core/rule-hierarchy.ts:119-175`

**double-check**
- Pre/post processor pipeline: `src/processors/processor-manager.ts:619-706` (`executePreProcessors`) and lines 709-763 (`executePostProcessors`)
- Codex #49: `.opencode/strray/codex.json:392-397` — `"Comprehensive Validation"`, multi-criteria validation
- PostProcessor chain validator: registered at `src/processors/processor-manager.ts:442-449`

**boot-sequence**
- Boot orchestrator: `src/core/boot-orchestrator.ts` — 9-stage ordered initialization (core systems → delegation → session → logging → config → plugin → processors → codex → security → health validation)
- Processor initialization: `src/processors/processor-manager.ts:552-602` — `initializeProcessors()` with parallel init and failure aggregation

**introspection**
- Codex #6: `.opencode/strray/codex.json:48-52` — `"Batched Introspection Cycles"`
- JobContext tracking: `src/core/framework-logger.ts:72-161` — outcome tracking (`success | fail | escalated | auto-fixed`), complexity accuracy (`underestimated | accurate | overestimated`), predicted vs actual duration

**iterate**
- Inference cycle: `src/inference/inference-cycle.ts:91-185` — `maybeRunCycle()` with trigger threshold, corpus accumulation, proposal generation, governance voting, deploy verification
- History learning: `src/inference/inference-cycle.ts:259-262` — `adjustFromHistory()` modifies proposal confidence based on past success/failure rates

**pattern-analysis**
- Accumulator: `src/inference/inference-accumulator.ts:6-29` — `RecurringPattern` and `RecurringProblem` data structures, cross-session frequency counting with confidence tracking
- Proposal generation: `src/inference/inference-cycle.ts:187-256` — classifies proposals as fix/refactor/automate/guard/codify from accumulated patterns

**call-sequencing-events**
- RuleHierarchy: `src/enforcement/core/rule-hierarchy.ts:54-68` — `addDependency()` with forward and reverse dependency tracking
- Topological sort: `src/enforcement/core/rule-hierarchy.ts:119-175` — Kahn's algorithm ensures dependency-ordered execution
- Circular dependency detection: `src/enforcement/core/rule-hierarchy.ts:189-245` — DFS cycle detection with path tracking

**prod-level**
- Codex #1: `.opencode/strray/codex.json:6-13` — `"Progressive Prod-Ready Code"`, `zeroTolerance: true`, `enforcementLevel: "blocking"`
- Codex #4: `.opencode/strray/codex.json:32-37` — `"Fit for Purpose and Prod-Level Code"`, high enforcement

**verifiability**
- Codex #11: `.opencode/strray/codex.json:87-93` — `"Type Safety First"`, `zeroTolerance: true`, `enforcementLevel: "blocking"`
- TypeScript compilation processor: registered at `src/processors/processor-manager.ts:353-362`
- Codex #39: `.opencode/strray/codex.json:313-317` — `"Avoid Syntax Errors"`, blocking

### Partially Addressed Terms — What Exists and What's Missing

**monkey-patching**
- Exists: Codex #2 bans patches/stubs/bridge code (`.opencode/strray/codex.json:14-20`)
- Missing: No static analysis detection for `Object.prototype` modification, `require` hooking, or prototype pollution patterns. The rule flags intent in commits but cannot detect runtime monkey-patching in code.

**observability**
- Exists: `FrameworkUsageLogger` (`src/core/framework-logger.ts:175-287`) provides structured logging with component/action/status/detail. `AgentMetricsSystem` (`src/metrics/agent-metrics.ts:149-870`) tracks per-agent invocations with time-period aggregation. `SessionMonitor` (`src/session/session-monitor.ts:17-80`) provides SessionHealth tracking. `AdvancedProfiler` (`src/monitoring/advanced-profiler.ts:1-50`) tracks operation-level profiling. `JobContext` (`src/core/framework-logger.ts:72-88`) tracks outcome and complexity accuracy per job.
- Missing: No trace IDs (no `traceId`/`spanId` in `FrameworkLogEntry` at line 164-173). No cross-agent causal chain. No OpenTelemetry integration. When agent A delegates to agent B which calls processor C, there's no single correlated trace.

**cross-session-coherence**
- Exists: `SessionStateManager` (`src/session/session-state-manager.ts:49-821`) manages cross-session state sharing, dependency tracking, and group coordination. Inference accumulator (`src/inference/inference-accumulator.ts`) persists recurring patterns across sessions.
- Missing: No `SessionSummary` persistence mechanism. Each OpenCode session starts with zero memory of what prior sessions learned (preferences, corrections, decisions). The accumulator stores problems/patterns but not learned corrections or decision rationale.

**anti-fragile**
- Exists: ViolationFixer provides self-correction. Inference cycle learns from recurring problems. `NudgeWatchdog` (`src/monitoring/nudge-watchdog.ts:1-35`) detects stuck patterns (think-loop, syntax-loop, death-spiral, tool-loop). Retry mechanisms (`RetryHandler`) recover from transient failures. Memory monitor (`src/monitoring/memory-monitor.ts:69-414`) detects and alerts on memory pressure.
- Missing: No chaos testing — no deliberate fault injection, no stress test mode. No mechanism to intentionally break processors or agents and verify recovery. The system is shock-absorbent but not shock-adaptive. No success metric that *improves* after stress.

**smoke-tests**
- Exists: Test execution processor (`src/processors/processor-manager.ts:252-262`), regression testing processor (lines 264-274), coverage analysis processor (lines 308-315).
- Missing: No `npm run smoke` or fast validation gate. No processor that runs a minimal "does the system boot and do core pipelines work" check in <30s. The full test suite takes minutes; there's no quick confidence check.

**reflection/deep-think**
- Exists: Codex #6 ("Batched Introspection Cycles"). Inference cycle accumulates patterns and generates proposals.
- Missing: No forced deliberation phase. No mechanism that requires impact assessment before modifying operations above a complexity threshold. The inference cycle is asynchronous and opt-in (`maybeRunCycle`).

**precision**
- Exists: Codex #5 "Surgical Fixes" targets bug-triage-specialist.
- Missing: No precision metric — no way to measure what fraction of a change is targeted vs. collateral. No "diff precision" calculation that compares lines-changed to lines-context.

**context-dependency-errors**
- Exists: Codex #21 "Dependency Injection" (`.opencode/strray/codex.json:168-173`). Codex #15 "Separation of Concerns" (lines 120-125). Circular dependency detection in `RuleHierarchy`.
- Missing: No detection of *implicit* context dependencies (module A silently depends on runtime state from module B). No context isolation enforcement. No flagging of hidden coupling through shared global state.

**resilient-port**
- Exists: Failover management in `SessionStateManager` (`session-state-manager.ts:630-688`). MCP client retry with backoff (`mcp-client.ts:37-42`). Error boundary processor registered at `src/processors/processor-manager.ts:240-249`.
- Missing: No port-level graceful degradation. No fallback when an external MCP server is unreachable. No circuit breaker implementation in the actual client code (only referenced in validation schemas at `src/validation/agent-config-validator.ts:40,388-405`).

**circuit-breaker** (partial)
- Exists: Schema validation for circuit breaker configuration at `src/validation/agent-config-validator.ts:40,388-405` — validates `failure_threshold` and `recovery_timeout_ms`.
- Agent skill files mention circuit breakers in their expertise descriptions: `src/agents/backend-engineer.ts:56`, `src/agents/bug-triage-specialist.ts:23`.
- Missing: No actual `CircuitBreaker` class or runtime implementation anywhere in `src/`.

### Complete Misses — Zero Framework Support

All 24 terms listed in the "Complete Misses" section of the narrative have **no source-level implementation**. Key verification:

- **stagger**: `src/processors/processor-manager.ts:619-763` executes processors sequentially or in parallel chunks but has no `StaggerPolicy`, no rate-limiting, no minimum inter-execution delay field on `ProcessorConfig` (lines 9-16).
- **disable-able-sub-calls**: `ProcessorConfig` at `src/processors/processor-manager.ts:9-16` has `enabled` boolean for whole processors but no sub-call configuration. `IProcessor` at `src/processors/processor-interfaces.ts:37-56` has `enabled` but no mechanism to disable individual steps within a processor.
- **cite-the-source**: No provenance tracking in any post-processor or session-capture mechanism. `session-capture.ts:9` tracks `span: { from, to }` for git ranges but not the originating request.
- **catalyst**: `inference-accumulator.ts:16-23` defines `RecurringPattern` with `name/occurrences/avgConfidence/sessions/evidence/description` but no `catalystScore` or success-amplification field.
- **dry-run/run-through-paces**: CLI has `--dry-run` flags (`src/cli/index.ts:690,730,986,1043`) for archive/publish/storyteller operations, but **no processor dry-run mode**. `IProcessor.execute()` at `src/processors/processor-interfaces.ts:55` returns `Promise<ProcessorResult>` with no simulation variant.
- **circuit-breaker**: No implementation file. Only schema validation and agent descriptions reference it.

---

## Codex Term Proposals

### anti-monkey-patching
- **Category**: anti-pattern
- **Severity**: high
- **Detection Rule**: "Flag any modification of built-in prototypes (Object.prototype, Array.prototype, Function.prototype), require/import hooking, module.exports replacement at runtime, or dynamic property injection on non-owned objects"
- **Implementation Target**: `src/enforcement/validators/monkey-patch-detector.ts`
- **Existing Related**: Codex #2 "No Patches/Boiler/Stubs/Bridge Code"

### anti-fandangle
- **Category**: anti-pattern
- **Severity**: medium
- **Detection Rule**: "Flag code that introduces abstraction layers, design patterns, or configuration systems that are invoked fewer than 3 times across the codebase. Count references to any newly introduced abstraction; if < 3, flag as potential fandangle"
- **Implementation Target**: `src/enforcement/validators/fandangle-detector.ts`
- **Existing Related**: Codex #3 "Do Not Over-Engineer the Solution"

### anti-inertia
- **Category**: anti-pattern
- **Severity**: low
- **Detection Rule**: "Flag any source file older than 90 days with zero imports and zero test coverage. Compute file age via git log, import count via AST analysis, and test existence via glob matching"
- **Implementation Target**: `src/inference/inertia-detector.ts`
- **Existing Related**: Codex #25 "Code Rot Prevention"

### anti-superficial
- **Category**: anti-pattern
- **Severity**: medium
- **Detection Rule**: "Flag code changes that modify only comments, whitespace, or variable names without altering any executable logic. Detect by comparing AST node counts before and after change"
- **Implementation Target**: `src/enforcement/validators/superficial-change-detector.ts`
- **Existing Related**: Codex #5 "Surgical Fixes Where Needed"

### anti-usurping
- **Category**: anti-pattern
- **Severity**: high
- **Detection Rule**: "Flag any agent invocation where the requested operation type does not appear in the agent's declared capabilities list. Enforce capability boundary at delegation time"
- **Implementation Target**: `src/agents/registry.ts` — extend `validateRegistryConsistency()` with `validateCapabilityBoundary()`
- **Existing Related**: Codex #52 "Agent Spawn Governance"

### anti-side-step
- **Category**: anti-pattern
- **Severity**: blocking
- **Detection Rule**: "Flag any code path that bypasses the processor pipeline by writing files directly without passing through preValidate and postValidate processors. Detect direct fs.write calls in agent code paths"
- **Implementation Target**: `src/enforcement/validators/bypass-detector.ts`
- **Existing Related**: Codex #58 "PostProcessor Validation Chain"

### anti-hodgepodge
- **Category**: anti-pattern
- **Severity**: medium
- **Detection Rule**: "Flag modules that mix more than 3 distinct architectural patterns (e.g., class-based + functional + event-driven + decorator) in a single file. Detect via AST pattern analysis"
- **Implementation Target**: `src/enforcement/validators/hodgepodge-detector.ts`
- **Existing Related**: Codex #15 "Separation of Concerns"

### anti-abrupt
- **Category**: anti-pattern
- **Severity**: medium
- **Detection Rule**: "Flag any process.exit(), unguided throw, or process.kill() that occurs without prior state persistence and cleanup logging. Verify shutdown handlers are registered before any termination path"
- **Implementation Target**: `src/enforcement/validators/abrupt-exit-detector.ts`
- **Existing Related**: Codex #32 "Proper Error Handling"

### anti-maligned
- **Category**: anti-pattern
- **Severity**: medium
- **Detection Rule**: "Flag functions or modules whose name implies one responsibility but whose implementation handles 3+ unrelated concerns. Detect by comparing function/method names against the set of external dependencies they access"
- **Implementation Target**: `src/enforcement/validators/maligned-detector.ts`
- **Existing Related**: Codex #24 "Single Responsibility Principle"

### feel-simple
- **Category**: aspirational
- **Severity**: low
- **Detection Rule**: "Measure cognitive complexity of public API surfaces using Halstead metrics. Flag any module where the weighted surface area (public methods × parameter count) exceeds 50"
- **Implementation Target**: `src/enforcement/validators/complexity-surface-validator.ts`
- **Existing Related**: Codex #19 "Small, Focused Functions"

### succinct
- **Category**: aspirational
- **Severity**: medium
- **Detection Rule**: "Flag any file exceeding 400 lines or any function exceeding 40 lines. Compute target line count from declared responsibility count (1 responsibility = max 50 lines)"
- **Implementation Target**: `src/enforcement/validators/succinct-validator.ts`
- **Existing Related**: Codex #19 "Small, Focused Functions"

### modular-bitsized
- **Category**: aspirational
- **Severity**: medium
- **Detection Rule**: "Flag any module that exports more than 15 symbols or has more than 5 direct dependencies. Require modules to be independently testable and loadable"
- **Implementation Target**: `src/enforcement/validators/bitsized-module-validator.ts`
- **Existing Related**: Codex #40 "Modular Design"

### cross-session-coherence
- **Category**: aspirational
- **Severity**: high
- **Detection Rule**: "At session end, persist a SessionSummary with corrections applied, decisions made, and preferences learned. At session start, load prior summaries and detect contradictions with current session decisions within the first 5 operations"
- **Implementation Target**: `src/session/session-state-manager.ts` — add `persistSessionSummary()` and `loadPriorSessionContext()`
- **Existing Related**: Codex #9 "Use Shared Global State Where Possible"

### deep-think
- **Category**: process
- **Severity**: high
- **Detection Rule**: "Before any code-modifying operation with complexity score >30, require a 3-phase deliberation: (1) generate impact assessment listing affected files/modules, (2) enumerate at least 2 alternative approaches, (3) record chosen approach with rationale. All three phases must be logged before the operation proceeds"
- **Implementation Target**: `src/processors/implementations/deliberation-processor.ts`
- **Existing Related**: Codex #6 "Batched Introspection Cycles"

### stagger
- **Category**: design
- **Severity**: high
- **Detection Rule**: "For processors that call external services or MCP servers, enforce a minimum inter-execution delay configured per processor. Processors with high latency (>500ms average) must have staggerPolicy with minIntervalMs > 0"
- **Implementation Target**: `src/processors/processor-manager.ts` — add `StaggerPolicy` to `ProcessorConfig` with `minIntervalMs` and execution throttling
- **Existing Related**: None

### disable-able-sub-calls
- **Category**: design
- **Severity**: medium
- **Detection Rule**: "All processor sub-operations must be individually addressable by a unique step ID. Each step must check a feature flag in features.json before execution. Steps with disabled flags must be skipped with a logged warning"
- **Implementation Target**: `src/processors/processor-interfaces.ts` — add `SubStep` interface and `subSteps: SubStep[]` to `IProcessor`
- **Existing Related**: Codex #37 "Configuration Management"

### cite-the-source
- **Category**: process
- **Severity**: medium
- **Detection Rule**: "Every code modification must include a comment referencing the originating request, task, or decision. Post-processor must verify the citation exists in modified files. Citation format: // REF: <source-id>"
- **Implementation Target**: `src/processors/implementations/source-citation-processor.ts`
- **Existing Related**: Codex #34 "Documentation Updates"

### diverging-systems-cleansed
- **Category**: design
- **Severity**: medium
- **Detection Rule**: "Track API surface drift between dependent modules. When two modules that share an interface have diverged by more than 15% in their exported types over 10 commits, flag for reconciliation"
- **Implementation Target**: `src/inference/divergence-detector.ts`
- **Existing Related**: Codex #25 "Code Rot Prevention"

### catalyst
- **Category**: aspirational
- **Severity**: medium
- **Detection Rule**: "Track which agent+pattern combinations produce the highest success rates. When a task matches a high-success pattern, pre-warm the relevant agent and inject the pattern's approach into the prompt. Success amplification factor must be >0.7 for catalyst activation"
- **Implementation Target**: `src/inference/inference-accumulator.ts` — add `catalystScore` to `RecurringPattern`
- **Existing Related**: None

### anti-fragile
- **Category**: aspirational
- **Severity**: high
- **Detection Rule**: "In test mode, deliberately inject random processor failures (5% rate), memory pressure spikes, and timeout accelerations. Measure recovery rate as anti-fragile score. Recovery rate must remain >80% under 3x normal failure injection"
- **Implementation Target**: `src/monitoring/chaos-engineer.ts`
- **Existing Related**: Codex #50 "Self-Healing Validation", Codex #51 "Graceful Degradation"

### simple-file-sync
- **Category**: design
- **Severity**: medium
- **Detection Rule**: "Flag files exceeding 400 lines. Detect orphaned exports (exported symbols with zero consumers). Verify that co-located files share naming conventions. Score file cohesion by computing the ratio of internal vs cross-module imports"
- **Implementation Target**: `src/enforcement/validators/simple-file-sync-validator.ts`
- **Existing Related**: Codex #40 "Modular Design"

### run-through-paces
- **Category**: process
- **Severity**: medium
- **Detection Rule**: "Provide a dry-run mode on processors that simulates execution and returns what-would-change without making modifications. DryRun flag must be testable within 30 seconds for the entire processor chain"
- **Implementation Target**: `src/processors/processor-interfaces.ts` — add `dryRun(context: ProcessorContext): Promise<SimulationResult>` to `IProcessor`
- **Existing Related**: None

### finite-lite
- **Category**: design
- **Severity**: medium
- **Detection Rule**: "Provide a lightweight execution mode that skips validation, persistence, and logging for rapid prototyping. Must complete a full cycle in <5s. Activated by features.json flag"
- **Implementation Target**: `src/core/features-config.ts` — add `finiteLiteMode: boolean` flag
- **Existing Related**: None

### precision-experience
- **Category**: aspirational
- **Severity**: medium
- **Detection Rule**: "Track change precision as ratio (targeted-lines-changed / total-lines-changed). Precision must be > 0.6 for codex compliance. System learns preferred change patterns per agent and adjusts over time"
- **Implementation Target**: `src/metrics/change-precision-tracker.ts`
- **Existing Related**: Codex #5 "Surgical Fixes Where Needed"

### convergence-enforcement
- **Category**: design
- **Severity**: medium
- **Detection Rule**: "When multiple agents produce conflicting outputs for the same task within a session, require convergence within 3 rounds. If convergence fails, escalate to orchestrator with full conflict context"
- **Implementation Target**: `src/delegation/convergence-enforcer.ts`
- **Existing Related**: `VotingCoordinator` at `src/delegation/voting-coordinator.ts`

### observability-trace-propagation
- **Category**: design
- **Severity**: high
- **Detection Rule**: "Propagate a traceId through all agent invocations and processor executions. Every FrameworkLogEntry must include traceId. Cross-agent calls must emit span events with parent-child relationship. Trace must be reconstructable from any single log entry to full causal chain"
- **Implementation Target**: `src/core/framework-logger.ts` — extend `FrameworkLogEntry` with `traceId` and `spanId` fields; add `withTrace()` context propagation
- **Existing Related**: `JobContext` at `src/core/framework-logger.ts:72-88`

---

## Implementation Priority Matrix

| Rank | Term | Impact | Effort | Dependency | Score |
|------|------|--------|--------|------------|-------|
| 1 | **stagger** | 9 | 2 | None | 4.50 |
| 2 | **deep-think** | 9 | 3 | features.json flag | 3.00 |
| 3 | **observability-trace-propagation** | 9 | 3 | None | 3.00 |
| 4 | **anti-fragile** | 8 | 3 | test infrastructure | 2.67 |
| 5 | **cite-the-source** | 7 | 3 | None | 2.33 |
| 6 | **cross-session-coherence** | 9 | 4 | SessionSummary schema | 2.25 |
| 7 | **convergence-enforcement** | 7 | 3 | VotingCoordinator exists | 2.33 |
| 8 | **stagger** | 9 | already counted | — | — |
| 9 | **precision-experience** | 6 | 3 | Change tracking | 2.00 |
| 10 | **anti-side-step** | 8 | 4 | Processor pipeline | 2.00 |
| 11 | **catalyst** | 6 | 3 | inference-accumulator | 2.00 |
| 12 | **disable-able-sub-calls** | 5 | 3 | IProcessor interface | 1.67 |
| 13 | **feel-simple** | 5 | 3 | AST analysis | 1.67 |
| 14 | **anti-monkey-patching** | 7 | 5 | AST analysis | 1.40 |
| 15 | **anti-fandangle** | 6 | 4 | Reference counting | 1.50 |
| 16 | **simple-file-sync** | 6 | 4 | Import analysis | 1.50 |
| 17 | **diverging-systems-cleansed** | 6 | 4 | Git history analysis | 1.50 |
| 18 | **anti-superficial** | 5 | 3 | AST diff | 1.67 |
| 19 | **anti-hodgepodge** | 5 | 4 | AST pattern analysis | 1.25 |
| 20 | **finite-lite** | 5 | 4 | features-config | 1.25 |
| 21 | **run-through-paces** | 5 | 4 | IProcessor interface | 1.25 |
| 22 | **anti-inertia** | 4 | 4 | Git analysis | 1.00 |
| 23 | **anti-maligned** | 4 | 4 | AST analysis | 1.00 |
| 24 | **anti-abrupt** | 4 | 5 | Process hooks | 0.80 |
| 25 | **succinct** | 4 | 5 | Line counting | 0.80 |
| 26 | **modular-bitsized** | 4 | 5 | Module analysis | 0.80 |
| 27 | **anti-usurping** | 6 | 8 | Agent delegation rewrite | 0.75 |

### Scoring Methodology

- **Impact** (1-10): How much the framework's reliability, effectiveness, or developer experience improves
- **Effort** (1-10, inverted to cost): Approximate implementation complexity in developer-days
- **Dependency**: What existing system must be in place first
- **Score**: Impact × (1 / Effort) — higher means more value per unit effort

### Top 5 Implementation Roadmap

1. **stagger** (Score 4.50): Add `StaggerPolicy` with `minIntervalMs` to `ProcessorConfig` at `src/processors/processor-manager.ts:8-16`, implement execution throttling in `executePreProcessors` at line 675. Zero dependencies. High impact for system stability under load.

2. **observability-trace-propagation** (Score 3.00): Extend `FrameworkLogEntry` at `src/core/framework-logger.ts:164-173` with `traceId` and `spanId`. Add `withTrace()` to `JobContext`. Zero dependencies. Unlocks debugging across agent boundaries.

3. **deep-think** (Score 3.00): Create `src/processors/implementations/deliberation-processor.ts` as a pre-processor. Check complexity score >30, require impact assessment with alternatives. Depends on features.json flag.

4. **cite-the-source** (Score 2.33): Create `src/processors/implementations/source-citation-processor.ts` as a post-processor. Verify `// REF:` comments exist in modified files. Zero dependencies.

5. **convergence-enforcement** (Score 2.33): Create `src/delegation/convergence-enforcer.ts` leveraging existing `VotingCoordinator` at `src/delegation/voting-coordinator.ts`. Detect conflicting agent outputs within a session and force resolution within 3 rounds. Low incremental effort since VotingCoordinator already exists.
