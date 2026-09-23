# 0xRay processor inventory

Catalog of every named or acting **pre-processor**, **post-processor**, **before/after hook**, **mill/inspect/release gate**, and **CI pre/post check** as of `4.0.12` (main). For mapping processors into Grok Bot release scripts/gates.

**How to read “active”:**

| Status | Meaning |
|--------|---------|
| **live-gate** | Runs on the worn suit today and can block or deny |
| **live-side-effect** | Runs on the worn suit; logs/markers only, does not block |
| **boot-registered** | Registered if ProcessorManager boot runs; not the OS constitution |
| **shipped-legacy** | In `0xray` dist; soft-deprecated or opt-in; not the consumer 7-MCP surface |
| **mill-gate** | `@0xray/foundry` mill CLI / release / inspect |
| **ci-gate** | GitHub Actions on this repo |
| **helper** | Not a registered processor; used by one |

There is **no** `processors` key in current `xray/features.json`. Boot uses hardcoded `PROCESSOR_DEFS` in `src/core/boot-orchestrator.ts`. Consumer 7 MCPs do **not** include `processor-pipeline`.

---

## Intended pipeline order (pre → work → post)

Three parallel pipelines, not one chain. Map Grok Bot gates to **A + C**. Treat **B** as legacy compat.

### A. Agent tool (live OS — this is the suit)

```
SessionStart / UserPromptSubmit
  → PreToolUse (evaluatePreToolGate: Codex 11/29/69, spawn, synthesis, delegation)
  → tool runs
  → PostToolUse (auto-chain + grok_postprocessor_light marker)
  → PreCompact / PostCompact (station heat)
```

Hosts: Grok `hooks.json`, Cursor `.cursor/hooks.json` (`preToolUse` / `preCompact`; no `sessionStart` on managed cloud), OpenCode plugin `tool.execute.before/after`, Hermes `onPreToolCall` / `onPostToolCall`, OpenClaw `xray-pre-tool`. Shared entry: `src/integrations/enforcement-gate.ts` + `src/integrations/hooks/delegation-gate-runtime.mjs`.

### B. ProcessorManager (legacy / boot compat)

```
prompt-security-validator (inline, if prompt text)
  → executePreProcessors (priority order)
  → work / agent task
  → executePostProcessors (priority order, also on failure)
```

Registered at boot (`boot-orchestrator.activateProcessors`) and OpenCode plugin (`plugin-helpers.registerAllProcessors`). The old `src/postprocessor/PostProcessor.ts` loop is **soft-deprecated** (docs: `enablePostProcessor: false` since 3.0; `src/core/xray-activation.ts` still defaults `true` — docs/code disagree).

### C. Mill / git / release / CI

```
mint (fasten plant) → inspect (6 checks)
  → pre-commit (tsc + staged Codex) → commit → post-commit (logs + session capture)
  → pre-push (tsc + range Codex) → push → post-push (logs)
  → foundry release:
      reconcile bump → stamp artifacts → gate (build+test+docs+verifiers+smoke)
      → commit/push → gate --verify-only → npm publish → tag
  → CI: quality → mill → build → test → smoke → docs
```

`npx @0xray/foundry` commands: `reconcile | stamp | gate | release | docs-check | docs-build | mint | inspect | ci | hooks`.

---

## 1. ProcessorManager implementations (`src/processors/`)

Factories live in `ProcessorManager.registerBuiltInFactories()`. Boot registration is `PROCESSOR_DEFS` in `src/core/boot-orchestrator.ts`. Config loader: `src/postprocessor/config/ProcessorConfigLoader.ts` → `features.processors` (absent on current plant).

OpenCode plugin registers a **subset**: `preValidate`, `codexCompliance`, `versionCompliance` (pre); `testAutoCreation`, `testExecution`, `coverageAnalysis` (post). See `src/plugin/plugin-helpers.ts`.

`testExecution` and `refactoringLogging` **class as `PreProcessor`** but boot registers them as **post**. `testAutoCreation` is factory-only (no `PreProcessor` class) and plugin registers it as post.

### 1.1 Pre (before tool / write / commit)

