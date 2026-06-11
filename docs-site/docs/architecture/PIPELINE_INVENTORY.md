# 0xRay Pipeline Inventory

**Version**: 3.3.1 (v3 exhaustive trace)  
**Date**: 2026-06-11  
**Author**: 0xRay AI Team (via @researcher agent comprehensive source tracing)

**Status**: Updated from direct code reads (enforcement-gate.ts, PostProcessor.ts + all subs, inference-cycle.ts, governance-service + nucleus/*, ValidatorRegistry 29, CI scripts/workflows, hooks, mcp-client, framework-logger, etc.), call-chain greps, file lists. Supersedes v2 summaries. Cross-refs V3-ENFORCEMENT-PIPELINES.md (hooks/CI/PostProcessor focus) and PIPELINE_ARCHITECTURES.md.

---

## Executive Summary

This document catalogs **EVERY** major + sub-pipeline in the xray v3 MCP-centric three-subsystem system (Inference + External Governance/Dynamo + Autonomous Engine/thinDispatch in nucleus + MCP orchestrator). 

Traced end-to-end from actual src/ (no reliance on stale docs alone): entry points (esp. hooks/gate, CI, triggers), components, data flows (imports/calls), sub-engines, artifacts (logs/state/reports), testing status (unit/int/e2e/pipeline mjs + 2880+), codex terms covered (e.g. 7/8/24/26/29/36/41/43/46/52-61/58/69-71/74/76/77/79-81+), gaps (non-blocking, legacy-compat only in gate/PP, missing diagrams), and cross-pipeline integrations (gate → PostProcessor loop + explicit validators → governance (handleGovernRequest) if proposal-like → inference/SelfProposal → logger/events → CI/consumer feedback).

**Total Pipelines Identified**: 15+ core + 10+ sub + 8+ supporting (build/release/MCP-connect/docs/security/CLI/test/activation/consumer-bridge) — v3 nucleus + enforcement expansion.  
**Test Coverage**: 2880+ tests (full suite green post-enforcement-gate + CI script + verify-consumer E2E). Pipeline tests in src/__tests__/pipeline/ (run-all-pipelines.mjs requires 3 consecutive passes). Gate/consumer E2E in CI + verify-consumer.sh Phase 5b.  
**Key v3 Reality**: Enforcement ONLY via enforcement-gate.ts (4 plugins: OpenCode plugin/xray-codex-injection.ts, Hermes hermes-agent-integration + bridge, Grok grok/hooks/pre-tool-use.ts, OpenClaw openclaw/hooks + mcp events) or CI direct (enforce-validators.mjs + consumer tarball gate exercise). No host-side legacy duplicates post-P0/P1. frameworkLogger ONLY. PostProcessor v3 reachable from gate/CI/hooks. Nucleus is thin (kernel/orchestrator/plugin-registry/thin-dispatch). 

**Missed/Additional Pipelines Discovered (beyond listed 15)**: Build/Publish (tsc+copy in package.json + prepublish), Release (release.yml + release.mjs + verify gate), MCP Connectivity/Validation (validate-mcp-*.cjs + sims in mcp-client), Docs Build (docusaurus + deploy-docs.yml + enforce-agents-md), Version/Compliance Enforcement (enforce-version-*.yml + scripts), Security Audit (multiple yml + hardener + comprehensive-audit), CLI Command Execution, Test Pipeline Runner, Kernel/Activation/Features (xray-activation, features-config), Consumer Bridge E2E (4 E2E mjs + plugin registry test), Plugin Registration/Default-Plugins, Session Capture/Accumulation (inference sub), Agent Spawn Governance sub-flows.

---

## Core Cross-Cutting: Logging/Event Pipeline (15)

**Purpose**: Structured, auditable, framework-only event emission for ALL operations (no console.*). Feeds activity.log (SSOT for reporting, SelfProposal, analysis), mcp events, traces, metrics, compliance.

**Entry Points**: Every pipeline (gate, PP, inference, gov, nucleus, enforcer, etc.) calls frameworkLogger.log("component", "action-id", "level", data). MCP tool events via mcp-client EventEmitter (ToolBeforeEvent/ToolAfterEvent).

**Components/Files**:
- `src/core/framework-logger.ts` (core impl: jobId/trace/span context, write to logs/framework/activity.log + .opencode/logs/, structured format)
- `src/core/activity-logger.ts` (activity.* helpers)
- Rotated: framework-activity-*.log.gz
- mcp-client.ts emits Tool* events (OpenClaw subscribes/forwards to gate)
- Triggers in PP postprocessor/triggers/ use logs.

**Data Flow**:
Tool/hook/action → frameworkLogger.log(...) → append activity.log (with timestamp/job/trace) + rotate + emit events → consumed by: reporting (parseLog), SelfProposalEngine (parse for errors/warns/rejects → proposals), gate/PP logs, CI health, OpenClaw Gateway, tests (activity.log verification in verify-consumer Phase 6).

**Artifacts**: logs/framework/activity.log (current), rotated gz, .opencode/logs/, hook-metrics.json, state keys.

**Testing**: framework-logger-persistence.test.ts, E2E in verify-consumer (structured entries check), OpenClaw e2e Phase 13.

**Codex**: All (frameworkLogger ONLY per AGENTS/Claude; supports 7/8/58 etc via auditability).

**Gaps**: Some legacy malformed keys fixed in cascade; non-persistent in some envs.

**Integrations**: EVERY pipeline → logger → SelfProp/inference/gov/reporting/CI/consumer verification. Gate/PP explicitly log before/after decisions, violations, processor results, governanceTriggered.

---

## 1. Boot/Nucleus Pipeline (v3 thin; replaces legacy boot-orchestrator)

**Purpose**: Thin kernel initialization, component dep graph, plugin/skill registration, governance surface bootstrap, thinDispatch routing setup. Post-boot: gate + PostProcessor + MCPs active.

**Entry Points**: NucleusOrchestrator.executeBootSequence() (from MCP boot-orchestrator.server.ts, activation, tests, consumer postinstall); nucleus/index exports; handleGovernRequest surface immediately available.

**Components/Files** (src/nucleus/ + support):
- `src/nucleus/kernel.ts` (barrel: handleGovernRequest, thin-dispatch exports, pluginRegistry, SelfProposalEngine type, NUCLEUS_*)
- `src/nucleus/orchestrator.ts` (NucleusOrchestrator: bootSequence 12 components w/ explicit deps map (configuration→...→framework-hooks), parallel/seq exec, validatePrerequisites (node>=18, dirs, package.json), init* methods (mostly no-op placeholders + counts for agents/MCPs), shutdown, dep validation/circular detect)
- `src/nucleus/thin-dispatch.ts` (scoreComplexity via ComplexityAnalyzer, routeToAgent via core mappings, scoreAndRoute; logs via frameworkLogger)
- `src/nucleus/govern-http.ts` (handleGovernRequest pure handler (validate proposals array → getGovernanceService().govern), GovernHTTPAdapter tiny Express /govern)
- `src/nucleus/plugin-registry.ts` (register/registerToolPlugin for skills + multi-tool (knowledge servers); callSkill/callSkillTool; defaults via default-plugins)
- `src/nucleus/default-plugins.ts` (registerDefaultPlugins → 3 gov skills + others via in-process)
- `src/nucleus/index.ts` (stable exports)
- Legacy compat: `src/core/boot-orchestrator.ts` (XRAY_ env, ProcessorManager, agent-delegator/session init, graceful SIG, still used in some consumer/bridge paths)
- Support: delegation/complexity-*, state/state-manager (for boot state), agents/registry, mcps/config, integrations/governance (Dynamo init)

**Data Flow**:
Boot trigger → validate prereqs → (parallel/seq) init dep graph (config/logging/plugin-reg/state/security/codex/context/processor-pipeline/agent-registry/orchestrator/mcp-servers/framework-hooks) → registerDefaultPlugins (skills to pluginRegistry) → thinDispatch ready (score/route) → handleGovernRequest surface live → state "nucleus:*" / "enforcement:active" etc. → gate/PP/MCP activation post-nucleus.

**Sub-pipelines/Engines**: Dep resolution, parallel boot, circular detect, component health, shutdown reverse seq, thinDispatch (complexity tiers: simple≤15 single-agent, moderate≤25 w/tools, complex≤50 multi, enterprise>50 orchestrator-led).

**Artifacts**: State entries (post boot), shutdown-state.json, agent counts, MCP counts, plugin registry map.

**Testing**: nucleus/__tests__/* (govern-http, kernel-smoke), integration/boot-orchestrator (legacy), kernel-integration.test.ts.

**Codex Terms**: 52-61 (agent spawn gov, limits, no sub-spawn, rate limits, memory, PostProcessor chain 58), boot-wiring/74 in validators, overall process (61 one-thing, 62 triage-fix-loop).

**Gaps**: Many init* are stubs (real work in sub modules); legacy boot-orchestrator still referenced for consumer compat (documented fallbacks xray*/strRay*); no full health checks in all paths.

