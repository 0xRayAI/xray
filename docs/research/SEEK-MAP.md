# Seek map

## Definition

A seek takes a need, weighs more than one candidate as cheaply as it can, and routes the work. Cheapest first: branch, then table, then score, model only when cheaper tiers cannot decide. A seek must itself cost far less than the work it routes.

A seek, for this pass, is a mechanism that takes a need, looks at more than one candidate, and sends the work somewhere. Cost shows up as a score, a threshold, a ladder, or a written rule about what is expensive. This file lists the ones that are in this checkout. Each entry says where it lives, what goes in, what the candidates are, how it decides, what comes out, whether cheap and expensive are different, and whether the decision is code, a written rule, or a habit with no function.

Each seek has a class. **Branch** means an if, else, or switch picks the destination. **Table** means a key looks up a row. **Scored** means a number picks the winner. **Model** means a model emits the choice. When two steps run, the class names the step that picks the destination, then the step that feeds it. The counts of those ifs and switches are in [Hard-coded branches](#hard-coded-branches). A branch is counted only when it routes, gates, selects, or names a fallback. Empty checks, file-exists checks, and field copies are not counted.

Read on 2026-10-18 from `main` at the station snapshot. Code under `src/`, `grok-bot/`, and `docs-site/` was searched on the dev card. `house/` and `node_modules/@0xray/repertoire` (0.2.9) were read as files. A function is listed only when that file was opened.

## 1. Plate recall

- **Class:** scored. One branch refuses a tie or a zero.
- **Where:** `src/integrations/hooks/plates.cjs` `CUES` at 67, `scorePlate` at 365, `recallPlate` at 374. Typed wrapper `src/memory-routing/plates.ts` `recallPlate` at 133. Test `src/__tests__/unit/plates.test.ts` 106.
- **In:** one intent string.
- **Candidates:** every id in `PLATE_IDS` (routing, governance, boot, and the rest of that list).
- **Decision:** each plate has regex cues with weights (mostly 5 or 6). The highest score wins. Score 0 returns nothing. Equal top scores return nothing. `recallPlate('routing orchestration')` is a tie and returns nothing. `recallPlate('in-house tooling review')` does not return house. `recallPlate('review plate')` returns review.
- **Out:** one plate body, or null. `plateStockLine` (437) adds the worn path and, when goggles names one plane, that plane's file.
- **Tiers:** one lookup. No second, more expensive pass.
- **Kind:** code.

## 2. Goggles: which card a path is on

- **Class:** branch.
- **Where:** `src/integrations/hooks/goggles-pipeline.mjs`. `planeOfPath` 110. `thingOfPath` 191. `lensBeforeResearch` 945. Planes at 23. `PATH_OWNER` at 163.
- **In:** a tool name and the paths in that call. Hold file `.xray/state/goggles-plane.json`.
- **Candidates:** planes `dev`, `integration`, `domain`, `ecosystem`, then a thing card when a listed path is longer than the plane prefix. A tie among things uses `PATH_OWNER` or stays the plane.
- **Decision:** longest matching prefix wins the plane. A search runs only when every path in the call sits inside the current card (`covers`, 172 and 952). Anything else is denied and the card text is returned. Opening one file on another card switches and sticks. Zero or two cards do not switch. A session starts on dev (`ensurePlane`, 919).
- **Out:** allow the search, or deny with the current card. A read may switch the hold.
- **Tiers:** searching inside the card is the cheap path. A search of the whole tree does not run.
- **Kind:** code. Plate `docs-site/docs/plates/goggles.md` and `docs-site/docs/plates/lens-gate.md` say the same thing.

## 3. Goggles: name one plane

- **Class:** branch.
- **Where:** `gogglesAnswer` 376, `suitHint` 766, `lensPlane` 851. CLI `look` and `goggles` in `src/cli/index.ts` 122 and 130.
- **In:** words. `look` / `name` with no plane is a stop.
- **Candidates:** card names and the four planes.
- **Decision:** exactly one named card returns that card. Zero names on an empty argv returns the held card. Any other mix returns the text `Name one plane.` `lensPlane` stops `scoreAndRoute` before an agent is picked (`src/nucleus/thin-dispatch.ts` 98).
- **Out:** one card, or a stop with an empty agent.
- **Tiers:** naming a plane is required. There is no fallback agent.
- **Kind:** code.

## 4. Goggles: pick a file from clues

- **Class:** scored.
- **Where:** `fileFromClues` in `goggles-pipeline.mjs` 713, used when a plane has clues and no files (`growPlane` / `seenFields` 980).
- **In:** clue strings and `src/**` texts, skipping tests.
- **Candidates:** source files that contain a clue. A clue that hits more than 8 files is dropped.
- **Decision:** rarer clues weigh more (`9 - hits`). A file whose path contains the plane token gets +20. Paths under `src/cli/` get −3. Highest rank wins. A rank tie prefers the shorter path.
- **Out:** one relative path, or empty.
- **Tiers:** one scan of `src`. No second index.
- **Kind:** code.

## 5. Complexity score and tier agent

- **Class:** scored, then a table (`getAgentForTier`, `getStrategyForLevel`). The level cuts and the operation words are if ladders on that score.
- **Where:** `src/nucleus/thin-dispatch.ts` `scoreComplexity` 41, `routeToAgent` 67, `scoreAndRoute` 92. Thresholds and tier maps in `src/delegation/complexity-core.ts` 86–224. The score `scoreComplexity` actually uses is `ComplexityAnalyzer.calculateComplexityScore` in `src/delegation/complexity-analyzer.ts` 83. Operation words at 329.
- **In:** operation text, plus a context object (file count, line counts, dependencies, risk, duration). Missing context becomes file count from whatever `calculateFileCount` reads, 0 lines, 0 dependencies, risk `low`, duration 30 (`estimateDuration` 356).
- **Candidates:** levels simple / moderate / complex / enterprise. Agents are only `code-reviewer` (low tier) or `architect` (medium, high, enterprise) — `getAgentForTier` 203. Strategies: single-agent, multi-agent, orchestrator-led (`getStrategyForLevel` 164). Agent counts 1, 2, 3, 5 (177).
- **Decision:** points are `min(files*4, 40) + min(lines/5, 50) + min(deps*5, 25) + min(duration/10, 15)`, times an operation weight (debug 2.0, refactor 1.8, analyze 1.5, test 1.3, modify 1.2, create 1.0) and a risk multiplier (low 0.8 through critical 1.6). Level cuts are ≤15, ≤25, ≤50, else enterprise (`DEFAULT_THRESHOLDS` 86). The operation type is the first keyword hit among refactor, debug, test, analyze, create; otherwise modify.
- **Out:** score, level, strategy, agent, and optionally the first file from `lensPlane`.
- **Tiers:** ≤15 is one agent. Above that the strategy says multi-agent or orchestrator, but the tier agent is still `architect` until repertoire replaces it.
- **Kind:** code. `calculateBaseScore` in `complexity-core.ts` 229 is a second formula (files×3 capped 30, and different caps). `scoreComplexity` does not call it. Other callers were not traced in this pass.
- **Doc:** `docs-site/docs/plates/routing.md` matches the cuts and the two agents.

## 6. Task-type subagent table

- **Class:** table. One fallback: an unknown key is `backend-engineer`.
- **Where:** `TASK_TYPE_ROUTES` and `routeSubagent` in `src/nucleus/autonomy-kernel.ts` 77 and 119. Same table in `docs-site/docs/guides/autonomy-command.md` 83.
- **In:** a task-type string.
- **Candidates:** plan→strategist, architecture→architect-tools, research→researcher, implement→backend-engineer, frontend→frontend-engineer, test→bug-triage, review→code-review, security→security-audit, governance→enforcer.
- **Decision:** exact key after trim and lower-case. Anything else is `backend-engineer`.
- **Out:** one route name. `resolveRoutedAgent` in `src/mcps/orchestrator/config/agent-capabilities.ts` 20 maps those names onto registry keys (`code-review`→`code-reviewer`, and three more).
- **Tiers:** a table lookup. No score.
- **Kind:** code, copied into the guide.

## 7. Orchestrator agent pick

- **Class:** branch. The last arm, used only when the earlier returns miss, is scored.
- **Where:** `AgentCapabilitiesManager.selectAgentForTask` in `src/mcps/orchestrator/config/agent-capabilities.ts` 100. Called from `ExecutionPlanner.assignTasksToAgents` in `src/mcps/orchestrator/execution/execution-planner.ts` 229.
- **In:** required capabilities, a complexity number, operation text, task type.
- **Candidates:** agents in `AGENT_REGISTRY`, after the memory provider may rewrite their caps (`enhanceAgentCapabilities`).
- **Decision, in order:** if the operation text is non-empty, `scoreAndRoute`. A lens stop returns null. A repertoire override that names a known agent wins. A plane file plus an agent other than `researcher` wins when that agent is known. Else the task-type table. Else, when the provider is not null, `provider.selectAgent`. Else a local score: skip agents whose `complexityThreshold` is below the task, then `matchCount * 10 + concurrentTasks`, highest wins.
- **Out:** one agent name, or null, or the caller substitutes `orchestrator` (execution-planner.ts 247).
- **Tiers:** the first hit returns. Capability scoring is the last resort. A high-confidence trap prefixes the description with `TYPE: ontological-trap` (execution-planner.ts 239) so the repertoire path can see it.
- **Kind:** code.

## 8. Planner complexity and execution shape

- **Class:** scored for the number (a switch on priority), then branch for the strategy.
- **Where:** `calculateTaskComplexity` 346 and `recommendStrategy` 384 in `execution-planner.ts`.
- **In:** task priority, `estimatedComplexity`, dependency count, and either `metadata.memoryComplexityBoost` or `getTaskConfidence().complexityBoost`.
- **Candidates:** a number from 1 to 100, then a strategy.
- **Decision:** start at 30. critical +20, high +10, low −5. If `estimatedComplexity` is set, average it in. Each dependency id adds 5. Add the memory boost. Clamp 1–100. Strategy: one task → sequential; overall complexity >70 → sequential; overall <30 and more than 3 tasks → parallel; otherwise `optimized`.
- **Out:** the number used by `selectAgentForTask`, and a strategy string.
- **Tiers:** parallel is the cheap shape. High complexity forces sequential.
- **Kind:** code. This formula is not the thin-dispatch formula.

## 9. Phased plan versus a single implement todo

- **Class:** branch.
- **Where:** `buildLeadDevPlan` in `autonomy-kernel.ts` 206. Default `phased_plan_threshold` 25 in `src/core/features-config.ts` 854.
- **In:** description, task types, optional MCP complexity, and whether confer is explicitly on.
- **Candidates:** a phased plan (research phase plus implement phase) or a flat implement list.
- **Decision:** `complexity = max(scoreComplexity, mcp score)`. Phased when that is above 25 or there is more than one task input. Mandatory consults (researcher, architect-tools, code-review, lines 25–29) are added only when confer is explicitly enabled (`conferExplicitlyEnabled` 89) and the plan is phased.
- **Out:** a lead-dev plan, or null when lead-dev mode is off.
- **Tiers:** under the threshold with one task stays a short plan. Over it adds phases. The three consults are the expensive tier, and they stay off unless confer is on.
- **Kind:** code.

## 10. Spawn ceremony by host

- **Class:** table for the host profile, then branch for warn versus deny.
- **Where:** `src/nucleus/suit-temperament.ts` `resolveSuitProfile` 101, `ceremonyForProfile` 223, `spawnPlanModeForProfile` 227. Gate `evaluateSpawnPlanGate` in `src/nucleus/delegation-gate.ts` 388.
- **In:** `suit_temperament.profile` in features, else the host. Missing profile is guided (101). `auto` uses host defaults: grok and cursor are frontier; hermes, opencode, openclaw, and generic are guided (42).
- **Candidates:** spawn modes `warn`, `deny`, and `off`.
- **Decision:** frontier warns and uses ceremony `lite`. Guided and strict deny and use ceremony `full`. Codex stays a separate gate. A subagent spawn with no plan, a stale plan, or a spawn that misses the todo is denied, unless the mode is `warn` (soft allow) or `off` (allow).
- **Out:** allow, warn-allow, or deny. Deny tells the caller to run `analyze-complexity` first.
- **Tiers:** frontier spends a warning. Guided and strict spend a blocked spawn until a plan exists.
- **Kind:** code. Plate `docs-site/docs/plates/temperament.md`.

## 11. Aside track versus the main plan

- **Class:** branch.
- **Where:** `resolveSpawnPlan` in `src/nucleus/spawn-plan-resolution.ts` 37. Active pointer in `src/nucleus/user-aside.ts` `loadActiveUserAside` 347.
- **In:** an explicit todo id, the session, and `.xray/state/asides/`.
- **Candidates:** the aside that contains the todo, the active aside, the main lead-dev plan, or none.
- **Decision:** an explicit todo that sits on an active aside wins. Else the active aside. Else the main plan when `hasValidSpawnPlanContext` says so. Else none.
- **Out:** `{ source: 'aside' | 'main' | 'none', plan }`.
- **Tiers:** one file read. No ranking.
- **Kind:** code.

## 12. Next todo

- **Class:** branch. First pending todo in phase order. No score.
- **Where:** `getNextRequiredTodo` in `src/nucleus/lead-dev-plan-persistence.ts` 232.
- **In:** a persisted plan.
- **Candidates:** todos still `pending` or `in_progress`.
- **Decision:** first such todo in phase order. No score.
- **Out:** that todo, or null.
- **Kind:** code. It is a queue, not a cost rank.

## 13. Per-suite test versus the full suite

- **Class:** branch.
- **Where:** `shouldFlagFullTestSuite` in `autonomy-kernel.ts` 123. Rule text in `LEAD_DEV_RULES` 16. Config `per_suite_test_triage` defaults true (`features-config.ts` 853).
- **In:** a shell command.
- **Candidates:** a focused test command, or a full `npm test` / `vitest run` / `pnpm test` / `yarn test`.
- **Decision:** if triage is on and the command is a test command with no `.test` target and no `test:<name>`, the function returns true (flag the full suite).
- **Out:** a boolean the gate can surface. This pass did not follow every caller.
- **Tiers:** a focused file is the cheap run. The full suite is the expensive one, and the flag marks it.
- **Kind:** code.

## 14. Model pick

- **Class:** branch for the task type, then a table for the model row, then a fallback chain.
- **Where:** `detectTaskType` in `src/core/features-config.ts` 453. `FeaturesConfigLoader.getModelForTask` 593 and `getMaxTokensForTask` 614. `ModelRouter.getModelForTask` in `src/core/model-router.ts` 68. Defaults at `features-config.ts` 830.
- **In:** a tool name, optional file count and `isComplex`, optional agent type.
- **Candidates:** task types from keyword tests, in this order: read/cat, grep/search/find, git/commit/push, edit/write/sed, doc/readme/markdown, security/audit/vulnerability, architect/design/structure, generate/create/implement, debug/fix/error, else `unknown`. Edit with file count >5 or `isComplex` is `bulk_refactor`, else `simple_edit`. Models come from `model_routing.task_routing`, then `agent_management.agent_models`, then `default_model`, then the string `claude-sonnet-4` if `isModelAvailable` passes, then `fallback_model` or `claude-haiku-4`.
- **Decision:** first matching keyword. `isModelAvailable` returns true for every string (model-router.ts 142), so it does not drop a model. The default config sets `model_routing.enabled` true and does not set `task_routing` or `default_model` (830). With that config, an unknown tool falls through to `claude-sonnet-4`.
- **Out:** one model name, and a max-token number (4000 when the task has no row).
- **Tiers:** the code can point bulk work at a different model than a read. The shipped default does not. There is no price or latency comparison.
- **Kind:** code.

## 15. Voting strategy

- **Class:** branch. Risk words sit in a small table (`RISK_WEIGHT_MAP`) that the ifs read.
- **Where:** `AdaptiveStrategySelector.selectStrategy` in `src/delegation/strategy-selector.ts` 46.
- **In:** complexity number, risk word, participant count, security flag, architecture flag.
- **Candidates:** `majority_vote`, `consensus`, `expert_priority` (defaults at 20).
- **Decision:** security or architecture returns `expert_priority` immediately. Else risk weights low 1, medium 2, high 3, critical 4. Complexity ≥50 uses enterprise strategy when risk ≥3, else complex (`consensus`). Complexity ≥25 uses complex when risk ≥2, else moderate. Four or more participants and risk ≥2 uses moderate. Else simple (`majority_vote`).
- **Out:** one strategy name.
- **Tiers:** majority is the cheap vote. Expert priority is the expensive one and is forced for security and architecture.
- **Kind:** code. `isSecurityRelated` only re-reads the boolean flag (112). The domain lists at 36 are not consulted by `selectStrategy`.

## 16. Weighted vote winner

- **Class:** scored.
- **Where:** `WeightedVotingAggregator` in `src/delegation/weighted-voting-aggregator.ts`. Total weight at 111. Winner at `createDetailedVotingResult` 255. Expertise table `src/delegation/agent-expertise.ts` 12 and `getTopExpertsForDomain` 164.
- **In:** votes with an agent name, an option, and a confidence. Stored performance when present.
- **Candidates:** the options the voters named. Separately, experts for a domain.
- **Decision:** weight is expertise (level/10 times a base) times confidence impact times historical weight. Votes for the same option add up. The aggregated list's first row is the winner. Confidence is winner weight over winner-plus-second when there are two options. `getTopExpertsForDomain` filters roster rows whose domain or specialty contains the string, sorts by `expertiseLevel` descending, and slices to 3.
- **Out:** one winning option, plus a confidence, or the top experts.
- **Tiers:** a higher expertise level weighs more. There is no dollar cost.
- **Kind:** code.

## 17. Law match and confidence (Repertoire 0.2.9)

- **Class:** scored.
- **Where:** vendored `node_modules/@0xray/repertoire/dist/registry/CuratedSignalsManager.js`. `LAW_CLAUSE_SPAN` and stop words at 12. `lawClauseInText` 45. `matchByText` 321. `DEFAULT_PROMOTION_MIN_CONFIDENCE` 0.55 at line 6. Feedback step 0.1 at lines 8–9. Confidence math in `dist/orchestrator-bridge/confidence-gate.js` `getConfidenceForTask` 16. Agent choice in `dist/orchestrator-bridge/RepertoireOrchestratorBridge.js` `selectAgentForTask` 39 and `resolveThinDispatchAgent` 87. Score in `dist/orchestrator-bridge/signal-injector.js` `scoreAgent` 144. Search API `RepertoireService.searchPrimitives` 218. The suit calls this through `ensureMemoryRoutingProviderSync` in `thin-dispatch.ts` 105. The in-repo null provider does not (`src/memory-routing/null-provider.ts` `resolveThinDispatch` 67 leaves the agent and the score alone). Its `selectAgent` (45) is the same `matchCount * 10 + concurrentTasks` formula as the orchestrator fallback.
- **In:** task text. Signals are named laws with a definition, tags, priority, and observation stats.
- **Candidates:** every loaded signal. Then agents in the capability map. Trap-capable agents are `architect`, `security-auditor`, `researcher` (`confidence-gate.js` 4).
- **Decision:** a hit is the signal name (or the name with hyphens as spaces) or four consecutive definition content words, in order, inside a window twice that long. Two stray words are not a clause. Scattered words in a long diary are not a clause. Comment at 317 and the function at 41. Score starts at 5 for a name or 4 for a clause, plus 3 for one matching tag, plus up to 4 when at least two long definition words appear, plus up to 3 for criteria words, plus 4 for a snippet prefix, plus 1 when priority is high. `minScore` default 2. Matches sort by that score. Confidence uses decayed stats. Below 0.55 is dropped (`meetsConfidenceGate`). Complexity boost: if a high-confidence trap is present, `round(10 + maxConfidence * 10)`; plus `round(excess * 20)` where excess is max confidence minus 0.55; plus 5 when two or more signals passed the gate. Recommended agent is `architect` only when that trap is present. `selectAgentForTask` returns the first trap-capable agent that exists, ignoring `complexityThreshold` (comment at 64). Otherwise it scores agents as `capMatch*10 + signalMatch*8 + tagMatch*5 + trapBoost + concurrentTasks`. `resolveThinDispatchAgent` changes the tier agent to `architect` only when the trap is present and the adjusted score is at least 26 and the text matches debug, investigate, redesign, or architect. A `provenance-failure` tag with adjusted score under 51 routes to `bug-triage-specialist`. A trap name alone does not change the agent (comment at 97).
- **Out:** matched signal names, a boost, an agent override, an adjusted score. `searchPrimitives` returns up to 10 laws sorted by confidence.
- **Tiers:** a name hit is cheaper than a clause scan, but both happen in one pass. The architect override is the expensive route and is withheld unless the score and the verb line up. Heat updates `last_seen` and does not add a confidence sample (`RepertoireService` around 140, and `docs/memory-scoring.md` 13–18). Feedback moves conviction by a tenth.
- **Kind:** code in the worn package. The same hit rule is written in `docs/memory-scoring.md` 15–18. The suit plate `docs-site/docs/plates/repertoire.md` only says "one law, or none."

## 18. Researcher asks the organ only sometimes

- **Class:** branch. The organ it sometimes calls is scored.
- **Where:** `src/mcps/researcher-confidence.ts`. Gate 0.55 at line 12. `shouldQueryRepertoireConfidence` 26. `resolveResearcherMemoryContext` 54.
- **In:** proposal title, description, and type.
- **Candidates:** query the provider, or return null.
- **Decision:** query when the text matches `TYPE: ontological-trap` or `ontological trap`, or when `buildRoutingContext` already has a signal confidence ≥ 0.55. Otherwise return null and do not call `getTaskConfidence`.
- **Out:** a context block (signals, boost, recommended agent) or null. `localConferVote` in `src/governance/local-confer.ts` 12 abstains when there is no nested LLM. If a trap is present it names the recommended agent, default `architect`, at confidence 0.62. It never approves.
- **Tiers:** skip the organ unless the text or an existing high confidence says to look. The LLM vote is the expensive path. Local confer is the abstain path.
- **Kind:** code.

## 19. Governance vote

- **Class:** scored for the vote ratio, then branch for the resonance bands and the moral override.
- **Where:** `mergeVotes` and `applyDecisionMatrix` and `calculateMetamorphosisScore` in `src/governance/governance-core.ts` 49, 167, 221. Assembly in `src/governance/governance-service.ts` 163 and the per-proposal merge at 174. Batch rollup at 122. Abstention throw at 66.
- **In:** one vote each from code-review, security-audit, and researcher, plus external Dynamo when it is required. Resonance for the matrix is the merged average confidence. Moral fields come from the Dynamo vote.
- **Candidates:** approve, needs_revision, reject. Matrix recommendations PASS, NEEDS_REVISION, REJECT.
- **Decision:** approve weight over total weighted confidence. Above 0.66 approves. Below 0.33 rejects. Otherwise needs revision. Empty votes abstain at 0.5. Critical moral tension rejects immediately at confidence 0.92. Significant tension demotes PASS to NEEDS_REVISION. Resonance bands: ≥0.92 (and isotopic ratio ≥0.95 when a ratio was supplied) passes at 0.97. ≥0.82 (ratio ≥0.88 when supplied) passes at 0.89. Below 0.75 resonance or below 0.80 ratio rejects. The middle stays needs revision. Vortex volume under `2.5e25` or historical coherence under 0.70 demotes a pass. Solar `active` or `storm` multiplies vote weight by 0.92. Metamorphosis score starts at average confidence, +0.10 for automate or codify, −0.15 for compliance, +0.05 for coherence ≥0.8 and +0.05 for resonance ≥0.8. Under 0.7 the decision becomes needs_revision (`governance-service.ts` 157 and 238). If `lensPlane` names files and an approve does not mention one of those files, the decision becomes needs_revision (243). Across proposals, approve wins the batch only when approved count is over 60 percent; else reject if rejects outnumber approves; else needs revision. Abstention ratio above `maxAbstentionThreshold` (default 1.0, so the check is off unless the caller lowers it) throws.
- **Out:** one decision per proposal, plus a batch decision.
- **Tiers:** three in-suit voters plus Dynamo. Local confer, when the LLM is missing, only abstains. There is no cheaper single-voter path in this function.
- **Kind:** code. Plate `docs-site/docs/plates/governance.md`.

## 20. Confer quorum

- **Class:** branch. A PASS receipt is model-judged when a nested LLM voted. The quorum check does not ask a model. With no LLM, `localConferVote` is a branch that always abstains.
- **Where:** `src/nucleus/confer.ts`. Agents are the same three as `MANDATORY_MAJOR_CONSULTS`. Completion requires every consult receipt to be a real PASS for this session and cycle (`consultReceiptIsRealPass` 537). A FAIL or UNREVIEWED does not complete the todo (comment at 348). `defaultConferConfig` returns `enabled: false` and `on_synthesis: false` (77). The plate `docs-site/docs/plates/confer.md` says a missing key stays off. `conferDefaultForProfile` in `suit-temperament.ts` 232 returns false for every profile.
- **In:** a synthesis checkpoint when confer is on.
- **Candidates:** the three consults. Each verdict is PASS, CONDITIONAL, FAIL, or UNREVIEWED.
- **Decision:** all three must PASS. One block stops the quorum.
- **Out:** completed, partial, pending, or failed.
- **Tiers:** off means the expensive quorum never starts. On means three model passes.
- **Kind:** code. House rule says the same thing: `house/OP-PROC.md` 48, confer stays off unless Blaze turns it on.

## 21. Synthesis checkpoint due

- **Class:** branch. First configured counter that is reached.
- **Where:** `evaluateSynthesisDue` in `src/nucleus/synthesis.ts` 141. Defaults 56: enabled false, every 12 gates, turns 0, todos 0. Zero means that counter does not fire.
- **In:** counts of gates, turns, and finished todos since the last checkpoint.
- **Candidates:** keep working, or mark synthesis due.
- **Decision:** first threshold that is both configured above 0 and reached. Gate count is checked before turns, then todos.
- **Out:** due plus a reason string, or not due.
- **Tiers:** the checkpoint is the expensive stop. It does not run while `enabled` is false.
- **Kind:** code.

## 22. Inference proposals

- **Class:** scored for which proposals go forward. The type label is a branch. The entry gate is a branch.
- **Where:** `generateProposals` in `src/inference/inference-proposal-generator.ts` 185. Confidence adjuster 145. Entry gate `inferenceRunMayEnter` in `src/inference/inference-run-gate.ts` 6 (missing `enabled` is on; explicit false stays off unless forced).
- **In:** a corpus of sessions, problems, patterns, wrong turns, and named signals, plus recent cycle history.
- **Candidates:** proposals of types from the problem text (`classifyProposalType` 100), plus guard proposals for wrong turns, plus up to three minted "learn this speech" proposals, plus one proposal per named signal not already covered.
- **Decision:** recurring-problem confidence is `min(0.95, 0.5 + occurrences * 0.15)`. Wrong-turn guards are 0.7. After history of at least three votes of that type, success under 0.3 multiplies confidence by 0.8, success over 0.7 multiplies by 1.05 and caps at 0.95. Named-signal proposals skip that history adjust (169). The list is sorted by confidence descending and cut to 3 before the named-signal additions (289). Those additions are not re-cut by that slice. A later sort by confidence is at 356.
- **Out:** a short proposal list for the govern step.
- **Tiers:** top three by confidence go forward first. The govern step is the expensive follow-on.
- **Kind:** code.

## 23. Inbox routing (live board)

- **Class:** branch. Seat rule rows come from `inbox-roles.json` (a table the ifs read).
- **Where:** `house/live/feed/routing/inbox.py` `_direct` 205, `_ready_lines` 258, `_stall_lines` 344, `_watcher_gap_lines` 365. Server driver `routePass` / `routeOnce` in `house/live/app/server.mjs` 1902. `SERVER_ROUTING=off` disables it (1907).
- **In:** a feed event (kind, labels, title, base branch, sha) and `inbox-roles.json`.
- **Candidates:** seats named in the roles file. The code defaults used when a seat block is missing: reviewer gets `pr_open` and `pr_update`; tester gets merges whose base is in `develop_branches` or `develop`; operator gets deploy kinds and hold, plus issue-like events whose labels or needles hit; coord gets label or needle hits as "needs decision". Builder gets a `ready` line. Coord gets stalls and watcher gaps.
- **Decision:** kind and word tests, not a score. A ready line requires a `critic_pass` and a later-or-equal green CI on the same sha (`_ready_lines` 289). Stall hours default 6 (347). Watcher gap hours default to that same 6. A line is dropped if the reason or title looks like a body, a message, or a secret (173).
- **Out:** inbox lines. The server posts them and fires seat webhooks.
- **Tiers:** one pass over events. No model.
- **Kind:** code. The wake that follows is written in `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` 11: owner message first, then station, then notes, then each open line, and a non-empty inbox is the job (`house/OP-PROC.md` 19).

## 24. Burst stall route

- **Class:** branch.
- **Where:** `house/burst/cards.py` `STALL_S` 31 (60 minutes), stall flag 327, `route_stalls` 175. A second inbox copy `house/burst/inbox.py` stalls to `cos` after `stall_hours` (the live copy stalls to `coord`). This pass did not diff the two inbox files line by line.
- **In:** live cards and their last beat.
- **Candidates:** the coordinator seat, or no line.
- **Decision:** live and quiet for ≥ 3600 seconds → one stall line. Closed cards drop after 24 hours (`DROP_S` 32).
- **Out:** one inbox line per stalled card.
- **Kind:** code. This 60-minute stall is not `evalNudges`, and it is not the 6-hour inbox stall.

## 25. Nudge ladder

- **Class:** branch.
- **Where:** `evalNudges` in `house/live/app/server.mjs` 900. Intervals 448–449 and 601. Line nudges `nudgeLines` 603. Seat nudges `nudgeSeats` 633. Silent seats `evalSilent` 1039. Handoff miss starts at 958. Held cards at 916. Parked cards are not open for this (`applyStartAfter` comment at 847). Plate `docs-site/docs/plates/bifrost.md` 42. Pack rule `grok-bot/OP-PROC.md` 17. Lexicon `grok-bot/LEXICON.md` 145.
- **In:** live cards and their last beat, open inbox lines, handoff records, seat routes, wake health.
- **Candidates:** the packet `next owner`, else the card owner, else the CoS role. Line nudges stay on the seat that holds the line. Unrouted, refused-login, and quiet-wake nudges go to CoS.
- **Decision:** a live card with no beat for `NUDGE_L1_S` (default 3600) gets L1. L2 goes to CoS `NUDGE_L2_S` later (default 1800). L3 repeats to the L1 seat every `NUDGE_L3_S` (default 7200) and wakes CoS once to reassign. An unacked line steps L1, L2, L3 on that seat, `NUDGE_LINE_S` apart (default 900), and stops at 3 (`mine.length >= 3`). A missing handoff uses the same L1/L2/L3 delays. A seat with no route, a login GitHub refused, or a quiet wake gets one nudge to CoS. A seat silent for `SILENT_S` (default 7200) while it owns live work gets one L2 to CoS. A held card past `HELD_MAX_S` (comment says default 72h) nudges the hold owner once. Repos in `NO_NUDGE_REPOS` are never nudged. Builder-targeted nudges also call `nudgeToCloud` (923, 930).
- **Out:** nudge records and wake notes.
- **Tiers:** L1 is the owner. L2 and L3 pull in CoS. That is the expensive escalation.
- **Kind:** code. The plate and OP-PROC match these defaults.
- **Not the same clock:** `house/live/feed/nudges.py` `comment_body` 78 hardcodes "60" minutes for L1 and "90+" otherwise, and always says next is Builder. It posts comments. It does not decide the ladder. `grok-bot/templates/house/HOUSE.md` 27 describes another sweep: no verdict after 30 minutes, unticked queue or unmerged PASS after 60, open P0/P1 with no PR after 2 hours, one nudge per item per day. This pass did not find that 30-minute / once-a-day sweep inside `evalNudges`.

## 26. Tripwire clock

- **Class:** branch.
- **Where:** `createClock` in `house/live/app/governor.mjs` 27. Wired at `server.mjs` 1281. `TRIP_MS` defaults to 30 minutes (`BIFROST_TRIPWIRE_MINUTES`).
- **In:** a fingerprint of seat moves, open card count, seats with open work, whether any card is waiting on `start_after`, and the CoS seat.
- **Candidates:** do nothing, wake every seat that has open work (stall), or wake CoS (empty board).
- **Decision:** a fingerprint change clears a running clock. If nothing moved for a full window, open cards start a stall run with per-seat deadlines. No open cards and no scheduled `start_after` wakes CoS to pull work. A card waiting on `start_after` is not an empty board (governor.mjs 55). `POST /clock` can start the same run.
- **Out:** a run with deadlines, or null.
- **Tiers:** quiet board costs nothing. A stall wakes many seats. An empty board wakes one.
- **Kind:** code. Plate bifrost 40.

## 27. Review depth

- **Class:** branch. Written if/then. No function returns the tier.
- **Where:** written rules, not a function that returns Light, Normal, or Strict.
  - `grok-bot/OP-PROC.md` 37: Light and Normal are the reviewer's Light PASS plus CI. Strict is for ship, live, security, or identity. Doc copies are Normal. One fix round. A second FAIL goes to the human owner. Hotfix bypass (same paragraph) skips CI wait and critic review before merge, then one live pass.
  - `grok-bot/LEXICON.md` 164: the tier is chosen by scope.
  - `house/OP-PROC.md` 53–59 and 104–106: one pass, one fix, one re-check, then stop. A failed re-check is parked. Fix and small PRs are Light PASS plus gates A–C. Releases are Strict plus A–D. Major releases, new features, and OP-PROC gate changes also need Arch1. Normal is not given its own bullet here.
  - Plate `docs-site/docs/plates/review.md`: one critic pass, one fix, one re-review. A note is not a FAIL. No tier names.
- **In:** what the change is (doc, fix, ship, security, identity, hotfix).
- **Candidates:** Light, Normal, Strict, or the hotfix bypass.
- **Decision:** a person applies the bullets above. The two OP-PROC files do not use the same mapping for Normal.
- **Out:** which PASS is required before merge.
- **Tiers:** Light is the cheap review. Strict adds proof. Hotfix is a skip of the pre-merge review, then one production pass. Arch1 is a further yes.
- **Kind:** doc rule. Implicit in the sense that no program picks the tier.

## 28. Ship gates A–D

- **Class:** branch. Written if/then for which gates apply. The foundry checker is more branches.
- **Where:** `grok-bot/OP-PROC.md` 36 and 50. `house/OP-PROC.md` 102–106 and the release cycle at 65. Checker `scripts/foundry/release-gate.mjs` (header at 1, Gate D failure at 115, local A–C pass at 189). `gateCRefusal` 39 refuses `--skip-docs`.
- **In:** a PR's `gates:` field, plus CI, docs check, pack, and the published npm/tag/release for D.
- **Candidates:** which of A, B, C, D apply. Floor is A and C on every merge. B and D are set per PR. The reviewer may raise `gates:` and may not lower it (`grok-bot/OP-PROC.md` 9).
- **Decision:** A is CI green. B is the packed tarball on the owner's machine across Cursor, Grok CLI, Hermes, OpenCode, and OpenClaw. C is docs. D is published and proven (annotated tag and GitHub Release). `foundry gate` runs the local chain and will not skip C. `--prove-published` checks D and does not publish.
- **Out:** pass or fail for that gate. Green CI alone does not merge.
- **Tiers:** A and C are the floor. B needs a local machine. D is after publish.
- **Kind:** doc rule for which gates apply. Code for the foundry checker.

## 29. Who does the work: seat, follow-up, or a new cloud agent

- **Class:** branch. Written if/then. No function applies the three-condition test.
- **Where:** `house/OP-PROC.md` 9–27 and 16. `grok-bot/OP-PROC.md` 39 and 44. `grok-bot/templates/house/HOUSE.md` 23 and 31. Wake step `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` 15.
- **In:** the size of the job, whether a cloud agent for that card or repo already exists, how many jobs that agent has queued, whether the files differ, and whether the job can be briefed from docs.
- **Candidates:** the seat does it, a follow-up to the existing cloud agent, or a new cloud agent. Deep burn adds a cap.
- **Decision:** a small job (check, rerun, merge after the gate, a file edit) stays on the seat. Deep work, including long reviews and live passes, goes to a cloud agent. One cloud agent per card. If one is running or finished with a PR, steer it. Launch a new one only when no session has the repo, or all three hold: the context agent already has 2 or more jobs queued, the new job touches different files, and the job can be briefed from the docs alone. Otherwise queue a follow-up. Deep burn: one cloud agent per repo area, fixed file ownership, at most 4 at once, in waves (`HOUSE.md` 31 and `house/OP-PROC.md` is the longer form of the follow-up rule). Seats do not build or test on their own computer (`grok-bot/OP-PROC.md` 44).
- **Out:** where the next turn runs.
- **Tiers:** a seat turn is the cheap path for a small job. A new cloud agent is the expensive path and is refused when a follow-up will do. Four-at-once is the burn cap.
- **Kind:** doc rule. The board stores cloud-agent rows (`server.mjs` 1160) but does not apply the 2-jobs / different-files test.

## 30. Spend brake

- **Class:** branch. Written if/then on percents. No function reads the spend figure.
- **Where:** `house/OP-PROC.md` 7–27. "Compute is the scarcest resource." Weekly spend in `ATTENTION_STATE.md`. At 50 percent, pipe down is soft (no new cards). At 75 percent, pipe down is full. "In the dark" means do not retry and do not route around the limit. "Aim for about two agents awake per real state change" (15). "An AI turn is expensive. A seat never runs a loop a script can run" (20).
- **In:** the weekly spend number a person wrote down, and whether a loop already has a script.
- **Candidates:** keep opening work, stop new cards, or stop routines. Seat judgment versus a server script.
- **Decision:** the percentages and the two-agent aim are written. This pass did not find a function that reads a spend figure and switches mode.
- **Out:** what a seat is allowed to start.
- **Tiers:** under 50 percent is normal. 50 is soft stop. 75 is full stop. Scripts are cheaper than seat turns.
- **Kind:** doc rule. Implicit as an action, because the percent check is not code.

## 31. Role handoff

- **Class:** table. Written rows from act to seat. No function does the lookup.
- **Where:** `grok-bot/OP-PROC.md` 6–7. `house/OP-PROC.md` 29–43. Lexicon role rows `grok-bot/LEXICON.md` 151–170.
- **In:** the kind of act (implement, merge, review, spend, post, assign).
- **Candidates:** implementer (mill), publisher (forge), reviewer (critic), coordinator (CoS), human owner, and optional specialists.
- **Decision:** code and PRs go to the implementer. Merge and gates go to the publisher, and a seat does not merge what it wrote. Review does not merge. Money, credentials, deletes, publishing, and production go to the human. CoS assigns and does not deploy, publish, spend, or merge. Asks to Arch1 are a GitHub @-mention, which the collector turns into an inbox line (`house/OP-PROC.md` 42). The inbox reads labels and handles, not the comment body.
- **Out:** the next seat.
- **Tiers:** a chat ping with no GitHub record is not work (`grok-bot/OP-PROC.md` 5). The GitHub mention is the path that wakes someone outside the fleet.
- **Kind:** doc rule. Login checks are code: `auditRouting` in `server.mjs` 588 refuses a login GitHub does not resolve.

## 32. Event picture (not a cost pick)

- **Class:** branch. First matching event kind.
- **Where:** `Flow.hops` in `house/live/feed/live_flow.py` 66.
- **In:** an event kind.
- **Candidates:** fixed hop lists (actor to GitHub, reviewer to GitHub to author, Railway to a host, and the other branches in that function).
- **Decision:** first matching kind. Deploy host is `main` versus anything else (54–57). The file calls that host choice a heuristic (line 8).
- **Out:** a hop list for the board drawing.
- **Tiers:** none. It does not choose who works.
- **Kind:** code. Listed so it is not mistaken for the inbox router.

## 33. Learned thresholds that do not yet change the route

- **Class:** scored, and it does not route. The fallback thresholds are a branch on failure.
- **Where:** `LearningEngine.getAdaptiveThresholds` in `src/delegation/analytics/learning-engine.ts` 114. The file says it was extracted from `task-skill-router.ts`. That router file was not in the delegation listing opened for this pass. On failure the thresholds fall back to confidence 0.7–0.95 and frequency 5–100. `triggerLearning` 142 reads routing outcomes and pattern metrics and can push recommendation strings ("consider adjusting confidence threshold"). This pass did not find it writing a new agent route.
- **Kind:** code that records and advises. It is not yet a seek that picks an agent.

## Hard-coded branches

A counted arm is an if, else if, else, or switch case that chooses a destination, an allow or a deny, a type later used as a route, or a named fallback. Not counted: a null or empty guard, a file-exists check, a field copy, a log line. The only `switch` inside a seek function opened this pass is `calculateTaskComplexity` in `src/mcps/orchestrator/execution/execution-planner.ts` at 350 (critical, high, low). The other trees are if / else if / else. This is not a repo-wide switch census.

No seek function asks a model to pick among candidates. Confer and governance store a model verdict, then a branch reads it. `localConferVote` (`src/governance/local-confer.ts` 12) does not call a model. It abstains.

| Area | Arms | What the arms do |
|------|------|------------------|
| Plate recall | 1 | Tie or zero score returns null (`plates.cjs` 390). |
| Goggles hold | 6 | Skip a non-search, allow a search inside the card, deny a search outside it, stay, switch to the one other card, stay on a mix (`goggles-pipeline.mjs` 949, 958, 959, 966, 967, 971). |
| Goggles name | 4 | One named card, empty argv uses the hold, anything else stops, a missing card stops (`goggles-pipeline.mjs` 387, 388, 391, 394). |
| Complexity words and cuts | 14 | Operation type 6 (`complexity-analyzer.ts` 331–336), risk 4 (350–353), level 4 (`complexity-core.ts` 145–148). |
| Thin dispatch | 7 | How to read the score, 4 (`thin-dispatch.ts` 73–80). Stop, repertoire, or the base agent, 3 (99, 108, 144). The agent name after that is a table. |
| Task-type table | 1 | Unknown key falls back to `backend-engineer` (`autonomy-kernel.ts` 120). |
| Orchestrator pick | 6 | Lens stop, repertoire override, plane file, task-type table, provider, local score (`agent-capabilities.ts` 108, 110, 113, 120, 127, 153). |
| Planner | 9 | Priority switch 3 (`execution-planner.ts` 350–360). Boost from metadata or from the provider, 2 (369–371). Strategy 4 (385–388). |
| Lead-dev shape | 4 | Off returns null (`autonomy-kernel.ts` 213). Phased versus a flat list, 2 (229). Full-suite flag off returns false (125). |
| Spawn and pre-tool gates | 40 | Spawn allow/warn/deny 14 (`delegation-gate.ts` 393, 397, 414–415, 427–428, 436–437, 442–443, 458, 467–473, 476). Synthesis allow/deny 7 (485, 489, 490, 512–513, 532, 539). Pending allow/deny 9 (563, 566, 569, 575, 578–580, 584, 587). Constitution denies 5 and the allow fallback, 6 (647, 661, 672, 679, 688, 696). Pre-tool order is those four gates (716, 722, 734, 737). |
| Aside versus main | 4 | Explicit aside todo, active aside, main plan, none (`spawn-plan-resolution.ts` 44, 53, 58, 61). |
| Temperament | 7 | Missing profile is guided, a named profile is kept, auto uses the host table or guided (`suit-temperament.ts` 106, 107, 114). Ceremony is lite or full, 2 (224). Spawn warns or denies, 2 (228–229). |
| Model pick | 21 | Task type 11 (`features-config.ts` 460–542). Loader: routing off, a task row, or the default, 3 (596, 604, 608). Router: task model, agent model, or validated, 3 (`model-router.ts` 80, 90, 93). Validated model: agent row, default, `claude-sonnet-4`, then fallback, 4 (103, 112, 118, 124). |
| Voting strategy | 8 | Security, architecture, then the complexity and risk pairs, then participants, then simple (`strategy-selector.ts` 50, 54, 60–72). |
| Governance | 13 | Vote merge 5 (`governance-core.ts` 172, 195, 197, 201, and the needs-revision default at 192). Matrix route 8: critical reject, high pass, solid pass, below reject, middle revision, moral demote, low vortex demote, weak coherence demote (74, 112, 117, 122, 126, 131, 138, 142). Solar and alignment ifs change weight only. |
| Confer and local fallback | 7 | Receipt is not PASS, wrong session, wrong cycle (`confer.ts` 544–546). Local confer: a miss, a silent LLM, a trap, or the plain abstain (`local-confer.ts` 14, 21, 28, 36). |
| Synthesis due | 5 | Off, gates, turns, todos, or not due (`synthesis.ts` 145, 148, 154, 160, 169). |
| Inference labels | 13 | Problem type 5 (`inference-proposal-generator.ts` 102–106). Pattern type 6 (111–116). Entry: force on, else explicit false stays off (`inference-run-gate.ts` 10–11). |
| Inbox | 9 | Reviewer, tester, operator by kind, operator by issue label, coord (`inbox.py` 211, 218, 224, 234, 251). Ready lines off (259). Latest state not green (293). Stall lines off (345). Under the stall hours (351). |
| Event picture | 14 | Twelve kind arms (`live_flow.py` 69–95) plus host main versus anything else (55–57). |
| Nudges and clock | 23 | Card ladder 7 (`server.mjs` 916, 932, 935, 936, 939, 944, 948). Handoff L1/L2/L3/CoS 4 (993, 1001, 1010, 1019). Line nudge stays on the seat, and L3 also wakes CoS, 2 (603, 622). Unrouted, refused login, and quiet wake all go to CoS, 3 (636–639). Silent seat to CoS, 1 (1052). Tripwire: clear, not armed, stall, waiting card, no CoS, empty, 6 (`governor.mjs` 42, 48, 50, 55, 56, 57). |

Counted arms in code: 1+6+4+14+7+1+6+9+4+40+4+7+21+8+13+7+5+13+9+14+23 = 216. Written rules are not in that number.

Written if/then, not code:

| Rule | Arms | Where |
|------|------|--------|
| Review depth | 4 | Light or Normal, Strict, hotfix bypass, second FAIL to the human (`grok-bot/OP-PROC.md` 37). House adds Light-versus-Strict and Arch1 (`house/OP-PROC.md` 53–59, 104–106) and does not define Normal the same way. |
| Ship gates | 3 | Floor is A and C. B and D are per PR. The reviewer may raise `gates:` and may not lower it (`grok-bot/OP-PROC.md` 9 and 36). |
| Seat versus cloud | 3 | Small job stays on the seat. Deep work goes to a cloud agent. A new agent starts only when no session has the repo, or all three of queue, different files, and a docs-only brief hold (`house/OP-PROC.md` 9–27). |
| Spend | 4 | Under 50 percent is normal. 50 is soft stop. 75 is full stop. In the dark means do not retry (`house/OP-PROC.md` 7–27). |
| Roles | 5 | Implementer, publisher, reviewer, human owner, CoS (`grok-bot/OP-PROC.md` 6–7). This one is a table, not an if ladder. |

## What is the same shape

The ones that rank all do this: start with a cheap test (a name, a keyword, a kind, a threshold), score only what passed, take the top, and refuse a tie or a weak hit instead of guessing. Plate recall returns nothing on a tie. Law match ignores two stray words and ignores confidence under 0.55. `lensPlane` returns nobody when no plane is named. Local confer abstains instead of approving.

Most of the seeks are not ranks. The destination is an if in the goggles hold, the orchestrator cascade, the gates, the inbox, the nudge ladder, the tripwire, and the written review, ship, cloud, and spend rules. A table picks the task-type agent (`routeSubagent`), the host profile (`DEFAULT_HOST_PROFILES`), and the role rows in OP-PROC. A score picks the plate, the clue file, the complexity tier, the weighted vote, the law, and which inference proposals go first. The planner and governance compute a number and then an if ladder reads it. None of the 33 ask a model to choose the destination.

Cost is almost always a step, not a price. Under 15 is one agent. Under 25 can stay unphased. Frontier warns instead of blocking. A follow-up is preferred to a new cloud agent. L1 stays with the owner and L2 fetches CoS. Light review is less proof than Strict. The number 0.55 is the memory gate. The numbers 0.66 and 0.33 are the vote gates. None of these compare token prices or clock time except the written spend brake, which a person applies.

## Gaps

- Nothing ranks skills. `invoke-skill` in `src/mcps/knowledge-skills/skill-invocation.server.ts` 19 takes a `skillName` the caller already chose. Plate recall picks a plate. It does not pick a skill.
- Model choice has no cost. `getModelForTask` is a keyword table and a fallback string. The default features block does not fill `task_routing`. `isModelAvailable` accepts every model. Effort (a thinking level) does not appear in the router. No function asks a model which candidate to take. Confer and governance read a verdict a model already wrote.
- Review tier is not code, and Normal is not defined the same way in `grok-bot/OP-PROC.md` and `house/OP-PROC.md`.
- Cloud versus seat versus follow-up, the four-agent burn cap, and the 50/75 percent pipe-down are written rules. No function reads a queue length or a spend figure and decides.
- Three stall clocks disagree: nudge L1 at 60 minutes (`evalNudges`), inbox stall at 6 hours (`inbox.py` 347), burst stall at 60 minutes (`cards.py` 31). The house template adds a 30-minute verdict sweep and one nudge per day (`HOUSE.md` 27) that this pass did not find in `evalNudges`. `nudges.py` 78 still tells Builder the wait was 60 or 90 minutes.
- Confer and synthesis default off, so the three-agent consult the phased plan knows how to build does not run unless someone turns it on.
- The learning engine stores outcomes and recommends threshold edits. It does not change `routeSubagent` or `selectAgentForTask`.
- `calculateBaseScore` and `ComplexityAnalyzer.calculateComplexityScore` and `ExecutionPlanner.calculateTaskComplexity` are three different formulas for "how big is this."
- A bare skill description in `.agents/skills/*/SKILL.md` points at a file. It does not score candidates. The agent is expected to have opened the right lens already.

## Overlaps that could share one primitive

- Agent scoring is copied. `NullMemoryRoutingProvider.selectAgent` (`null-provider.ts` 45), the last branch of `selectAgentForTask` (`agent-capabilities.ts` 135), and Repertoire `scoreAgent` (`signal-injector.js` 144) all do capability matches times 10, plus a tie-break. Repertoire adds signal, tag, and trap terms. One scorer could take optional evidence weights.
- "How big" is three formulas, then `getLevelFromScore` is only applied to the analyzer path. The planner's 30-plus-priority number never goes through those cuts unless some other caller does, and this pass did not find that.
- Escalation is several ladders with the same shape (wait, poke the owner, poke CoS): card nudges, line nudges, handoff misses, silent seats, inbox stalls, burst stalls. One clock with a named reason would replace the drift between 30 minutes, 60 minutes, 90 minutes, and 6 hours.
- Two inbox routers (`house/live/feed/routing/inbox.py` and `house/burst/inbox.py`) both classify events into seats. The live one addresses `coord`. The burst stall addresses `cos` or `coordinator`.
- Stopping on a tie is implemented twice in spirit: `recallPlate` when `best === second`, and law match when the clause is too short or confidence is under 0.55. They do not call one function.
- The cascade "try a named rule, then a score, then a default" is `selectAgentForTask`, `getModelForTask`, and `resolveThinDispatchAgent`. Each has its own if-order.

## Closest known patterns

- **Search then rank.** Plate cues, `matchByText`, `scoreAgent`, `getTopExpertsForDomain`, inference proposal sort. Retrieve candidates, score, cut.
- **Cascade classifier.** `detectTaskType`, `selectAgentForTask`'s ordered returns, `localConferVote`'s miss reasons, `Flow.hops`. First matching rule wins and later rules do not run.
- **Cost-based planner, in a weak form.** Thin dispatch plus the repertoire boost chooses a more expensive agent only after a score crosses 26 and a verb matches. It does not estimate the price of each candidate and pick the minimum. The house cloud rule (follow-up unless three conditions hold) is the closest thing to a real cost planner, and it is prose.
- **Router.** Inbox `_direct`, `routeSubagent`, model router, Bifrost login map. A key maps to a destination.
- **Dispatcher.** `getNextRequiredTodo`, `routePass`, `evalNudges`, the tripwire clock. Something is due, so someone is woken.
- **Escalation ladder.** Nudge L1/L2/L3 and the silent-seat nudge. Timeouts promote the page to a higher role.
- **Threshold gate.** Synthesis due, confidence 0.55, metamorphosis 0.7, vote ratios 0.66 and 0.33, phased-plan 25, spawn deny versus warn. Cross the line or stay on the cheap side.
- **Voting system.** `mergeVotes` and the weighted aggregator. Not a cost pick. A tally.

## Lexicon paragraph

A seek takes a need, sets it against the candidates on hand, and sends it down the cheapest path that still holds. The cheap test is usually a hard-coded if or a table row: a keyword, a kind, a host profile, an inbox rule. A score promotes the work when the ifs do not settle it: a plate cue, a complexity tier, a law match. A model may write a confer or governance verdict, and a branch then reads that verdict. A tie, a weak hit, or a missing name does not guess: plate recall returns nothing, a law under 0.55 stays out, and a look that names no plane returns nobody.

## First impl: skills as a seek

Skills are the first seek to implement. This section is design text only. Core code stays held until 4.1.1 ships. The seat-facing half is #385: a role picker, a configurator, so a suit wears a chosen set of roles and skills, and inspect checks that pick instead of the whole catalog.

Skill selection routes cheap-first, in the order in the definition.

Branch first. A work-kind test returns before any lookup. Confer is the example. Confer runs only for feat or refactor work. It stays off for fix, docs, and chore. The tree already defaults that way: `defaultConferConfig` returns `enabled: false` (`src/nucleus/confer.ts` 77) and `conferDefaultForProfile` returns false for every host (`src/nucleus/suit-temperament.ts` 232). The branch turns the three-agent quorum on only for feat and refactor. Fix, docs, and chore never pay for it.

Table next, and only if the branch did not finish the choice. Reuse `TASK_TYPE_ROUTES` and `routeSubagent` (`src/nucleus/autonomy-kernel.ts` 77 and 119). That row already maps plan, research, implement, frontend, test, review, security, and governance to one route. #385's picker is the allowed subset. The table is read only inside that subset. An unknown key keeps the existing fallback, `backend-engineer`, and does not start a scan.

Score third, and only if the branch and the table did not name a skill. Reuse plate recall (`recallPlate` in `src/integrations/hooks/plates.cjs` at 374). Cue weights pick one plate. A tie or a zero returns nothing. The plate's skill line is the candidate. Do not score every skill when a plate already won.

Model last. A model chooses only when the branch, the table, and the score all decline. It is not the default path.

Goggles is the scope around those tiers, not another rank. `lensBeforeResearch` (`src/integrations/hooks/goggles-pipeline.mjs` 945) already refuses a search outside the held card. A skill seek reads the skill named on that card before it opens any other skill file. It does not walk the catalog.

The seek has to stay cheaper than opening the skill. A branch or a table row is the whole decision whenever it can be.

## Found issue: two complexity formulas

Thin dispatch and `calculateBaseScore` do not compute the same number. This is a found issue, not a fix. Core code stays held until 4.1.1 ships.

`scoreComplexity` (`src/nucleus/thin-dispatch.ts` 41) calls `ComplexityAnalyzer.calculateComplexityScore` (`src/delegation/complexity-analyzer.ts` 83). That formula caps files at 40 (`files * 4`), lines at 50 (`lines / 5`), dependencies at 25 (`deps * 5`), and duration at 15 (`duration / 10`), then multiplies by an operation weight and a risk multiplier.

`calculateBaseScore` (`src/delegation/complexity-core.ts` 229) is a second formula. It caps files at 30 (`files * 3`), volume at 25 (`changeVolume / 10`), dependencies at 20 (`deps * 2`), and duration at 15 (`duration / 3`), then applies the same kind of weight and multiplier and caps at 100. `scoreComplexity` does not call it.

A caller that hits one function and a caller that hits the other will disagree about how big the task is. The planner's third formula (`calculateTaskComplexity` in `src/mcps/orchestrator/execution/execution-planner.ts` 346, base 30 plus a priority switch) is a separate number again, already listed under Gaps. The disagreement to fix first is thin dispatch versus `calculateBaseScore`.