| id | priority (class / boot) | What it does | Implemented | Config / surface | Active |
|----|-------------------------|--------------|-------------|------------------|--------|
| `preValidate` | 1 / 10 | Lightweight syntax-ish check; fails if string `data` contains `"undefined"` | `src/processors/implementations/pre-validate-processor.ts` | boot + plugin + PostProcessor defaults | boot-registered; shipped in `0xray` |
| `codexCompliance` | 2 / 20 | Runs `RuleEnforcer.validateOperation`; attempts auto-fix on violations | `codex-compliance-processor.ts` | boot + plugin + Codex | boot-registered |
| `errorBoundary` | 5 / 30 | Collects prior processor errors; does not rethrow | `error-boundary-processor.ts` | boot | boot-registered |
| `logProtection` | 10 / 37 | Blocks delete of `activity.log`, `routing-outcomes.json`, `.opencode/state/` | `log-protection-processor.ts` | boot | boot-registered |
| `testExecution` | class pre 10 / **boot post 60** | Runs vitest (or detected language tests) for a file | `test-execution-processor.ts` | boot post + plugin post | boot-registered (as **post**) |
| `refactoringLogging` | class pre 8 / **boot post 80** | Appends refactoring session to `logs/agents/refactoring-log.md` | `refactoring-logging-processor.ts` + `-wrapper.ts` | boot post; needs `agentName`/`task` | boot-registered (as **post**) |
| `versionCompliance` | — / 25 | package.json SSOT vs mill reconcile; blocks version/publish drift | `version-compliance-processor.ts` | boot + plugin; mill `reconcile-version.mjs` is the real ship path | boot-registered |
| `agentsMdValidation` | — / 35 | On write/edit: AGENTS.md exists + required sections/agents | `agents-md-validation-processor.ts` | boot; CI twin `enforce-agents-md.yml` | boot-registered + **ci-gate** |
| `typescriptCompilation` | — / 15 | `tsc --noEmit`; skip if no tsconfig | `typescript-compilation-processor.ts` | boot; git hook does the **live** tsc | boot-registered |
| `spawnGovernance` | — / 40 | Codex 52–57: concurrent/rate/infinite-spawn limits | `spawn-governance-processor.ts` | boot; **live** spawn gate is PreToolUse | boot-registered (legacy vs PreToolUse) |
| `performanceBudget` | — / 45 | Codex 28: file size / fn length / nesting / params | `performance-budget-processor.ts` | boot | boot-registered |
| `asyncPattern` | — / 50 | Codex 31: callbacks, long `.then` chains, missing await | `async-pattern-processor.ts` | boot | boot-registered |
| `consoleLogGuard` | — / 55 | Codex 33: `console.*` → `frameworkLogger` (skip tests) | `console-log-guard-processor.ts` | boot; **live** twin is git pre-commit + Grok PreToolUse Codex 7 | boot-registered |
| `testAutoCreation` | — / 22 (boot pre) | Generates a test file next to new source | `test-auto-creation-processor.ts` | boot pre; plugin **post** | boot-registered |
| `prompt-security-validator` | inline before pre loop | Blocks unsafe prompt text in `executePreProcessors` args | `src/security/prompt-security-validator.ts` (called from `processor-manager.ts`) | none | helper on ProcessorManager path |

### 1.2 Post (after tool / commit)