**Integrations**: Nucleus boot precedes gate/PP (enforcement activated post); thinDispatch used by delegation/orchestrator/routing; handleGovernRequest called from gate (proposal results), inference (governViaNucleus), SelfProposalEngine, gov MCP server, CLI govern cmd; pluginRegistry used by gov-service for 3 MCP skills.

---

## 2. Inference Pipeline (Autonomous Learning + Proposal Gen)

**Purpose**: Continuous improvement via corpus accumulation from sessions/logs, recurring pattern/problem detection, proposal generation (fix/refactor/guard/automate/codify), confidence adjustment via validators, governance, apply (surgical via agents or guard docs), deploy verify. Self-evo via SelfProposal.

**Entry Points**: InferenceCycle.maybeRunCycle() (from PP success/regression/inferenceImprovement post-proc, gate on proposal-like _result in afterToolHook, CLI, scheduled?); governExternalProposals; SelfProposalEngine.onPhase (from PP).

**Components/Files**:
- `src/inference/inference-cycle.ts` (InferenceCycle singleton: maybeRunCycle, generateProposals, governProposals/governViaNucleus (→handleGovernRequest), applyProposals (via ProposalApplier or invokeOpencodeFromEngine "refactorer"/"code-reviewer"/"architect"), researcherReview, deploy verify, history adjust, phase tracking, reEntryLock)
- `src/inference/inference-accumulator.ts` (shouldTriggerCycle, accumulateCorpus → sessions/recurringPatterns/recurringProblems/wrongTurns)
- `src/inference/session-capture.ts`, `deploy-verifier.ts`
- `src/execution/proposal-applier.ts`, `opencode-cli-invoker.ts`
- Validators in generateProposals: globalValidatorRegistry "no-over-engineering" + "single-responsibility" (term 1/3/5) → confidence *=0.85 + evidence
- Learning: src/services/inference-tuner.ts, src/analytics/* (pattern-learning-engine, emerging-pattern-detector, routing-performance-analyzer, prompt-pattern-analyzer), delegation/analytics/outcome-tracker + learning-engine, routing-refiner
- Calls: handleGovernRequest (nucleus), frameworkLogger everywhere.

**Data Flow**:
Trigger (force or corpus threshold) → collect/accumulateCorpus (inference dir + state) → generateProposals (recurringProblems → proposals + patterns + wrongTurns; cap 5/3; validator adjust conf for 1/3/5) → adjustFromHistory → governProposals (governViaNucleus: map to GovernanceRequest source:'inference' → handleGovernRequest → votes) → approved → (skipApply? apply: ProposalApplier or agent invoke) → (skipDeploy? : DeployVerifier) → phase complete + save state/history + append result → recordOutcome (for learning/tuner) → if meta: SelfProp.

External proposals path similar w/ lock.

**Sub-pipelines/Engines**: Accumulator (recurring detection), proposal gen + validator filter (terms 1/3/5), governance sub (nucleus 3MCP+Dynamo), apply (agent or fallback guard/automation md), deploy-verify, history/adjust (success rate type conf), tuner (periodic 60s, reload, thresholds 5 outcomes/3 patterns/80%, suggest mappings), pattern detectors.

**Artifacts**: docs/inference/*, .xray/inference/inference-state.json (cycleState/history/governanceState), routing-mappings.json (auto), routing-outcomes.json, pattern-metrics.json, logs for proposals.

**Testing**: inference tests, delegation/analytics/* tests, integration w/ 30s tuner, pipeline mjs, gate E2E (proposal result triggers), verify-consumer indirect.

**Codex**: 1/3/5 (validator in gen), 7/8/69-71 (via gov/SelfProp), 58 (PP), outcome tracking for learning (improvement).

**Gaps**: Options skip* for tests; reEntryLock prevents recursion; researcherReview not always used; apply can fallback to md files (non-code); some confidence non-blocking.

**Integrations**: Triggered from PP (post success + regression/inferenceImprovement processor) + gate (if _result has title/desc) + SelfProposal; feeds governance (handleGovernRequest); outcomes → learning/tuner/routing analytics → delegation; apply invokes agents (orchestration sub); deploy feeds back to state. Cross to enforcement (validators in gen).

---

## 3. Governance Pipeline

**Purpose**: Deliberate proposals (internal 3 skill MCPs + mandatory external Dynamo Solar SSOT filter) → merge votes (weighted + PHI/TAU + metamorphosis score for self-evo) → final decision (approve/reject/needs_revision). SSOT for inference/SelfProp/gate/CLI/MCP. Terms 69-71 (metamorphosis/self-evo) + spawn gov etc.

**Entry Points**: handleGovernRequest(body) (nucleus/govern-http pure or via MCP gov.server tools govern_proposals/govern_reflection); from gate (proposal-like result), inference (governViaNucleus), SelfProposalEngine, CLI govern, tests.

**Components/Files**:
- `src/nucleus/govern-http.ts` + `kernel.ts` (handleGovernRequest, governSingle)
- `src/governance/governance-service.ts` (GovernanceService.govern: requireExternalDynamo check, runGovernanceWithTimeout → callSkillServer x3 (code-review/security-audit/researcher via pluginRegistry.analyzeProposal) + callExternalDynamo (integration.checkProposal → votes) → mergeVotes per proposal + calculateMetamorphosisScore for meta type/source → overallDecision logic (approved >60% → approve else if rejected>approved reject else needs_revision))
- `src/governance/governance-core.ts` (mergeVotes, calculateMetamorphosisScore)
- `src/governance/governance-types.ts` (GovernanceRequest/Response, ProposalType etc.)
- `src/governance/codex-policy.service.ts`
- MCP: `src/mcps/governance.server.ts` (tools call handleGovernRequest + codex policy)
- Integrations/governance/ (InferenceGovernanceIntegration for Dynamo)
- SelfProposal uses it for metamorphosis proposals.
- pluginRegistry for internal skills (no direct MCP fallback).

**Data Flow**:
Request (proposals[] + context + options.requireExternalDynamo) → validate → (if req external: check integration) → parallel: 3x callSkillServer (pluginRegistry → parseVoteFromText) + callExternalDynamo (per-proposal integration.checkProposal or abstain) → per-proposal: [3 internal + external[]] → mergeVotes → if metamorphosis: score + possible override to needs_revision if <threshold → build results + overall (count-based) → log + return. Timeout wrapper.

**Sub-pipelines/Engines**: Internal deliberation (3 skills), external filter (Dynamo required), merge (core), metamorphosis resonance, abstention threshold check, overall decision.

**Artifacts**: GovernanceResponse (results[] w/ finalDecision/avgConf/votes/reasoningSummary + metaScore), state in inference/gov, logs "governance-service"/"nucleus-http".

**Testing**: governance-core.test.ts, nucleus __tests__ (govern-http, kernel), integration, CLI, MCP server tests, E2E in verify/consumer + gate (governanceTriggered flag).

**Codex**: 52-61 (spawn/agent gov), 69-71 (metamorphosis/self-evo proposals + score), 58 (PP), 7/8 (via validators upstream), overall governance (compliance).

**Gaps**: Requires initializeGovernanceIntegration() early or XRAY_LOCAL_MODE; pluginRegistry must have skills or abstain; some votes default abstain on error; metamorphosis only for type/source 'metamorphosis'; timeout 90s default.

**Integrations**: Called from gate (afterTool if proposal result → overall approve sets governanceTriggered), inference (governProposals), SelfProposal (on generated meta props), gov MCP server, CLI. Results feed apply in inference, PP escalation/SelfProp. 3 skills are the "code-review/security-audit/researcher" MCPs (via plugin). Dynamo is hard SSOT.

---

## 4. Enforcement Pipeline (Core + Hook/CI Surfaces)

**Purpose**: 29-validator registry scan on operations (esp. write/modify) for codex compliance; block on error/blocking; post: per-pipeline validators + legacy PM compat + v3 PP loop + gov routing. Central to "error prevention".

**Entry Points** (ONLY these per v3):
- Hooks (TUI/CLI): beforeToolHook/afterToolHook in `src/integrations/enforcement-gate.ts` (4 plugins wire exclusively: OpenCode src/plugin/xray-codex-injection.ts tool.before/after → gate; Hermes src/integrations/hermes-agent/* + bridge.mjs onPre/Post → gate full29 no SNIPPET; Grok src/integrations/grok/hooks/pre-tool-use.ts PreToolUse → gate; OpenClaw src/integrations/openclaw/* + hooks/xray-hooks.ts mcp before/after + events → gate + enforcement data).
- CI: scripts/ci/enforce-validators.mjs (direct globalValidatorRegistry 29, no old bridge filter; --all or git-diff or paths; ctx write, count violations exit).
- Consumer: verify-consumer.sh Phase5b (pack → install tarball → load reg 29 + call gate before/after from $PKG/dist).
- Internal: RuleEnforcer (legacy facade, still used in some), PostProcessor explicit (terms 7/8/74/77), PP processor-manager codexCompliance, mcp enforcer-tools.server.
- Pre-commit: run-hook.js (LightweightValidator + inline).

**Components/Files**:
- `src/integrations/enforcement-gate.ts` (before: loadRegistry (global or dist/node_modules fallback, cache xrayValidatorRegistry; prefer xray* w/ deprecation log for strRay), buildValidationContext (mapToolToOperation write/read/execute, files+newCode from args), run ALL 29 via registry.getAllValidators().validate, blocking=error|blocking → allowed/blocked/resonance calc (1.0 -0.15/0.05), log. after: only code-produce tools; pipelineRules ["error-resolution","loop-safety","boot-wiring","console-log-usage"]; legacy PM (loadState/ProcessorManager, register pre+ codex etc, executePre); v3 PP load (global xrayPostProcessor.executePostProcessorLoop or strRay deprecate); if result title+desc → handleGovernRequest; public XrayService reexport + package exports ./integration).
- `src/enforcement/validators/validator-registry.ts` (ValidatorRegistry ctor auto-registers exactly 29: code-quality: NoDuplicateCode,ContextAnalysisIntegration,MemoryOptimization,DocumentationRequired,NoOverEngineering,CleanDebugLogs,ConsoleLogUsage; security: InputValidation,SecurityByDesign; testing: TestsRequired,TestCoverage,ContinuousIntegration,TestFailureReporting,PerformanceRegressionReporting,SecurityVulnerabilityReporting; architecture: DependencyManagement,SrcDistIntegrity,ImportConsistency,ModuleSystemConsistency,ErrorResolution,LoopSafety,StateManagementPatterns,SingleResponsibility,DeploymentSafety,MultiAgentEnsemble,SubstrateExternalization,FrameworkSelfValidation,EmergentImprovement,BootWiring (29 total); globalValidatorRegistry singleton; getAll/getById/getByCategory).
- Validators impls: code-quality-validators.ts, security-validators.ts, testing-validators.ts, architecture-validators.ts (base-validator), each .validate(RuleValidationContext) → passed/message/suggestions.
- `src/enforcement/rule-enforcer.ts` (facade RuleEnforcer: ~30 rules metadata w/ validator delegates to registry, hierarchy deps, loadAsyncRules via LoaderOrchestrator (4 loaders), validateOperation/attemptFixes delegate to executor/fixer).
- Core: `src/enforcement/core/` (RuleRegistry, RuleHierarchy (topo), RuleExecutor (exec + deps), ViolationFixer).
- Loaders: `src/enforcement/loaders/` (loader-orchestrator + CodexLoader, AgentTriageLoader, ProcessorLoader, AgentsMdValidationLoader, base).
- Types: enforcement/types.ts (IValidatorRegistry etc).
- Also: enforcer-tools.ts (ruleValidation etc exposed to MCP).

**Data Flow (hook example)**:
Plugin tool (write/edit) → beforeToolHook(tool,args) → load reg → ctx (op=write, files, newCode) → for each of 29: v.validate → collect violations → blocking filter → resonance → log (before-hook-result) → return {allowed: !blocked, ...}. Tool exec. → afterToolHook → if not code-produce skip; else pipeline 4 validators + legacy PM pre + v3 PP.executePostProcessorLoop(ctx w/ tool) + if proposal-like result: handleGovernRequest → log complete + return {processed, violations, processorResults, governanceTriggered}.

CI: load reg → files (diff/--all) → for each file + each v: validate → count + log + exit(count).

**Sub-pipelines**: 29 individual validators (categorized), rule hierarchy topo, async loader (continueOnError), legacy PM inside gate (compat only, documented), PP loop (see separate), gov routing.

**Artifacts**: GateViolation[], Before/AfterHookResult, ValidationReport, violations logged, processorResults (incl v3 loop success), state "enforcement:*".

**Testing**: src/integrations/__tests__/enforcement-gate.test.ts, enforcement/ * .test.ts (rule-enforcer, core/*, validators/*, loaders/*), framework-enforcement-integration.test.ts, CI enforcement job + consumer Phase5b (exact 29 + gate calls pass), pipeline test-enforcement-pipeline.mjs.

**Codex Terms Wired**: Full 29 cover many (e.g. 7=error-resolution blocking, 8=loop-safety, 24=single-responsibility, 26=test-coverage, 29=security-by-design, 36=continuous-integration, 41=state-mgmt, 43=deployment-safety, 46=import-consistency + doc-required, 74=boot-wiring, 77=console-log-usage, 58=PostProcessor chain, 52+ spawn gov via arch, 69-71 via gov path, 76=consumer via verify, 79-81 via gate matrix, ci-lint 11/16/etc via CI script).

**Gaps**: Some validators non-blocking (warning/info → log only); legacy PM inside gate for testAutoCreation etc (no host duplicates); LightweightValidator in pre-commit (partial wiring?); resonance calc heuristic; dynamic import fallbacks for consumer/dist.

**Integrations**: Gate is THE surface for plugins → PP (v3 loop) + gov (if prop) + logger; CI/consumer use reg/gate directly; PP uses reg for explicit 7/8/74/77 + processor-manager for others; RuleEnforcer facade for internal/legacy; MCP enforcer-tools.server exposes; pre-commit partial; feeds inference (validators in gen), all compliance.

(See dedicated V3-ENFORCEMENT-PIPELINES.md for hook/CI/PostProcessor matrix + codex updates.)

---

## 5. PostProcessor v3 Pipeline

**Purpose**: Post-action intelligence loop: compliance/arch check → codex via PM + explicit validators (7/8/74/77) → monitoring (CI status) → failure analysis → autofix (if conf) + validate/rollback → escalation (if needed) → redeploy → success (report, agents-md update if agent files, regression, post-procs) or max attempts. Self-evo via Metamorphosis. Reachable from gate/CI/hooks/triggers. Legacy PM compat inside.

**Entry Points**: PostProcessor.executePostProcessorLoop(context) from: enforcement-gate.ts (after), GitHookTrigger/WebhookTrigger/APITrigger (triggers/), postprocessor/integration.ts, PP success paths internal, CI/consumer indirect via gate.

**Components/Files** (`src/postprocessor/`):
- `PostProcessor.ts` (ctor: state+session, config, default [new SelfProposalEngine()], init all engines (Monitoring, FailureAnalysis, AutoFix+FixValidator, Reporter+ReportValidator, Regression, ConfigLoader, CodeChangeAnalyzer, Redeploy, Escalation, Success, Triggers {git/web/api}, ArchitecturalComplianceChecker); executePostProcessorLoop: job/session, complianceChecker.validate (block if fail), codeAnalyzer.analyze → PM compat (register pre defaults + post map, executeCodexCompliance + testAutoCreation+testExecution per .ts file, explicit 4 term validators via globalValidatorRegistry "error-resolution" etc on joined newCode ctx), state set, executeMonitoringLoop, notifyPhase; executeMonitoringLoop: loop maxAttempts (monitorDeployment → if success: successHandler + agents-md update trigger (librarian if patterns) + regressionAnalysisService + PM post-procs (storytelling etc) + reporter.generate+validate + return; else analyzeFailure → autoFix.apply → if success+validate: redeployWithFixes + continue; else escalation.evaluate → if emergency/rollback return fail; wait backoff); other: redeployWithFixes (RedeployCoordinator), attemptAutoFix (placeholder), escalate, wait, getStatus, complexity calc, notifyProposal/Phase for meta engines).
- Subdirs/Engines:
  - monitoring/MonitoringEngine.ts (monitorDeployment → CIStatus/Perf/Sec status)
  - analysis/{FailureAnalysisEngine.ts (classify rootCause), CodeChangeAnalyzer.ts (analyze for PM ctx)}
  - autofix/{AutoFixEngine.ts (applyFixes w/ conf), FixValidator.ts (validateFixes + rollback)}
  - escalation/EscalationEngine.ts (evaluateEscalation → level emergency/rollback/etc + incident report + alert channels)
  - redeploy/RedeployCoordinator.ts (executeRedeploy)
  - compliance/ArchitecturalComplianceChecker.ts (validateArchitecturalCompliance: integrity + callAgentForArchitecturalFix via researcher MCP; system-integrity etc)
  - metamorphosis/{MetamorphosisEngine.ts (interface onPhase/onProposal), SelfProposalEngine.ts (see 14), index}
  - success/SuccessHandler.ts
  - reporting/PostProcessorReporter.ts (generateFrameworkReport + validate via ReportContentValidator)
  - services/RegressionAnalysisService.ts (shouldAnalyze + invoke)
  - triggers/{GitHookTrigger.ts (install/backup hooks, triggerPostProcessor→executePP), WebhookTrigger, APITrigger}
  - config/{ProcessorConfigLoader.ts, config.ts (defaultConfig)}
  - validation/{HookMetricsCollector, LightweightValidator.ts}
  - types.ts, integration.ts (legacy?)
- Calls frameworkLogger + activity; mcpClientManager in compliance; stateManager; librarianAgentsUpdater in success.

**Data Flow (from gate)**: after → ... → v3pp.executePostProcessorLoop({trigger,operation,filePath,directory,newCode,files,tool,metadata}) → compliance (block) → PM codex+tests + explicit term7/8/74/77 validate (log fail non-block) → monitoring loop (monitor → success: handlers + updates + post procs + report; fail: analyze → fix/validate/redeploy/continue or escalate) → notify meta → return result.

**Sub-pipelines/Engines**: As listed (full 10+); PM compat sub for pre/post; regression sub; agents-md auto sub; report gen/validate.

**Artifacts**: postprocessor:${sessionId} state, escalation:*, reports (via reporter), activity.log entries, fixed code (if applied), redeploy ids, agents-md updates.

**Testing**: src/__tests__/postprocessor/ , PostProcessor.test.ts, postprocessor-integration.test.ts, gate tests exercise loop, pipeline tests, E2E via hooks/CI/verify (logs), triggers tests.

**Codex**: 7/8/74/77 explicit in loop + registry; 58 (PostProcessor Validation Chain blocking); 60 regression; 69-71 via SelfProp; 52+ spawn; many via upstream validators/PM.

**Gaps**: AutoFix placeholder in one path (disabled); some escalation TODOs (no real notify); max attempts 3; non-blocking on term fails (log only); legacy PM still inside for compat (no external dups); circuit in SelfProp; some logs had malformed keys (fixed in cascade).

**Integrations**: Primary from gate (afterToolHook) + GitHookTrigger (pre-commit etc) + other triggers + PP internal + inference post; calls compliance (MCP), PM (legacy procs + test auto), explicit reg validators, SelfProposal (default meta, onPhase notify), success/regression/agents update/reporting, redeploy, escalation, gov (via inference/Self if prop); logs to frameworkLogger (feeds reporting/SelfProp); state; cross to enforcement (validators/PM), governance (meta proposals), inference (improvement processor + Self).

(See V3-ENFORCEMENT-PIPELINES.md for full hook/CI reachability + sub-engine details.)

---

## 6. Orchestration/Multi-agent Pipeline

**Purpose**: Coordinate complex tasks (deps, concurrent max5, spawn via governor, result consolidate, conflict vote); test auto-healing subflow; integrates outcome tracking + postproc.

**Entry Points**: 0xRayOrchestrator.executeComplexTask / orchestrateTestAutoHealing from delegation/agent-delegator, nucleus thin (for enterprise), CLI, tests, PP?

**Components/Files**:
- `src/orchestrator/orchestrator.ts`, `enhanced-multi-agent-orchestrator.ts` (spawnAgent, wait poll, task dep graph, max concurrent, consolidate), `multi-agent-orchestration-coordinator.ts`
- `src/orchestrator/agent-spawn-governor.ts` (limits per type, auth, rate, no sub-spawn)
- `src/orchestrator/self-direction-activation.ts`
- `src/delegation/complexity-analyzer.ts` + core (for tier)
- Calls: delegateToSubagent, routingOutcomeTracker.recordOutcome, processorManager.executePostProcessors (or gate PP)

**Data Flow** (simplified from old + code): Complex req → build dep graph (circular detect) → exec in order (max5 concurrent) → per task: complexity → delegate/spawn (governor check) → agent exec (via enhanced) → poll complete → record outcome → postproc → consolidate results (vote strategies: majority/expert/consensus). Healing: analyze failure patterns → createHealingTasks → executeComplex + consolidate.

**Artifacts**: complex-task- jobId, taskToAgentMap, orch state, healingResult.

**Testing**: orchestrator/ tests (basic, dep, concurrent, interfaces, self-direction), integration/orchestrator/*.

**Codex**: 52-61 (spawn gov/limits), 59 multi-agent coord (high), 58 PP.

**Gaps**: Some legacy orchestrator paths; max5/5min timeout hardcoded-ish; postproc legacy inside.

**Integrations**: Uses thin-dispatch/nucleus for complex; feeds routing analytics/outcomes; calls PP (post task); governor enforces codex spawn rules; used by delegation/inference apply (agent invoke).

---

## 7. Routing/Delegation Pipeline

**Purpose**: Intelligent task → agent/skill (keyword + history + complexity + outcome learning); thinDispatch in nucleus for tiers; analytics for auto-tune.

**Entry Points**: routeTask / delegateToSubagent from orchestrator/agents, scoreAndRoute from nucleus, CLI routing:analytics, inference apply, gate? 

**Components/Files** (delegation/ evolved):
- `src/delegation/agent-delegator.ts` (main: complexity + keyword/history via analytics? + outcomeTracker.record)
- `src/delegation/analytics/` (outcome-tracker.ts (recordOutcome), learning-engine.ts, pattern-performance-tracker, routing-analytics.ts)
- `src/nucleus/thin-dispatch.ts` (scoreComplexity(ComplexityAnalyzer), routeToAgent (core mappings tier→agent), scoreAndRoute)
- `src/delegation/complexity-analyzer.ts` + `complexity-core.ts` (metrics, score, level: simple/moderate/complex/enterprise, thresholds)
- `src/delegation/session-coordinator.ts`, strategy-selector, voting etc.
- Config: delegation/config/, src/config/routing-mappings.ts
- Analytics broader: src/analytics/ (routing-performance-analyzer etc) feed tuner.
- (Note: task-skill-router.ts / RouterCore/KeywordMatcher etc appear refactored into delegator + analytics + thin; old paths in tests/docs.)

**Data Flow**: task desc + opts → (delegator or thin) complexity score + keyword/history match (from outcomes/patterns) + combine → best agent/skill/conf + reason → recordOutcome (for learning) → enrich ctx → return. Low conf → LLM escalate? History adjusts conf from past success. Tuner periodic: reload outcomes/patterns → analyze → suggest/apply mappings if >=80%.

**Artifacts**: routing_history state, .opencode/0xray/routing-mappings.json, logs/framework/routing-outcomes.json + pattern-metrics, P9 stats.

**Testing**: delegation/* tests (task-skill-router refs in tests, analytics/*, agent-delegator.test), outcome etc.

**Codex**: Supports multi-agent (59), improvement via learning (69-71), no over-eng (via thin tiers?).

**Gaps**: Router facade refactored (direct delegator/thin now); some analytics still reference old.

**Integrations**: Orchestration uses for delegate; inference records outcomes + uses for apply routing; PP success calls post-proc inferenceImprovement; thinDispatch exposed in nucleus; feeds governance? ; learning feeds tuner + adaptive kernel.

---

## 8. Reporting/Analytics Pipeline

**Purpose**: Aggregate framework logs → metrics/insights/recommendations/reports (orchestration, agent-usage, perf, full); scheduled + realtime; feeds health/CI.

**Entry Points**: frameworkReportingSystem.generateReport(config), autonomous reports from PP (complexity threshold), CLI, CI health, scheduled (hourly/daily).

**Components/Files**:
- `src/reporting/framework-reporting-system.ts` (generateReport: cache5m, collect (getComprehensiveLogs: recent + current + rotated if >24h), filter, calculateMetrics (agent/ delegation/ context/ tool/ cat counts + timeRange + peak + healthScore), generateInsights/Recs/Alerts, format (md/json/html), save optional)
- log-parser.ts, metrics.ts (calc*), report-formatter.ts, types.ts
- `src/reporting/autonomous-report-generator.ts`, `orchestration-flow-reporter.ts`
- Inputs: frameworkLogger activity.log + gz

**Data Flow**: config (type, lastHours, format, path) → logs collect/parse/filter → metrics (counts + health) + time + insights/recs → format → (cache or file) → return.

**Artifacts**: reports/*-report-*.{md,json,html}, logs (source), .opencode/logs/ci-cd-monitor-report.json etc.

**Testing**: reporting/framework-reporting-system.test.ts, pipeline tests.

**Codex**: Supports reporting terms (test-failure etc via validators), auditability.

**Gaps**: Cache TTL, log parse multi-format (jobId or not); rotation 24h.

**Integrations**: All pipelines emit to logger → this; PP calls reporter on success + validate; CI health uses; SelfProp parses same logs; OpenClaw/consumer verify checks entries; mcp events feed?

---

## 9-11. CI/CD/Consumer + Pre-commit/Git Hook + MCP/Tool Event Pipelines (see V3-ENFORCEMENT for depth; summarized)

**CI/CD/Consumer (9)**: ci.yml (parallel jobs incl enforcement: build + node enforce-validators.mjs --all + consumer tarball (pack/install + reg 29 check + gate before/after calls) + summary requires it; other: test-pipeline (gated), smoke always, release.yml (build+verify-consumer+release+publish), publish.yml (preflight docs/tests + publish), others (enforce-agents/version, hermes-plugin, security-*, deploy-docs, auto-report, ci-cd-monitor). verify-consumer.sh (full: type+test, pack, tmp consumer, 4 bridges E2E, plugin reg test, activity.log check, Phase5b reg+gate, summary). enforce-validators.mjs (29 direct, files/diff/--all).

**Pre-commit/Git Hook (10)**: hooks/pre-commit (staged filter → export env → run-hook.js); scripts/hooks/run-hook.js (ensure log, recordMetrics to hook-metrics.json, runTypeScriptCheck (tsc per-file or full), lint?, codex (LightweightValidator?), other phases); post-* backups; GitHookTrigger in PP (backup/install hooks that call triggerPostProcessor → executePP on commit/push).

**MCP/Tool Event (11)**: mcp-client.ts (class MCPClient extends EventEmitter; before/after tool events ToolBeforeEvent/ToolAfterEvent emitted on exec; facade over ToolRegistry/Discovery/Executor/Cache + Simulation + connection pool; retry; registerDefaultSims); OpenClaw subscribes (xray-hooks.ts → gate + XrayToolEvent w/ enforcement data to Gateway); servers wire (enforcer-tools.server.ts: exposes ruleValidation/codex-enforcement/quality-gate-check/security-scan via actual enforcer-tools + codex-policy; processor-pipeline.server.ts; governance.server.ts: govern_proposals → handleGovernRequest + 3 skills + codex; 39+ total servers via pluginRegistry or direct; mcp.ts api, connection/*). Also in-process-skill-registry.

**Integrations/Gaps/Tests/Codex**: See V3 doc + above. E2E in verify-consumer + OpenClaw e2e (activity via events); pre-commit partial (Lightweight + inline vs full gate); MCP sims for offline. Terms via gate/CI (76 consumer, 11/16 ci-lint etc).

---

## 12-15. Session/State, Security/Compliance, Self-Evolution/Metamorphosis, + Supporting

**Session/State (12)**: XrayStateManager (src/state/state-manager.ts: get/set/persist JSON keys like postprocessor:*, boot:*, inference:*, enforcement:* , routing_history); session/* (monitor, cleanup-manager, state-manager); used everywhere for ctx (boot, PP sessions, inference state, gov state, orch tasks); capture in inference.

**Security/Compliance (13)**: security/security-hardener.ts + headers (init in boot); comprehensive-security-audit.ts + test; codex-policy.service; validators (input, sec-by-design, vuln reporting); ArchitecturalComplianceChecker in PP (integrity + researcher MCP fix); spawn governor limits; input sanitization in gate/ctx build. Workflows security-*.

**Self-Evolution/Metamorphosis (14)**: Postprocessor/metamorphosis/SelfProposalEngine.ts (implements MetamorphosisEngine: name, onPhase('monitoring-complete'|'post-process-complete') → parse activity.log (LOG_LINE_PATTERN or json fallback) for errors/warns/gov rejects → if thresholds (5 err/10 warn/3 reject) + !circuit + rate (1/hr) → generate meta proposals (whitelisted targets like config/src/processors) w/ conf 0.7 → handleGovernRequest (type metamorphosis, options metaThreshold 0.7) → track attempts (circuit 3 fail → 24h cooldown) + notify; ctor default in PP; also inference proposals can be meta; wired notifyPhase/notifyProposal in PP. scripts/run-self-evolution.sh. Terms 69-71 explicit (metamorphosis proposals + score in gov-core).

**Other/Supporting**: Build (package.json "build": tsc + mkdir/cp public/scripts/README... + mjs non-test + non-ts in skills/integrations/mcps + plugin copy + .opencode/ from src/opencode; prepublishOnly: prepare-consumer + build:all + strip maps; "prepare":"build"; scripts/build/utils.js; esbuild.json legacy?; clean); Release (release.mjs cmds, release.yml: type/test/build/verify-consumer → gh-release + npm publish; publish.yml preflight (docs/pipeline/reflections/docusaurus) + publish); MCP Connectivity (scripts/mjs/validate-mcp-connectivity.cjs + .js, test:e2e, mcp-client sims + defaultServerRegistry, in-process); Docs/Consumer (docs-site build in CI, verify phases, postinstall.cjs, prepare-consumer.cjs); CLI (src/cli/index + commands/* (govern.ts calls handleGovernRequest etc), bin 0xray); Test (vitest, pipeline/run-all-pipelines.mjs (11 listed inc enforcement/inference + consecutive), specific __tests__/*, 2196+ in session note); Kernel/Activation (src/core/xray-activation.ts, features-config.ts, kernel-patterns.ts); Plugin (src/integrations/plugins/* + default).

**Codex Coverage Overall**: 60+ terms via validators (29), PP explicit, gov (69-71 + spawn 52+), CI (11/16/24/26/34/36/41/46/47/76), hooks (8/74/77/79-81 + matrix), PP chain 58, process (61/62), etc. SSOT xray/codex.json.

**Gaps Common**: Non-blocking on warnings; legacy inside gate/PP for compat (documented, no external); some E2E full cross (hook→gate→PP→gov→CI) exercised in CI/verify but not all unit; diagrams in ARCHITECTURES.md need v3 refresh (gate flows); auto hook install in consumer postinstall partial; coverage term 75?; pre-commit Lightweight vs full 29.

**All Integrations Summary**: Gate is central hub for plugins (before/after → reg + PP + gov); PP is post-intel hub (triggers/gate → loop → meta/gov/inference/report); Nucleus thin for gov + dispatch + boot; Logger is nervous system; CI/verify close the consumer loop (exercise published gate/reg); MCPs (gov/enforcer/processor) + pluginRegistry provide skill surfaces; thinDispatch + delegator for routing/orch; SelfProp closes self-evo loop via logs → gov.

**Recommendations (from trace)**: 
- Add sequence diagrams for gate→PP→gov (update PIPELINE_ARCHITECTURES.md).
- Health dashboards for validator pass rates, PP attempt success, gov approve %.
- Full E2E pipeline test that exercises plugin hook → gate full → PP escalation → SelfProp → CI script.
- Close remaining non-blocking (e.g. term fails in PP should perhaps escalate in some cases).
- Maintain on every change: update this + V3-ENF + codex matrix + reflection (per AGENTS).
- Audit orphaned (check-orphaned job) + legacy boot paths.
- Expand codex coverage for new terms (e.g. MCP event wiring).

*Generated by @researcher agent 2026-06-11 via exhaustive file reads + greps (enforcement-gate full, PostProcessor full + 10 subs, inference full, gov-service + nucleus 6 files, validator-reg 29, CI ymls + scripts full, hooks full, mcp-client partial, framework-logger, delegator, PP triggers, codex.json terms, package/workflows for missed, etc.). Survives compaction. All paths traced to source.*

---

## Pipeline 1: Boot Pipeline

**Purpose**: Framework initialization and component startup orchestration

**Layers**:
- Layer 0: Configuration Loading (0xRayConfigLoader)
- Layer 1: Core Orchestrator (0xRayOrchestrator)
- Layer 2: Delegation System (AgentDelegator, SessionCoordinator)
- Layer 3: Session Management (SessionMonitor, SessionCleanupManager, SessionStateManager)
- Layer 4: Processors (ProcessorManager + 7 processors)
- Layer 5: Agents (enforcer, architect, bug-triage-specialist, code-reviewer, security-auditor, refactorer, testing-lead)
- Layer 6: Security & Compliance (SecurityHardener, CodexInjector)
- Layer 7: Inference (InferenceTuner - optional)

**Components**:
- `src/core/boot-orchestrator.ts` (BootOrchestrator class)
- `src/core/config-loader.ts`
- `src/core/context-loader.ts`
- `src/state/state-manager.ts`
- `src/security/security-hardener.ts`
- `src/security/security-headers.ts`
- `src/session/session-*.ts`

**Data Flow**:
```
SIGINT/SIGTERM Signal
    │
    ▼
Load0xRayConfiguration()
    │
    ▼
loadOrchestrator() → "orchestrator" in state
    │
    ▼
initializeDelegationSystem() → "delegation:*" in state
    │
    ▼
initializeSessionManagement() → "session:*" in state
    │
    ▼
activateProcessors() → "processor:manager" in state
    │
    ▼
loadRemainingAgents() → "agent:*" in state
    │
    ▼
enableEnforcement() → "enforcement:active" = true
    │
    ▼
activateCodexCompliance() → "compliance:active" = true
    │
    ▼
initializeSecurityComponents() → "security:*" in state
    │
    ▼
initializeInferenceTuner() → "inference:tuner_active" = true (optional)
    │
    ▼
BootResult { success, orchestratorLoaded, sessionManagementActive, ... }
```

**Artifacts**:
- State entries in `0xRayStateManager`
- Memory baseline stored: `memory:baseline`
- Boot errors stored: `boot:errors`
- Agent list stored: `session:agents`

**Testing Status**: ✅ Well-tested
- `src/__tests__/integration/boot-orchestrator.integration.test.ts`
- `src/__tests__/integration/framework-init.test.ts`

**Notes**:
- Orchestrator-first design ensures core system is available before any processing
- Graceful shutdown handling via SIGINT/SIGTERM
- Memory monitoring auto-configured on instantiation
- Async rules loaded in background after sync initialization

---

## Pipeline 2: Inference Pipeline (Autonomous Learning)

**Purpose**: Continuous improvement of task routing decisions through autonomous learning

**Layers** (6-layer architecture):
- Layer 6: Autonomous Engines (InferenceTuner, InferenceImprovementProcessor)
- Layer 5: Learning Engines (LearningEngine, EmergingPatternDetector, PatternLearningEngine)
- Layer 4: Analytics Engines (OutcomeTracker, PatternPerformanceTracker, RoutingPerformanceAnalyzer)
- Layer 3: Routing Engines (TaskSkillRouter, RouterCore, KeywordRoutingEngine)
- Layer 2: Input Processing (PreValidationProcessor, ComplexityCalibrator, ContextEnrichmentProcessor)
- Layer 1: Output (AutonomousReportGenerator, CLI Interface)

**Components**:
- `src/services/inference-tuner.ts` (InferenceTuner class)
- `src/delegation/analytics/outcome-tracker.ts` (RoutingOutcomeTracker)
- `src/delegation/analytics/pattern-performance-tracker.ts` (PatternPerformanceTracker)
- `src/delegation/analytics/learning-engine.ts` (LearningEngine)
- `src/analytics/routing-performance-analyzer.ts`
- `src/analytics/prompt-pattern-analyzer.ts`
- `src/analytics/pattern-learning-engine.ts`
- `src/analytics/emerging-pattern-detector.ts`

**Data Flow**:
```
User Task
    │
    ▼
Input Processor (sanitization, validation)
    │
    ▼
Complexity Calibrator (score calculation)
    │
    ▼
TaskSkillRouter → Keyword Matching + History + Complexity
    │
    ▼
RouterCore (routes to agent/skill)
    │
    ├──► OutcomeTracker (records routing outcome)
    ├──► PatternPerformanceTracker (updates pattern metrics)
    ├──► LearningEngine (detects patterns)
    │
    ▼
InferenceTuner (autonomous tuning cycle)
    │
    ├──► Reload data from disk
    ├──► Check data sufficiency (5+ outcomes, 3+ patterns)
    ├──► Generate performance report
    ├──► Analyze prompt patterns
    ├──► Trigger adaptive kernel learning
    └──► Suggest new keyword mappings
    │
    ▼
Auto-apply recommendations (if successRate >= 80%)
    │
    ▼
routing-mappings.json updated
```

**Artifacts**:
- `logs/framework/pattern-metrics.json` - Pattern persistence across sessions
- `.opencode/0xray/routing-mappings.json` - Keyword mappings (auto-updated)
- `logs/framework/routing-outcomes.json` - Routing history
- CLI: `npx 0xray inference:tuner --status`

**Testing Status**: ✅ Well-tested
- Integration tests with 30s timeout for tuning cycles
- Pattern persistence validated (ESM compatibility)
- `src/delegation/analytics/__tests__/learning-engine.test.ts`

**Notes**:
- InferenceTuner is optional; configured via `autoStartInferenceTuner` in BootSequenceConfig
- Tuning cycle runs every 60 seconds by default (configurable)
- Minimum thresholds: 5+ outcomes, 3+ patterns, 80% success rate
- CLI commands: `--start`, `--stop`, `--run-once`, `--status`

---

## Pipeline 3: Orchestration Pipeline (Multi-Agent Coordination)

**Purpose**: Coordinate complex multi-step tasks across multiple specialized agents

**Layers**:
- Layer 1: Task Definition (TaskDefinition interface)
- Layer 2: Complexity Analysis (ComplexityAnalyzer)
- Layer 3: Dependency Resolution (Task dependency graph)
- Layer 4: Agent Spawning (EnhancedMultiAgentOrchestrator)
- Layer 5: Execution Monitoring (Agent monitoring interface)
- Layer 6: Result Consolidation (ConsolidateHealingResults)

**Components**:
- `src/orchestrator/orchestrator.ts` (0xRayOrchestrator)
- `src/orchestrator/multi-agent-orchestration-coordinator.ts` (MultiAgentOrchestrationCoordinator)
- `src/orchestrator/enhanced-multi-agent-orchestrator.ts` (EnhancedMultiAgentOrchestrator)
- `src/delegation/complexity-analyzer.ts`
- `src/orchestrator/agent-spawn-governor.ts`
- `src/orchestrator/self-direction-activation.ts`

**Data Flow**:
```
Complex Task Request
    │
    ▼
executeComplexTask(description, tasks[], sessionId)
    │
    ▼
Build Task Dependency Graph
    │
    ▼
Execute Tasks (dependency order, max 5 concurrent)
    │
    ├──► executeSingleTask(task)
    │       │
    │       ▼
    │    Complexity Analysis
    │       │
    │       ▼
    │    delegateToSubagent()
    │       │
    │       ▼
    │    enhancedMultiAgentOrchestrator.spawnAgent()
    │       │
    │       ▼
    │    Wait for completion (polling)
    │       │
    │       ▼
    │    routingOutcomeTracker.recordOutcome()
    │       │
    │       ▼
    │    processorManager.executePostProcessors()
    │
    ▼
Collect Results
    │
    ▼
OrchestrationResult { success, completedTasks, failedTasks, ... }
```

**Test Auto-Healing Sub-Flow**:
```
orchestrateTestAutoHealing(failureContext)
    │
    ▼
analyzeTestFailurePatterns() → healingStrategy
    │
    ▼
createHealingTaskDefinitions() → TaskDefinition[]
    │
    ▼
executeComplexTask() with healing tasks
    │
    ▼
consolidateHealingResults() → healingResult
```

**Artifacts**:
- Job ID: `complex-task-${timestamp}-${random}`
- Task results in orchestrator state
- Agent-to-task mapping: `taskToAgentMap`
- Monitoring interface with agent status

**Testing Status**: ✅ Well-tested
- `src/__tests__/integration/orchestrator/basic-orchestrator.test.ts`
- `src/__tests__/integration/orchestrator/dependency-handling.test.ts`
- `src/__tests__/integration/orchestrator/concurrent-execution.test.ts`
- `src/orchestrator/orchestrator.test.ts`
- `src/orchestrator/self-direction-activation.test.ts`

**Notes**:
- Supports task dependencies with circular dependency detection
- Max concurrent tasks configurable (default: 5)
- Task timeout: 5 minutes default
- Post-processor execution for agent task completion logging
- Conflict resolution strategies: majority_vote, expert_priority, consensus

---

## Pipeline 4: Enforcement Pipeline (Rule Validation & Governance)

**Purpose**: Validate operations against codex rules and attempt automatic fixes

**Layers**:
- Layer 1: Rule Registry (RuleRegistry)
- Layer 2: Rule Hierarchy (RuleHierarchy - dependencies)
- Layer 3: Validator Registry (ValidatorRegistry)
- Layer 4: Rule Executor (RuleExecutor - orchestration)
- Layer 5: Loader Orchestration (LoaderOrchestrator - async rules)
- Layer 6: Violation Fixer (ViolationFixer - agent delegation)

**Components**:
- `src/enforcement/rule-enforcer.ts` (RuleEnforcer facade)
- `src/enforcement/core/rule-registry.ts`
- `src/enforcement/core/rule-hierarchy.ts`
- `src/enforcement/core/rule-executor.ts`
- `src/enforcement/core/violation-fixer.ts`
- `src/enforcement/validators/validator-registry.ts`
- `src/enforcement/validators/base-validator.ts`
- `src/enforcement/validators/code-quality-validators.ts`
- `src/enforcement/validators/security-validators.ts`
- `src/enforcement/validators/testing-validators.ts`
- `src/enforcement/validators/architecture-validators.ts`
- `src/enforcement/loaders/loader-orchestrator.ts`
- `src/enforcement/loaders/codex-loader.ts`
- `src/enforcement/loaders/agent-triage-loader.ts`
- `src/enforcement/loaders/processor-loader.ts`
- `src/enforcement/loaders/agents-md-validation-loader.ts`

**Data Flow**:
```
validateOperation(operation, context)
    │
    ▼
loadAsyncRules() if not initialized
    │
    ▼
RuleExecutor.execute()
    │
    ▼
Get enabled rules from RuleRegistry
    │
    ▼
Topological sort via RuleHierarchy
    │
    ▼
For each rule (in order):
    │
    ▼
ValidatorRegistry.getValidator(ruleId)
    │
    ▼
validator.validate(context) → RuleValidationResult
    │
    ▼
ValidationReport { passed, errors, warnings, results }
    │
    ▼
attemptRuleViolationFixes(violations, context)
    │
    ▼
ViolationFixer.fixViolations()
    │
    ▼
Delegate to appropriate agent/skill
    │
    ▼
ViolationFix[] with status
```

**Rule Categories**:
- Code Quality: no-duplicate-code, console-log-usage, documentation-required
- Architecture: src-dist-integrity, no-over-engineering, single-responsibility, module-system-consistency
- Security: input-validation, security-by-design
- Testing: tests-required, test-coverage, continuous-integration
- Reporting: test-failure-reporting, performance-regression-reporting
- Framework: multi-agent-ensemble, substrate-externalization, framework-self-validation

**Artifacts**:
- 30+ rules registered in RuleRegistry
- Validation reports with violations and fixes
- Async rules loaded from: CodexLoader, AgentTriageLoader, ProcessorLoader, AgentsMdValidationLoader

**Testing Status**: ✅ Well-tested
- `src/enforcement/rule-enforcer.test.ts`
- `src/enforcement/core/__tests__/rule-*.test.ts`
- `src/enforcement/validators/__tests__/*.test.ts`
- `src/enforcement/loaders/__tests__/loaders.test.ts`
- `src/__tests__/framework-enforcement-integration.test.ts`

**Notes**:
- RuleEnforcer is now a pure facade (Phase 6 refactoring)
- All validators delegated via ValidatorRegistry
- Rule dependencies managed via RuleHierarchy
- Async rules loaded in background after sync initialization
- Supports continue-on-error loader strategy

---

## Pipeline 5: Processor Pipeline (Pre/Post Processing)

**Purpose**: Execute validation, compliance, and enhancement processors before/after operations

**Layers**:
- Layer 1: Processor Registry (ProcessorRegistry)
- Layer 2: Pre-Processors (priority-ordered)
- Layer 3: Post-Processors (priority-ordered)
- Layer 4: Processor Hook System
- Layer 5: Health Monitoring (ProcessorHealth)

**Components**:
- `src/processors/processor-manager.ts` (ProcessorManager)
- `src/processors/processor-interfaces.ts` (ProcessorRegistry, IProcessor)
- `src/processors/processor-pipeline.server.ts` (MCP server)
- `src/processors/implementations/*.ts` (7 implementations)

**Pre-Processors** (priority order):
1. preValidate (10) - Syntax checking, validation
2. codexCompliance (20) - Codex rule validation
3. testAutoCreation (22) - Auto-generate tests
4. versionCompliance (25) - NPM/UVM version check
5. errorBoundary (30) - Error handling setup
6. agentsMdValidation (35) - AGENTS.md validation

**Post-Processors** (priority order):
- stateValidation (130) - State consistency check
- refactoringLogging (140) - Agent completion logging
- (others via ProcessorRegistry)

**Data Flow**:
```
Tool Execution Request
    │
    ▼
executePreProcessors(tool, args, context)
    │
    ▼
Get pre-processors (type="pre", enabled)
    │
    ▼
Sort by priority (ascending)
    │
    ▼
For each processor:
    │
    ▼
executeProcessor(name, context)
    │
    ▼
processorRegistry.get(name).execute()
    │
    ▼
Record metrics (success, duration)
    │
    ▼
If all succeed → proceed with tool
    │
    ▼
Tool Execution
    │
    ▼
executePostProcessors(operation, data, preResults)
    │
    ▼
Get post-processors (type="post", enabled)
    │
    ▼
Sort by priority (ascending)
    │
    ▼
For each processor:
    │
    ▼
executeProcessor(name, {operation, data, preResults})
    │
    ▼
Record metrics
    │
    ▼
PostProcessorResult[]
```

**MCP Server Flow** (processor-pipeline.server.ts):
```
execute-pre-processors:
    Input → Sanitize → Codex Validate → Context Enrich → Security Check → Output

execute-post-processors:
    Input → Result Validate → Compliance Enforce → Audit Trail → QA → Output

codex-validation:
    Content → Term Check → Compliance % → Violations/Warnings → Status

framework-compliance-check:
    Content → Operation Check → Score → Issues → Actions → Approval
```

**Artifacts**:
- Processor metrics: `ProcessorMetrics { totalExecutions, successRate, avgDuration }`
- Health status: `ProcessorHealth { healthy | degraded | failed }`
- MCP tools: `execute-pre-processors`, `execute-post-processors`, `codex-validation`, `framework-compliance-check`

**Testing Status**: ✅ Well-tested
- `src/__tests__/integration/processor-manager-reuse.test.ts`
- `src/postprocessor/PostProcessor.test.ts`
- `src/__tests__/postprocessor-integration.test.ts`

**Notes**:
- All processors now use ProcessorRegistry pattern (legacy switch removed)
- Processors have lifecycle: constructor/init → execute → cleanup
- Health monitoring with rolling success rate calculation
- Context validation before processor execution
- Supports processor hooks for custom processing

---

## Pipeline 6: Routing Pipeline (Task-to-Agent)

**Purpose**: Intelligent routing of tasks to appropriate agents and skills

**Layers**:
- Layer 1: Keyword Matching (KeywordMatcher)
- Layer 2: History Matching (HistoryMatcher)
- Layer 3: Complexity Routing (ComplexityRouter)
- Layer 4: Router Core (RouterCore - orchestration)
- Layer 5: Analytics (RoutingAnalytics, OutcomeTracker)

**Components**:
- `src/delegation/task-skill-router.ts` (TaskSkillRouter facade)
- `src/delegation/routing/router-core.ts`
- `src/delegation/routing/keyword-matcher.ts`
- `src/delegation/routing/history-matcher.ts`
- `src/delegation/routing/complexity-router.ts`
- `src/delegation/analytics/routing-analytics.ts`
- `src/delegation/analytics/outcome-tracker.ts`
- `src/delegation/analytics/learning-engine.ts`

**Data Flow**:
```
routeTask(taskDescription, options)
    │
    ▼
RouterCore.route()
    │
    ▼
KeywordMatcher.match(taskDescription)
    │
    ▼
HistoryMatcher.match(taskDescription)
    │
    ▼
ComplexityRouter.route(taskDescription, complexity)
    │
    ▼
Combine scores, select best agent/skill
    │
    ▼
Escalate to LLM if low confidence
    │
    ▼
RoutingResult { skill, agent, confidence, matchedKeyword, ... }
    │
    ▼
routingOutcomeTracker.recordOutcome()
    │
    ▼
Return to caller with context enrichment
```

**Mapping Configuration**:
```typescript
{
  keywords: ["security", "audit", "vulnerability"],
  agent: "security-auditor",
  skill: "vulnerability-scan",
  confidence: 0.9,
  autoGenerated: false
}
```

**Artifacts**:
- `routing_history` in state manager
- Pattern metrics persistence
- Analytics summaries (daily, full)
- P9 learning stats
- Adaptive thresholds

**Testing Status**: ✅ Well-tested
- `src/delegation/task-skill-router.test.ts`
- `src/delegation/routing/__tests__/*.test.ts`
- `src/delegation/analytics/__tests__/*.test.ts`

**Notes**:
- TaskSkillRouter is a facade delegating to specialized components
- History matcher uses success rate thresholds
- Complexity router handles fallback routing
- CLI integration for analytics: `routing:analytics`

---

## Pipeline 7: Reporting Pipeline (Analytics & Insights)

**Purpose**: Generate comprehensive framework reports from activity logs

**Layers**:
- Layer 1: Log Collection (frameworkLogger, rotated logs)
- Layer 2: Log Parsing (parseLogLine, parseCompressedLogFile)
- Layer 3: Metrics Calculation (calculateMetrics)
- Layer 4: Insights Generation (generateInsights)
- Layer 5: Report Formatting (Markdown, JSON, HTML)
- Layer 6: Scheduled Reports (scheduleAutomatedReports)

**Components**:
- `src/reporting/framework-reporting-system.ts` (FrameworkReportingSystem)
- `src/reporting/autonomous-report-generator.ts`
- `src/reporting/orchestration-flow-reporter.ts`
- `src/core/framework-logger.ts`

**Report Types**:
- `orchestration` - Agent delegation metrics
- `agent-usage` - Per-agent invocation counts
- `context-awareness` - Context operation analysis
- `performance` - Response time and throughput
- `full-analysis` - Comprehensive all-of-the-above

**Data Flow**:
```
generateReport(config)
    │
    ▼
Check cache (5 min TTL)
    │
    ▼
collectReportData(config)
    │
    ▼
getComprehensiveLogs(config)
    │   │
    │   ├──► frameworkLogger.getRecentLogs(1000)
    │   ├──► readCurrentLogFile()
    │   └──► readRotatedLogFiles() (if lastHours > 24)
    │
    ▼
filterLogsByConfig(logs, config)
    │
    ▼
calculateMetrics(logs)
    │   ├──► Agent usage counts
    │   ├──► Delegation counts
    │   ├──► Context operations
    │   ├──► Tool execution stats
    │   └──► System operation categories
    │
    ▼
calculateTimeRange(logs)
    │
    ▼
generateInsights(logs, metrics)
    │
    ▼
generateRecommendations(metrics)
    │
    ▼
formatReport(data, format) → Markdown | JSON | HTML
    │
    ▼
saveReportToFile(outputPath) (optional)
    │
    ▼
ReportData { generatedAt, timeRange, metrics, insights, recommendations, summary }
```

**Artifacts**:
- `logs/framework/activity.log` (current log)
- `logs/framework/framework-activity-*.log.gz` (rotated, compressed)
- `reports/${type}-report-${date}.md|json|html` (generated reports)

**Testing Status**: ✅ Well-tested
- `src/reporting/framework-reporting-system.test.ts`

**Notes**:
- Automatic log rotation support (gzip compressed)
- Log retention: 24 hours default
- Report caching: 5 minutes TTL
- Scheduled report generation: hourly/daily/weekly
- Log parsing handles multiple formats (with/without jobId)

---

## v3 Enforcement Pipelines (3.3.x - Full Cascade)

See dedicated [V3-ENFORCEMENT-PIPELINES.md](./V3-ENFORCEMENT-PIPELINES.md) for full map (hooks via gate for OpenCode/Hermes/Grok/OpenClaw + CI via enforce-validators.mjs + PostProcessor integration + consumer in PR CI). 

**Key Additions**:
- Hook surfaces now exclusively on `enforcement-gate.ts` (before/afterToolHook → full 29-validator + v3 PostProcessor loop + governance).
- CI: `scripts/ci/enforce-validators.mjs` (direct registry, all 29, no snippet filter) called from ci.yml.
- 8 ci-lint terms + consumer (76) now wired (codex 3.2.x).
- Legacy ProcessorManager kept only inside gate for compat (documented; no host-side duplicates post-P0/P1).

**Enforcement Cascade (3.3.0–3.3.1)**:
- **E2E Pipeline Smoke Test**: `scripts/ci/e2e-pipeline-smoke.mjs` — 4-step cascade (gate → escalation → CI → consumer). Wired into CI enforcement job. All steps pass.
- **Compat Shim Scanner** (Term 78): `scripts/ci/compat-shim-scanner.mjs` — scans `src/` for legacy fallback patterns, `compat-export` suffixes, `@deprecated` exports. 19 references found, non-blocking CI step.
- **Orphan Code Pre-PR Check** (Term 73): `scripts/ci/orphan-code-pre-pr-check.mjs` — git diff deletion scanner with 6-check protocol + asymmetric deletion detection. Blocks on protocol violations.
- **Consumer Postinstall Hook**: `scripts/hooks/install-hooks.cjs` — auto-installs pre-commit hook via `postinstall.cjs` + `setup.cjs` step 8. Idempotent, dev + consumer paths.
- **Pre-commit (LightweightValidator)**: `scripts/hooks/run-hook.js` — inline TODO/@ts-ignore/any regex replaced with `LightweightValidator` + gate call via dynamic import. `ConsoleLogUsageValidator` via dynamic import.
- **Coverage Gate** (Term 75): vitest thresholds (stmts 35%, branches 28%, funcs 37%, lines 36%) enforced in CI.
- **PostProcessor Escalation & Inference Blocking**: Critical violations from afterToolHook route through `EscalationEngine`. Proposals with confidence ≤ 0.3 filtered.
- **Source-Change Governance Detector** (Phase 1): CI step auto-submits governance proposals when codex/enforcement/nucleus/postprocessor/gate files change.
- **Retro Governance Ritual** (Phase 0): All v3 enforcement cascade changes retroactively submitted and approved through governance pipeline.

Cross-ref old sections below for continuity (Boot/Inference/Orchestration/Processor/Routing/Reporting updated in v3 context).

## v3 Context Updates to Legacy Sections (2026-06)

- **Boot Pipeline**: Now v3 thin nucleus (kernel/orchestrator/plugin-registry/thin-dispatch in src/nucleus/). Replaces old boot-orchestrator. Gate + PostProcessor activated post-nucleus. See enforcement doc for integration.
- **Inference Pipeline**: generateProposals async (validators for 1/3/5 at 0.85x confidence); wired from gate on proposals. Self-evolution via SelfProposalEngine (terms 69-71). Proposals with confidence ≤ 0.3 now filtered (v3.3.0).
- **Orchestration Pipeline**: Integrated with gate (outcome tracking feeds governance/inference; processor calls from gate).
- **Enforcement/Processor Pipelines**: See new V3 section above + dedicated doc. v3 PostProcessor (full sub-engines: escalation, metamorphosis, etc.) now reachable from hooks/CI. Explicit validator wiring in PostProcessor.ts (7/8/74/77). EscalationEngine now called from gate context for critical violations.
- **Governance**: handleGovernRequest (nucleus) + Dynamo + 3 MCPs; triggered from gate afterToolHook if proposal-like. SelfProposalEngine submits via handleGovernRequest with circuit breaker, rate limiter, whitelist, metamorphosisThreshold ≥ 0.7.
- **MCP/Tool Events**: mcp-client events → gate (OpenClaw forwards enforcement data).
- **CI/Consumer/Git Hooks**: New enforce-validators.mjs + verify-consumer updates (gate exercise in PR tarball) + run-hook.js (LightweightValidator full gate) + postinstall auto-hook install.
- **Self-Evolution**: Integrated in PostProcessor + gate (no dead ends). Retro governance ritual complete.

**Remaining Gaps**: Interweaves/lenses processor implementations (codex enforcementGaps #1), ESLint deliberately neutered (enforcementGaps #2).

---

## Pipeline Testing Status

> **Important Discovery (v2.0.0)**: Unit tests passing ≠ Pipeline working.
> See [Pipeline Testing Methodology](../testing/PIPELINE_TESTING_METHODOLOGY) for details.

## Complete Sub-Pipeline Inventory (v1.15.41)

### Main Pipelines (7)
| Pipeline | Description | Test File |
|----------|-------------|-----------|
| **Boot** | Framework initialization | test-boot-pipeline.mjs |
| **Orchestration** | Multi-agent coordination | test-orchestration-pipeline.mjs |
| **Governance** | Agent spawn limits, rate limiting | test-governance-pipeline.mjs |
| **Processor** | Pre/post processor execution | test-processor-pipeline.mjs |
| **MCP-Server** | MCP server implementations | test-processor-mcp-server.mjs |
| **CLI** | CLI command validation | test-cli-pipeline.mjs |
| **Reporting** | Analytics & insights | test-reporting-pipeline.mjs |

### Sub-Pipelines (Discovered v1.15.41)

| Sub-Pipeline | Components | Status |
|-------------|------------|--------|
| **Enforcement** | RuleEnforcer, 29 Validators, 5 Loaders, 4 Core classes | ✅ Active via CodexComplianceProcessor |
| **MCP-Server-Full** | 16 server implementations | ✅ Built |
| **Inference** | InferenceTuner, InferenceImprovementProcessor | ✅ Active |
| **Pre-Processors** | 15 processors (preValidate, codexCompliance, etc.) | ✅ Active |
| **Post-Processors** | 5+ processors (stateValidation, testAutoHealing, etc.) | ✅ Active |
| **Governance-Detail** | SpawnGovernanceProcessor, rate limiting | ✅ Active |
| **Performance** | PerformanceBudgetProcessor | ✅ Active |
| **ConsoleLogGuard** | Blocks console.log in prod | ✅ Active |
| **AsyncPattern** | Validates async/await usage | ✅ Active |
| **VersionCompliance** | Enforces version sync | ✅ Active |
| **TestAutoCreation** | Auto-generates tests | ✅ Active |
| **RegressionTesting** | Runs regression tests post-write | ✅ Active |
| **CoverageAnalysis** | Analyzes test coverage | ✅ Active |
| **LogProtection** | Protects sensitive log data | ✅ Active |
| **CodexCompliance** | Full rule validation via RuleEnforcer | ✅ Active |

### Systems Not Used as Originally Designed

| System | Original Vision | Actual Usage |
|--------|----------------|--------------|
| **RuleEnforcer** | Central enforcement engine | Runs via CodexComplianceProcessor pre-processor |
| **Enforcer Agent** | Does all enforcement | Routes to specialists; CodexComplianceProcessor does validation |
| **SpawnGovernance** | Spawns governance agent on commits | Validates but doesn't spawn |
| **PerformanceBudget** | Enforces perf budgets | Validates but doesn't block |
| **ViolationFixer** | Maps violations to agents | Not actively used |

### Pipeline Test Coverage

| Pipeline | Tests | Status |
|----------|-------|--------|
| **Enforcement** | 21 | ✅ test-enforcement-pipeline.mjs |
| **MCP-Server** | 33 | ✅ test-mcp-server-pipeline.mjs |
| **Inference** | 7 | ✅ test-inference-pipeline.mjs |

---

## Testing Coverage Summary

| Pipeline | Unit Tests | Integration Tests | Notes |
|----------|------------|-------------------|-------|
| Boot Pipeline | ~5 | ~10 | Core initialization |
| Inference Pipeline | ~3 | ~2 | 30s timeout for tuning |
| Orchestration Pipeline | ~10 | ~15 | Multi-agent coordination |
| Enforcement Pipeline | ~15 | ~8 | Rule validation |
| Processor Pipeline | ~5 | ~3 | Pre/post processing |
| Routing Pipeline | ~10 | ~5 | Task routing |
| Reporting Pipeline | ~2 | ~1 | Log analysis |
| **Total** | **~50** | **~44** | **2521+ tests passing** |

---

## Recommendations

1. **Create dedicated pipeline documentation** for each major pipeline with:
   - Sequence diagrams
   - Error handling strategies
   - Performance characteristics

2. **Add pipeline health dashboards** for:
   - Processor execution times
   - Rule validation success rates
   - Routing confidence distributions

3. **Implement pipeline monitoring** for:
   - End-to-end latency tracking
   - Error rate alerting
   - Resource utilization

4. **Document the MCP server pipeline** which currently lacks comprehensive docs

---

*Generated by @researcher agent on 2026-03-21*