| id | priority (class / boot) | What it does | Implemented | Config / surface | Active |
|----|-------------------------|--------------|-------------|------------------|--------|
| `storytellingTrigger` | 5 / 5 | Commit/diff thresholds → reflection / inference capture | `storytelling-trigger-processor.ts` | `features.storytelling`; boot | boot-registered |
| `inferenceImprovement` | 5 / 75 | Writes inference workflow context from reflections/logs/reports | `inference-improvement-processor.ts` | `inference_governance`; light twin on SessionStart | boot-registered + live-side-effect light |
| `publishPreflight` | 10 / 125 | Docs + reflection age + ≥3 pipeline tests before publish | `publish-preflight-processor.ts` | `features.publish`; mill `docs-check` / `publish.yml` are the **live** twins | boot-registered |
| `stateValidation` | 12 / 130 | `stateManager.get("session:active")` truthy | `state-validation-processor.ts` | boot | boot-registered |
| `sessionSummary` | 15 / 10 | Emoji session summary from tool/agent counters | `session-summary-processor.ts` | `autonomous_reporting` | boot-registered |
| `regressionTesting` | 15 / 65 | Diff vs `.opencode/xray/test-count.json` baseline | `regression-testing-processor.ts` | boot | boot-registered |
| `coverageAnalysis` | 45 / 70 | Coverage gaps for a file | `coverage-analysis-processor.ts` | boot + plugin post | boot-registered |
| `commitBatcher` | 85 / 85 | Feeds file writes into `IntelligentCommitBatcher` | `commit-batcher-processor.ts` | boot | boot-registered |
| `nudge` | 100 / 78 | Nudge watchdog on stuck think/fix loops | `nudge-processor.ts` | `nudge_watchdog` | boot-registered |
| `postProcessorChain` | — / 140 | Validates post chain ran in priority order | `postprocessor-chain-validator.ts` | boot | boot-registered |
| `consoleLogGuardPost` | factory only | Same scan as `consoleLogGuard`, post context | `console-log-guard-processor.ts` | **not** in boot `PROCESSOR_DEFS` | factory only |

### 1.3 Helpers (not registered processors)

| id | What | Path | Active |
|----|------|------|--------|
| `SessionCapture` | Find reflections/logs/reports for inference | `session-capture-processor.ts` | helper |
| `DocWriteGuard` | Safe append/create for `docs/` | `src/processors/doc-write-guard.ts` | helper |
| `ProcessorLoader` | Placeholder enforcement rules | `src/enforcement/loaders/processor-loader.ts` | shipped-legacy (always-pass) |

MCP (not consumer-7): `src/mcps/processor-pipeline.server.ts` tools `execute-pre-processors`, `execute-post-processors`, `codex-validation`, `compliance-check`. Skill: `src/skills/processor-pipeline/SKILL.md`. Agent YML: `src/opencode/agents/processor-pipeline.yml`. Knowledge-skill leftover; routing keyword only.

---

## 2. PostProcessor pipeline (`src/postprocessor/`) — soft-deprecated

God-object CI/CD loop: commit → monitor → analyze → autofix → redeploy → escalate → success. Docs since 3.0: do not route the architecture through this. Code is still in `0xray` dist.

| Name | Phase | What | Path | Active |
|------|-------|------|------|--------|
| `PostProcessor` | post / opt-in boot | Orchestrates the loop; registers a **smaller** pre/post set than boot | `PostProcessor.ts` | shipped-legacy |
| `GitHookTrigger` | git post | Archive/cleanup logs (called from `run-hook.js`) | `triggers/GitHookTrigger.ts` | live-side-effect via git hooks |
| `WebhookTrigger` / `APITrigger` | unused by mill | Trigger adapters | `triggers/` | shipped-legacy |
| `MonitoringEngine` | post | Poll after push | `monitoring/MonitoringEngine.ts` | shipped-legacy |
| `FailureAnalysisEngine` / `CodeChangeAnalyzer` | post | Classify failures | `analysis/` | shipped-legacy |
| `AutoFixEngine` / `FixValidator` | post | Confidence-gated autofix | `autofix/` | shipped-legacy |
| `RedeployCoordinator` / `RetryHandler` | post | Canary/retry | `redeploy/` | shipped-legacy |
| `EscalationEngine` | post | Manual / rollback thresholds | `escalation/` | shipped-legacy |
| `SuccessHandler` | post | Cleanup + notify | `success/` | shipped-legacy |
| `RegressionAnalysisService` | post | Regression service | `services/` | shipped-legacy |
| `LightweightValidator` / `ComprehensiveValidator` / `HookMetricsCollector` | post | Validation + metrics | `validation/` | shipped-legacy |
| `SelfProposalEngine` / `MetamorphosisEngine` | post-process-complete | activity.log → governed proposals (≥0.7) | `metamorphosis/` | shipped-legacy; wired if PostProcessor constructed |
| `ProcessorConfigLoader` | config | `features.processors` | `config/ProcessorConfigLoader.ts` | no plant key today |

`enablePostProcessor`: README + `docs-site/docs/guides/consumer-migration.md` say **false**. `defaultXrayConfig.enablePostProcessor` in `xray-activation.ts` is still **true**.

---

## 3. Live host hooks (PreToolUse / PostToolUse)

These are the **OS gates**. Not ProcessorManager.

| id | Pre/post | Phase | What | Path | Config | Active |
|----|----------|-------|------|------|--------|--------|
| `evaluatePreToolGate` | pre | agent tool | Codex 11/29/69, surface-area, spawn-without-plan, leftover-plan, synthesis-due, pending-delegation. Temperament: guided=deny spawn, frontier=warn | `src/integrations/hooks/delegation-gate-runtime.mjs` (+ TS nucleus re-export) | `suit_temperament`, `multi_agent_orchestration`, `synthesis` | **live-gate** on all 4 hosts |
| `grok-pre-tool-use` | pre | Grok PreToolUse | stdin JSON → `{decision:allow\|deny}`; gate + extra Codex 2/7 on writes + full-`npm test` hint | `src/integrations/grok/hooks/pre-tool-use.js` | installed `hooks.json` | **live-gate** |
| `grok-post-tool-use` | post | Grok PostToolUse | Auto-chain pending/clear; `runGrokPostprocessorLight` on write tools | `post-tool-use.js` | `grok_postprocessor_light: true` in current plant | **live-side-effect** |
| `runGrokPostprocessorLight` | post | write tools | Writes `.xray/inference/postprocessor-light-latest.json` + activity.log | `src/integrations/hooks/pipeline-hook-runtime.mjs` | `features.grok_postprocessor_light` | **live-side-effect** (ON) |
| `maybeRunReflectionStub` | post | SessionStart | Commit-threshold reflection stub | same | `synthesis.reflection` | live-side-effect if configured |
| `recordRoutingOutcome` | post | PostToolUse | Append `logs/framework/routing-outcomes.json` | same | none | **live-side-effect** |
| `scheduleAutonomousReportingMarker` | post | SessionStart | `reports/.autonomous-reporting-scheduled.json` | same | `autonomous_reporting` | live-side-effect (ON) |
| `runInferenceImprovementLight` | post | SessionStart | Light workflow JSON under `.xray/inference/` | same | skips if `inference_governance.enabled === false` (current plant: false) | off on current plant |
| Grok session / compact | pre/post | SessionStart, UserPromptSubmit, PreCompact, PostCompact | Session-boot + station + synthesis turn slice | `session-start.js` | `hooks.json` | **live-side-effect** |
| `cursor-pre-tool-use` | pre | Cursor `preToolUse` | stdin JSON → `{permission:allow\|deny}`; same gate; first-tool Station boot | `src/integrations/cursor/hooks/pre-tool-use.js` | repo `.cursor/hooks.json` | **live-gate** when project hooks load |
| Cursor preCompact | pre | Cursor `preCompact` | Station merge + `event_class` (`cursor-host-precompact` \| `cursor-precompact-synthetic`) | `pre-compact.js` | same | **live-side-effect** |
| OpenCode plugin | pre/post | `tool.execute.before/after` | Codex inject + ProcessorManager subset + `evaluatePreToolGate` | `src/plugin/xray-codex-injection.ts` | `package.json` `opencode.plugin` | **live-gate** when OpenCode wears 0xray |
| `beforeToolHook` / `afterToolHook` | pre/post | all hosts | ValidatorRegistry + optional ProcessorManager + v3 PostProcessor loop + govern | `src/integrations/enforcement-gate.ts` | none | live if host calls it; after-hook is non-blocking on errors |
| Hermes pre/post | pre/post | `onPreToolCall` / processors | `evaluatePreToolGate` + ProcessorManager if present | `src/integrations/hermes-agent/bridge.mjs` | `npx 0xray hermes install` | **live-gate** when worn |
| OpenClaw PreToolUse | pre | host hook | Same gate → `{action:block\|allow}` | `src/integrations/openclaw/hooks/pre-tool-gate-runtime.mjs`, plugin `xray-pre-tool` | `npx 0xray openclaw install` | **live-gate** when worn |

Grok hook install dest: project `.grok/plugins/0xray` (mill isolated-HOME rule). Template: `src/integrations/grok/plugin/0xray/hooks/hooks.json`. Wear: `scripts/node/install-bridges.cjs`.

---

## 4. Git hooks (mill `hooks`)

Installer: `scripts/hooks/install-hooks.cjs` (also `npx @0xray/foundry hooks`). Runner: `scripts/hooks/run-hook.js`.

| id | Pre/post | Phase | What | Blocks? | Active |
|----|----------|-------|------|---------|--------|
| `pre-commit` | pre | git commit | `tsc --noEmit` on staged + Codex scan of **staged hunks** (`console.log` error; TODO/`any`/`@ts-ignore` warn) | **yes** | **live-gate** if hooks installed |
| `post-commit` | post | git commit | Log archive/cleanup via `GitHookTrigger`; `inference_session_capture` (ON: min 3 commits) | no | **live-side-effect** |
| `pre-push` | pre | git push | Same tsc + Codex on **commit range** + test-file warning | **yes** (tsc/codex) | **live-gate** |
| `post-push` | post | git push | Log maintenance | no | **live-side-effect** |
| `pre-command` | pre | command | Context-window ≥95% → write reflection before compaction | no (exit 0 on fail) | `scripts/hooks/pre-command.mjs`; installed optionally |

Verify scripts (used by release gate): `verify:pre-commit-diff`, `verify:pre-push-diff`.

---

## 5. Mill / foundry / pack / publish

Package: `@0xray/foundry` `0.1.12` (`scripts/foundry/`). Shipped separately from exo `0xray`. Fasten is foundry-plant/0. Blip/sound mill drawers live in `@0xray/blip`; this mill shims `foundry blip|sound`.

| id | Pre/post | Phase | What | Path | Active |
|----|----------|-------|------|------|--------|
| `mint` | pre-wear | mill | Fasten mill plant (`mill`+`inspect`) + overlay their plant; CLI mint then inspect | `mint.mjs`, `mint-suit.cjs` | **mill-gate** |
| `inspect` | post-mint / anytime | mill | Six checks: diff, plant-vs-worn, receipt, CI report, live npm `.tgz` GET, isolated HOME | `inspect.mjs` | **mill-gate** (`--skip-live` for postinstall) |
| `gate` | pre-tag / pre-publish | release | Exo: build, `test:comprehensive`, docs-check, hook verifiers, plugin structural, consumer smoke. `--verify-only`: git+reconcile+docs+plugins+smoke | `release-gate.mjs` | **mill-gate** |
| `release` | full | release | bump → stamp → **gate** → commit/push → **gate --verify-only** → publish → tag | `release.mjs` | **mill-gate** (`--i-mean-it`) |
| `docs-check` | pre-publish | release | README/AGENTS/SKILLS/llms/CHANGELOG/Docusaurus headers vs package.json | `validate-release-docs.mjs` | **mill-gate** |
| `docs-build` | pre-docs-deploy | release | Docusaurus build | `docs-build.mjs` | **mill-gate** |
| `reconcile` | pre-bump | release | package.json version SSOT vs registry | `reconcile-version.mjs` | **mill-gate** |
| `stamp` | pre-gate | release | Artifact rewrite (`--artifacts-only`) | `version-manager.mjs` | **mill-gate** |
| `ci` | post-CI | mill | Write `.xray/foundry-ci-report.json` (inspect reads this) | `ci-monitor.mjs` | mill report, not a blocker |
| `hooks` | wear | mill | Install git hooks | `hooks.mjs` | mill |
| `pre-publish-guard` | pre-publish | exo script | git + reconcile + optional build/test/smoke | `scripts/node/pre-publish-guard.js` | called by `gate --verify-only` |
| `prepublishOnly` | pre-npm-publish | npm | reconcile `--check` + `prepare-consumer` + `build:all` | `package.json` | **live-gate** on `npm publish` |
| `pack:tmp-proof` / consumer smoke | post-pack | mill/CI | Pack tgz → tmp install → mint + inspect (not costume) | `scripts/node/consumer-install-smoke.mjs`, `pack-tmp-suit-proof.mjs` | **ci-gate** + release gate |
| `publish.yml` preflight | pre-publish | CI | build, docs-check, required docs, ≥3 pipeline tests, Docusaurus | `.github/workflows/publish.yml` | **ci-gate** (workflow_dispatch) |

Inspect check ids: `diff`, `plant-vs-worn`, `receipt`, `ci`, `live-put`, `isolated-home`. Skill cards: `scripts/foundry/plant/skills/{mill,inspect}/SKILL.md`.

---

## 6. CI (GitHub Actions)

| Workflow | Role | Pre/post | Active |
|----------|------|----------|--------|
| `mill-ci.yml` (`0xRay CI/CD`) | quality (tsc+eslint) → mill (docs+foundry tests) → build+plugin structural → `test:comprehensive` → consumer smoke → docs-build → summary AND | **ci-gate** on push/PR to main |
| `enforce-version-compliance.yml` | docs-check + foundry mill tests | pre-merge | **ci-gate** |
| `enforce-agents-md.yml` | `scripts/node/enforce-agents-md.mjs` | pre-merge | **ci-gate** |
| `processor-tests.yml` | mock coverage + `processor-activation` tests (path-filtered) | pre-merge on `src/processors/**` | **ci-gate** (narrow) |
| `release.yml` | `foundry/release.mjs <bump> --i-mean-it` | release | **ci-gate** (manual) |
| `publish.yml` | preflight then `npm publish` | release | **ci-gate** (manual; overlaps foundry release) |
| `mill-monitor.yml` | post-workflow CI report for inspect | post | live-side-effect |
| `auto-report.yml` | hourly reports incl. `processor_execution` | post | scheduled |
| `deploy-docs.yml` | docs site | post | ci |
| `hermes-plugin.yml` | Hermes plugin tests (label-gated) | pre | optional |
| `lint.yml` | folded into mill-ci quality | — | dispatch-only stub |
| `security.yml` / `security-audit.yml` / `security-monitoring.yml` / `codeql.yml` | security pre-merge / scheduled | pre | ci |

Release-gate extra verifiers (exo only): `verify:pre-commit-diff`, `verify:pre-push-diff`, `verify-delegation-gate-core` (grok/hermes/opencode), `verify-hermes-session-start`, `verify-confer-core`, `verify:user-aside`, `verify-pipeline-facets --package-only`.

---

## 7. What to map into Grok Bot (recommended)

Use **live-gate** + **mill-gate** only. Do not re-implement ProcessorManager in Bot scripts.

| Bot gate slot | 0xRay id to call / mirror |
|---------------|---------------------------|
| Before write / spawn | `evaluatePreToolGate` / Grok `pre-tool-use.js` |
| After write | `runGrokPostprocessorLight` (already ON) |
| Before commit | git `pre-commit` (`run-hook.js`) |
| After commit | git `post-commit` + `inference_session_capture` |
| Before push | git `pre-push` |
| Before tag/publish | `npx @0xray/foundry gate` then `gate --verify-only` |
| Wear / plant | `npx @0xray/foundry inspect` (six checks + harness GO) |
| Docs freshness | `npx @0xray/foundry docs-check` |
| Consumer pack | `consumer-install-smoke.mjs` / `pack:tmp-proof` |

**Do not treat as release gates:** `processor-pipeline` MCP, `PostProcessor` loop, boot `PROCESSOR_DEFS` extras (`nudge`, `storytellingTrigger`, `spawnGovernance` processor — spawn is already PreToolUse).

---

## 8. Type / registry mismatches (do not “fix” here)

1. `testExecution` class = pre; boot + plugin = post.
2. `refactoringLogging` wrapper = pre; boot = post.
3. `testAutoCreation` boot = pre; plugin = post.
4. `consoleLogGuardPost` factory exists; not in `PROCESSOR_DEFS`.
5. `PostProcessor.ts` registers 6 pre + 5 post; boot registers 13 pre-typed + 12 post-typed.
6. `enablePostProcessor` docs vs `xray-activation.ts` default.
7. Current plant has no `features.processors` object.

Archived (stale) inventory: `docs-site/docs/archive/architecture/PIPELINE_INVENTORY.md`.
