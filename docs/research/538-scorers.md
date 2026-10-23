# 538 — one scorer, one cutoff table

Research only. No scorer, plate, lexicon, or test was edited. This note answers the phase 2 seam on `grok-bot/ops/cards/ROUTING-TERMS-PACKET.md` (merged in #403): which scorer is the trunk, which cutoff table is the escalator, which picker the rung switch drives, and how the stall clock sits on the time side. Phase 1 still only aligns words and numbers. Phase 2 code waits on this note. Dichotomy stays Blaze's question.

Checkout: `main` at `02a5ce6b8`. Packet line numbers for `house/live/app/server.mjs` have moved; the lines below are this tree.

## Seam

1. The trunk scorer is `ComplexityAnalyzer.calculateComplexityScore`, entered through `scoreComplexity` / `scoreAndRoute`. `ExecutionPlanner.analyzeTaskComplexity` becomes a caller of that scorer. It stops blending a private base of 30.
2. The cutoff table is the one `getLevelFromScore` already applies: 15, 25, 50, and above that enterprise. `enterprise: 100` is the score cap, not a fourth comparison. `DEFAULT_THRESHOLDS.enterprise` is 75 today and is not read by the comparison. Phase 1 stores 100 in both places and does not start comparing against it.
3. The stall clock stays time. Nudge levels, tripwire, and the governor read the same card the escalator climbed. They do not become rungs. A wait is not a difficulty cutoff.
4. The rung switch is `routeToAgent` plus `getSkillForTier`, with one task-type table as the clause when a type is present. That table is the one now copied in `routeSubagent` and in `seekSkill`. Fleet roles and inbox routing stay delivery. There is no module named role picker or configurator.

## One scorer

Keep `scoreComplexity` (`src/nucleus/thin-dispatch.ts:41`). It builds a `ComplexityAnalyzer`, optionally replaces thresholds, runs `analyzeComplexity` then `calculateComplexityScore`, and returns a `ComplexityScore`.

Keep the analyzer formula in `calculateComplexityScore` (`src/delegation/complexity-analyzer.ts:83`):

- files: 4 points each, cap 40
- change volume: lines / 5, cap 50
- dependencies: 5 each, cap 25
- duration: minutes / 10, cap 15
- multiply by operation weight and risk multiplier
- clamp 0–100, then `getLevelFromScore`

Inputs the analyzer already accepts, from the operation string and the context object (`complexity-analyzer.ts:62`, helpers at `:307`):

| Input | Where it is read | Default |
| --- | --- | --- |
| operation text | `determineOperationType` | `modify` |
| `files` | file count | 1 |
| `linesChanged`, `changeVolume`, or `changes.{added,deleted,modified}` | volume | 0 |
| `dependencyCount` or `dependencies` | dependency count | 0 |
| `riskLevel`, `critical`, `highRisk` | risk multiplier | `low` (0.8) |
| `estimatedDuration` or `estimatedTime` | duration points | 30 |

`routeToAgent` (`thin-dispatch.ts:67`) maps that level through `levelToTier` and `getAgentForTier`. `scoreAndRoute` (`:92`) is the climb: score, then `lensPlane` (a look that names no plane returns no agent), then `routeToAgent`, then `resolveThinDispatch` when the memory provider is not the null provider.

Delete the other score. `ExecutionPlanner.calculateTaskComplexity` (`src/mcps/orchestrator/execution/execution-planner.ts:346`) starts at 30, adds 20 / 10 / −5 for critical / high / low priority, averages in `estimatedComplexity` when it is set, adds 5 per dependency, adds a memory `complexityBoost`, and clamps to 1–100. It never calls `ComplexityAnalyzer`. The same empty task is about 7 (simple) on the trunk and 30 (already above the simple edge) on the planner. `buildLeadDevPlan` (`src/nucleus/autonomy-kernel.ts:217`) then takes `Math.max` of the two. That max is a third score.

`recommendStrategy` (`execution-planner.ts:384`) is a second ladder with different words: one task is `sequential`, overall complexity above 70 is `sequential`, below 30 with more than three tasks is `parallel`, otherwise `optimized`. Those words are not `single-agent` / `multi-agent` / `orchestrator-led`. `generateRecommendations` (`complexity-handler.ts:344`) repeats the 70 cutoff. Phase 2 derives the delegation strategy from `getStrategyForLevel`. A schedule hint can stay, under those other words, and it does not set the level.

`calculateBaseScore` (`complexity-core.ts:229`) is a third formula (files × 3 cap 30, volume / 10 cap 25, dependencies × 2 cap 20, duration / 3 cap 15) with no caller in this repo. Delete it.

`generateReasoning` (`complexity-core.ts:299`) narrates the comment bands, not the live edges. A score of 20 is level `moderate` and the sentence says simple. A score of 40 is level `complex` and the sentence says moderate. A score of 60 is level `enterprise` and the sentence says complex. Phase 1 rewrites those four sentences onto the live edges.

Runtime calibration can move the live edges. `updateThresholds` (`complexity-analyzer.ts:141`) stores history, and after 10 rows `applyCalibrationAnalysis` (`:211`) shifts `simple`, `moderate`, and `complex` by up to 10. It never writes `enterprise`. The published table is not stable once that history fills. Phase 2 leaves calibration off the published edges. The oscillator, later, is the settings write allowed to move a rung.

`xray/features.json` `complexity_thresholds` (`:144`) is loaded only because `mergeWithDefaults` spreads the file onto the config object (`features-config.ts:721`). `getDefaultConfig` (`:814`) does not include the block. Nothing passes it to `setThresholds`. The analyzer always starts from `DEFAULT_THRESHOLDS`. Phase 2 makes `scoreComplexity` read that block, and makes a missing file use the same tuple.

## One cutoff table

| Score | Level | Strategy | Agents | Rung switch |
| --- | --- | --- | --- | --- |
| ≤ 15 | simple | single-agent | 1 | `code-reviewer` / skill `code-review` |
| ≤ 25 | moderate | multi-agent | 2 | `architect` / skill `architecture-patterns` |
| ≤ 50 | complex | orchestrator-led | 3 | `architect` / skill `architect-tools` |
| > 50, through 100 | enterprise | orchestrator-led | 5 | `architect` / skill `architect-tools` |

The three edges are 15, 25, and 50. Each edge is a threshold. The ladder is the escalator. `enterprise: 100` is the cap `calculateComplexityScore` already clamps to. `getLevelFromScore` (`complexity-core.ts:141`) returns `enterprise` for every score above `complex`. It does not read `thresholds.enterprise`. A score of 75 and a score of 100 are the same level.

`getAgentForTier` (`complexity-core.ts:203`) collapses moderate, complex, and enterprise onto `architect`. `getSkillForTier` (`:216`) splits the skill (`architecture-patterns` vs `architect-tools`) and has no caller. Phase 2 calls it from the switch. The architect collapse stays until a later seat map says otherwise. This note does not invent seats.

`getAgentCountForLevel` (`:177`) asks for 5 agents at enterprise. `xray/features.json` `multi_agent_orchestration.max_concurrent_agents` is 3 (`:42`). The spawn governor is capacity, not a rung. Phase 2 does not raise the cap in this note. The mismatch stays visible: an enterprise rung can ask for more agents than the orchestration cap allows.

## What the switch drives

`selectAgentForTask` (`src/mcps/orchestrator/config/agent-capabilities.ts:100`) is four pickers in one function. Today the score's agent is usually thrown away.

1. `scoreAndRoute(description, {})` runs, with an empty context, so the trunk sees one file, no volume, low risk, and a 30 minute duration.
2. The returned agent is kept only when repertoire changed it, or when `lensPlane` attached exactly one file and the agent is not `researcher`. A look that names no plane returns null and stops the function.
3. Otherwise `routeSubagent(taskType)` wins. Unknown types become `backend-engineer` (`autonomy-kernel.ts:120`).
4. Otherwise a non-null memory provider's `selectAgent` wins.
5. Otherwise a capability score wins: skip any agent whose `maxComplexity` is below the planner's number, then `matches * 10 + concurrentTasks`. The caller substitutes `orchestrator` when that returns null.

`src/__tests__/unit/agent-capabilities-routing.test.ts:15` locks this. `selectAgentForTask(['implement'], 50, 'build api', 'implement')` is `backend-engineer`. Complexity 50 would be `architect` from `routeToAgent`. The test requires the task-type bypass.

Phase 2 makes one switch:

- No plane named: still return nobody. That stop stays.
- Repertoire may still replace the agent. That override stays.
- A task type, when present, is a clause of the switch, read from one table.
- Otherwise the level from the trunk selects `getAgentForTier` / `getSkillForTier`.
- The capability loop stops assigning. `AGENT_REGISTRY.maxComplexity` stops being a second reject gate that can drop the agent the switch just named.

There is no `role picker` and no `configurator` symbol. `AgentCapabilitiesManager` is the cascade above. `getAgentForTier` and `getSkillForTier` are the score half of the switch. `routeSubagent` is the task-type half.

The task-type table is copied. `TASK_TYPE_ROUTES` in `autonomy-kernel.ts:77` and `skill-seek.mjs:7` have the same nine keys. Failure differs: `routeSubagent` returns `backend-engineer`, `routeForTask` in seek returns `""` and seek can decline. Keep the decline. Delete the second copy. Seek keeps choosing a skill and does not size the work.

`AgentDelegator.determineAgents` (`agent-delegator.ts:450`) is another who-table: keyword mappings at confidence ≥ 0.7 (`:151`, `:229`), then `operation === "security" | "review" | "design"`, then strategy branches that push `security-auditor`, `refactorer`, `code-reviewer`, `architect`. Hardcoded confidences are all ≥ 0.75, so the predictive branch at `:606` (`confidence < 0.7`) does not run. `preprocessTaskDescription` (`:284`) comments a `TaskSkillRouter` that is not in the repo and returns `code-reviewer` at confidence 0.5. Phase 2: the delegator calls the trunk and the switch. The keyword file becomes an input the switch may read. It stops assigning on its own. The stub and the dead prediction branch go away.

Fleet roles (`grok-bot/OP-PROC.md:7`) and inbox routes (`house/live/feed/routing/inbox-roles.json`) stay delivery. The switch speaks a suit agent today (`architect`, `code-reviewer`). Those strings are not inbox seats. Phase 2 must say the agent-to-seat join before a rung is deliverable. It does not make the inbox the picker.

A cloud agent does the code (`OP-PROC.md` coordinator-never and the forge rule). No rung sends a build to a seat's own computer. Arch1 stays anyone outside the fleet, reached by a GitHub mention (`OP-PROC.md:7`). A review rung may name Arch1. That mention does not rewrite the outside-fleet rule.

## Time side

The card the escalator climbed is the card `evalNudges` and the governor already watch. The join is one system with two sides. The words stay distinct.

| Clock | Where | What it measures |
| --- | --- | --- |
| Card L1 | `NUDGE_L1_MS` `server.mjs:602`, default `NUDGE_L1_S` 3600 | A live card with no beat. L1 goes to the next owner, else the card owner (`evalNudges` `:1234`, target at `:1275`) |
| Card L3 | `NUDGE_L2_MS + NUDGE_L3_MS` after L1 (`:1283`) | Repeats to that same seat. Defaults 1800s + 7200s. The card loop does not write an L2 |
| Line L1–L3 | `NUDGE_LINE_MS` `:765`, default 900s | An unacked line, three steps on that seat, then stop |
| Handoff L1–L3 | `evalHandoffs` `:1320` | Missing handoff, same owing seat. L2 after `NUDGE_L2_MS`, L3 after `NUDGE_L3_MS` |
| Tripwire | `TRIP_MS` `:1656`, default 30 minutes. `tripwire` `governor.mjs:16`. `selectStallSeats` `:39` | Quiet board. Empty board wakes the coordinator unless weekly burn is at or above 0.75. A due plan does not hide a stall |
| Held | `HELD_MAX_MS` `:604`, default 72h | One nudge to the hold owner. Not a difficulty rung |
| Silent | `SILENT_MS` `:1368`, default 2h | One nudge on a quiet seat that owns live work. Not a CoS wake |

The comment above `evalNudges` (`server.mjs:1230`) still says level 2 goes to Coord 30 minutes after L1. The loop does not do that. `OP-PROC.md:21` and `AGENTS.md:242` say L3 repeats to the L1 seat and CoS is not woken to reassign. Phase 2 deletes the Coord sentence so the comment matches the loop. Nudge, tripwire, and the governor do not become a second scale.

These other "thresholds" stay off the escalator:

- Session nudge (`src/monitoring/nudge-monitor.ts:49`): think 3, syntax 3, tool 5, death-spiral 3. A stuck session prompt.
- Incident escalation (`src/postprocessor/escalation/EscalationEngine.ts:61`): attempts 2, 3, 5.
- `delegation.confidence_threshold` 0.5 (`xray/features.json:141`). `evaluatePreToolGate` (`delegation-gate.ts:699`) does not read it. The gate is ceremony and the spawn plan.
- `refactoring.max_complexity_threshold` 80 (`features.json:93`). Not read by `getLevelFromScore`.
- `security.security_score_threshold` 70. Not a difficulty band.
- Model router (`src/core/model-router.ts:68`). `model_routing.enabled` is true and `xray/features.json` has no `task_routing` table, so `getModelForTask` (`features-config.ts:593`) falls through to the default model. `detectTaskType` (`:491`) treats `fileCount > 5` as `bulk_refactor`. That picks a model, not a seat.
- Spawn governor (`src/orchestrator/agent-spawn-governor.ts:95`). Capacity. Fallback rate is 10 per minute; `features.json` `agent_spawn.rate_limit_per_minute` is 20 when the config loads.
- Temperament (`src/nucleus/suit-temperament.ts`). Host profile. A deny can block a spawn the switch assigned. It is not a rung.
- `recallPlate` (`src/integrations/hooks/plates.cjs:391`). Intent to one plate, or nothing on a tie (`:407`).
- Wave seed (`server.mjs:946`, `resolveWaveSeed` from `wave-schedule.mjs`). Which wave cards exist. Not a difficulty scorer. `seedTouchFromAcks` (`server.mjs:1005`) copies ack times onto seat touch. The repertoire seed copy (`src/integrations/hooks/station-hook-runtime.cjs:494`) hydrates `curated_signals.json`. None of these size work.
- Seek (`skill-seek.mjs:99`, `seekHeldCard` at `goggles-pipeline.mjs:1009`). Tiers are `card`, `plate`, `decline`. No numeric cutoff. It does not call a model.

`phased_plan_threshold` (`features.json:49`, default 25, read at `autonomy-kernel.ts:216`) uses the same number as the moderate edge for a different question: whether the lead-dev plan is phased. Phase 2 compares the trunk score to that setting. It does not invent a second band.

## Delete

- `calculateBaseScore` and any export that only exists to re-export it.
- The comment bands in `complexity-core.ts:63` and `:80` (0–25 / 26–50 / 51–75 / 76–100).
- The analyzer header at `complexity-analyzer.ts:6` and the inner comment at `:48` (`complex: 50+`, `enterprise: 75+`).
- `DEFAULT_THRESHOLDS.enterprise: 75` as a comparison. Store 100, and keep `getLevelFromScore` from reading it.
- The second `TASK_TYPE_ROUTES`. One table, shared by `routeSubagent` and seek.
- `selectAgentForTask`'s private capability loop as an assigner, and the copy of that loop in `NullMemoryRoutingProvider.selectAgent` (`null-provider.ts:45`). The null provider keeps `resolveThinDispatch` leaving the agent and the score alone (`:67`).
- `AgentDelegator.determineAgents` as an assigner, `preprocessTaskDescription`'s stub, and the prediction branch that cannot fire.
- `recommendStrategy`'s 30 and 70 as a complexity ladder, and `generateRecommendations`'s 70, once the strategy comes from the level.
- `generateReasoning`'s 25 / 50 / 75 sentences.
- The `evalNudges` comment that sends L2 to Coord.
- Comments that name `complexity-router.ts`, `complexity-calibrator.ts`, and `TaskSkillRouter`. Those files are not in the tree.

## Keep

- `getLevelFromScore`, `getStrategyForLevel`, `getAgentCountForLevel`, `getAgentForTier`.
- `getSkillForTier`, wired as the skill half of the switch. It is unused today.
- `getConfidenceForTier` (`complexity-core.ts:190`) as an annotation. It is not a route. No caller found.
- `scoreComplexity`, `routeToAgent`, `scoreAndRoute`, the lens stop, and the repertoire override.
- Seek's cheap-first order and its decline. Seek behavior and `src/__tests__/unit/skill-seek.test.ts` stay unedited in phase 1.
- `levelToTier` / `tierToLevel` / `getTierFromScore`. `levelToTier` is live (`thin-dispatch.ts:83`). The other two have no caller found. Keep them only as the pair of `levelToTier`, or fold them into the switch in the same edit. Do not leave a second mapping.
- Fleet roles, inbox routing, nudge, tripwire, governor, wave schedule, wave seed, temperament, the delegation gate, the model router, the spawn governor, session nudge, incident escalation, plate recall.
- `AGENT_REGISTRY` as the capability catalog. Its `maxComplexity` values stop rejecting the switch's agent. The per-file `maxComplexity` on `src/agents/*.ts` is a second ceiling the registry does not import (`registry.ts` is a hand-written object). Examples: registry `code-reviewer` 30 vs `src/agents/code-reviewer.ts` 100, registry `architect` 50 vs `src/agents/architect.ts` 100. Phase 2 picks the registry as the catalog and stops treating either number as a rung.
- `src/delegation/codebase-context-analyzer.ts:1099` `calculateComplexityScore`. Private, scores a codebase structure, not a task. The name collides. Leave the method. It is not the trunk.

## Conflicts

Published ladders that disagree:

| Source | Bands |
| --- | --- |
| `getLevelFromScore` and `getStrategyForLevel` | ≤15 single-agent, ≤25 multi-agent, ≤50 orchestrator-led, >50 orchestrator-led |
| `docs-site/docs/plates/routing.md:25` | same as the function |
| `AGENTS.md:214` | same as the function |
| `docs-site/docs/agents/README.md:92` | same as the function |
| `docs-site/docs/guides/features-json.md:89` | prints `enterprise: 100` and maps the plate's bands. The guide is right about behavior and the 100 is the cap |
| `docs-site/docs/full-reference.md:60` and `:202` | prose says enterprise work triggers a full multi-agent team. The JSON sample is 15 / 25 / 50 / 100. `getAgentCountForLevel` gives enterprise 5 agents and complex 3, both `orchestrator-led` |
| `.agents/skills/routing/SKILL.md:12` | ≤15 one agent, ≤25 one agent with tools, ≤50 more than one agent, above that the orchestrator leads |
| `docs-site/docs/archive/architecture/PIPELINE_INVENTORY.md:72` | same as the routing skill, including "moderate≤25 w/tools". Archive. Phase 1 can leave it. It is still a published contradiction |
| `complexity-core.ts:63` and `:80` | 0–25, 26–50, 51–75, 76–100 |
| `complexity-core.ts:69` | interface comment matches the function, and says enterprise means score > 50 up to 100 |
| `DEFAULT_THRESHOLDS` `:86` | 15 / 25 / 50 / 75. The 75 is stored and not compared |
| `complexity-analyzer.ts:6` and `:48` | simple 15, moderate 25, complex 50+, enterprise 75+ |
| `xray/features.json:144` | 15 / 25 / 50 / 100. Not applied to the analyzer |
| `generateReasoning` `:299` | sentences at 25 / 50 / 75, so the reason contradicts `score.level` for every score in (15, 75] except the points that happen to agree |
| `recommendStrategy` `:384` and `generateRecommendations` `:344` | 30 and 70, words `sequential` / `parallel` / `optimized` |
| `phased_plan_threshold` | 25, same digit as the moderate edge, different question |
| `src/__tests__/unit/complexity-analyzer-calibration.test.ts:200` and `:230` | passes `enterprise: 100` into `calibrate`. The fixture is not the table. The test does not assert `enterprise` |
| Registry `maxComplexity` vs `src/agents/*.ts` | two ceilings. The capability fallback uses the registry |
| `getAgentCountForLevel` enterprise 5 vs `max_concurrent_agents` 3 | headcount vs capacity |
| `evalNudges` comment `:1230` vs the loop `:1275` and `OP-PROC.md:21` | comment sends L2 to Coord; the loop and the procedure do not |
| `features.json` `agent_spawn.rate_limit_per_minute` 20 vs governor fallback 10 | capacity, not a rung |
| `delegation.confidence_threshold` 0.5 | named like a gate cutoff, not read by `evaluatePreToolGate` |

`docs-site/docs/guides/features-since-3.1.md:342` names `complexity_thresholds` as tier boundaries and does not quote numbers. Phase 1 leaves that line.

No test locks `DEFAULT_THRESHOLDS`. `routeToAgent` tests assert a non-empty string (`thin-dispatch-extra.test.ts:67`, `nucleus-primary.test.ts:202`), not `code-reviewer` or `architect`.

## Callers that change

Phase 1 (words and the stored tuple only):

- `grok-bot/LEXICON.md` public lines. Seek's line changes. Seek's code does not.
- `docs-site/docs/plates/routing.md`
- `.agents/skills/routing/SKILL.md`
- `src/delegation/complexity-core.ts` comments, `generateReasoning` sentences, and `DEFAULT_THRESHOLDS.enterprise` from 75 to 100
- `src/delegation/complexity-analyzer.ts` header comment
- `xray/features.json` only if a reader could still think 75 is the edge. The file already says 100
- `docs-site/docs/guides/features-json.md` and `docs-site/docs/full-reference.md` so the cap sentence is explicit
- `AGENTS.md:214` and `docs-site/docs/agents/README.md:92` already match the table. Touch them only to say enterprise is the cap at 100
- `docs-site/docs/guides/features-since-3.1.md` stays, unless a number is added

Phase 2 (wiring):

| Caller | Change |
| --- | --- |
| `src/nucleus/thin-dispatch.ts` `scoreComplexity`, `routeToAgent`, `scoreAndRoute` | Stay the trunk. Read `complexity_thresholds` from the suit feature file. Call `getSkillForTier` beside `getAgentForTier` |
| `src/delegation/complexity-analyzer.ts` | Stop letting calibration rewrite the published edges |
| `src/delegation/complexity-core.ts` | Delete `calculateBaseScore`. Keep one table |
| `src/mcps/orchestrator/execution/execution-planner.ts` `calculateTaskComplexity`, `analyzeTaskComplexity`, `assignTasksToAgents`, `recommendStrategy` | Call the trunk. Pass priority, estimate, dependencies, and memory boost as context, not as a second formula |
| `src/mcps/orchestrator/handlers/complexity-handler.ts` | Pass task context through. Recommendations follow the level |
| `src/mcps/orchestrator/server.ts` `analyze-complexity` | Same tool. The handler it calls changes |
| `src/mcps/orchestrator/config/agent-capabilities.ts` `selectAgentForTask` | One switch. Capability score stops assigning |
| `src/nucleus/autonomy-kernel.ts` `buildLeadDevPlan`, `routeSubagent` | One score, not `Math.max`. `routeSubagent` reads the shared task-type table |
| `src/integrations/hooks/skill-seek.mjs` | Import that table. Keep decline |
| `src/integrations/hooks/goggles-pipeline.mjs` `seekHeldCard` | Still calls seek. No sizing |
| `src/integrations/hooks/pre-tool-speak.mjs` `repertoireRoute` | Still calls `scoreAndRoute`. It speaks only when repertoire changes the agent |
| `src/delegation/agent-delegator.ts` `analyzeDelegation`, `determineAgents` | Call the trunk and the switch. Keyword map becomes an input |
| `src/orchestrator/enhanced-multi-agent-orchestrator.ts:380` | Still calls `analyzeDelegation`. The result comes from the switch |
| `src/memory-routing/null-provider.ts` `selectAgent` | Stop mirroring the capability loop |
| `house/live/app/server.mjs` `evalNudges` comment | Match the loop. Do not add a difficulty rung |
| `xray/features.json` | Oscillator keys beside `suit_temperament` and `complexity_thresholds`, when phase 2 adds them. This note does not name a schedule |

Unchanged callers of the trunk, except that they receive one score: tests listed below, `src/nucleus/index.ts` and `src/delegation/index.ts` re-exports.

## Tests that prove it

Phase 1, if the stored tuple changes:

- A new unit locks `getLevelFromScore` at 0, 15, 16, 25, 26, 50, 51, 75, and 100. Expect simple, simple, moderate, moderate, complex, complex, enterprise, enterprise, enterprise. Expect `getStrategyForLevel` and `getAgentCountForLevel` and `getAgentForTier` / `getSkillForTier` for those four levels as in the table above.
- The same unit asserts `thresholds.enterprise` is 100 and that changing it does not change the level. That is the proof the cap is not a fourth edge.
- `src/__tests__/unit/complexity-analyzer-calibration.test.ts` stays a calibration test. Add an assertion that `calibrate({ thresholds })` does not replace the published table used by `getLevelFromScore(score)` with no second argument.
- `src/__tests__/unit/skill-seek.test.ts` stays green and stays unedited.
- `src/__tests__/unit/plates.test.ts` if `docs-site/docs/plates/routing.md` is edited. It lists the routing id and does not lock the drawing text.

Phase 2:

- `src/__tests__/unit/thin-dispatch-extra.test.ts` and `src/__tests__/unit/nucleus-primary.test.ts`: `routeToAgent(10)` is `code-reviewer`; `routeToAgent(20)`, `routeToAgent(40)`, and `routeToAgent(80)` are `architect`. Today they only require a non-empty string.
- `src/__tests__/unit/execution-planner-dependencies.test.ts`: `calculateTaskComplexity` equals `scoreComplexity` for the same task inputs. `analyzeTaskComplexity` on one `implement` task returns the switch's agent. The current assertion that the agent is `backend-engineer` (`:57`) changes if the switch no longer bypasses the score. The replacement assertion is one agent from the switch, not a second formula.
- `src/__tests__/unit/agent-capabilities-routing.test.ts`: a typed task and a scored task agree with the switch. The plane stop, the single-file route, and the repertoire override stay.
- `src/__tests__/unit/autonomy-kernel.test.ts` "uses max(thin-dispatch, MCP)" (`:39`) becomes one trunk score. `routeSubagent('research')` and `routeSubagent('architecture')` still hold, from the shared table. An unknown type's failure has one owner: either the decline (seek) or `backend-engineer` (lead-dev todos), written down once, not two silent defaults.
- `src/__tests__/unit/memory-routing-integration.test.ts`: a repertoire override still replaces the agent and can adjust the score, and the adjusted score's level comes from `getLevelFromScore`.
- `src/__tests__/integration/test-complexity-analysis.test.ts` and `src/__tests__/unit/delegation-gate.test.ts` stay the phase 2 suites when those files change. The gate test proves a deny still sits in front of the rung and does not read `confidence_threshold` as a band.
- `house/live/tests/governor.test.mjs`: a quiet card still nudges, an empty board still trips, and neither path reads a complexity score.

A fixture that fails the merge: one description, one task type, one context. `scoreAndRoute`, `selectAgentForTask`, `routeSubagent`, and `analyzeTaskComplexity` must name the same agent, unless the lens stop or a repertoire override applies. Those two exceptions are asserted on their own.

## Left for later

Phase 3 still waits on phase 2, on whether the escalator rides the routing lens or gets its own card, and on a sweep seam that leaves plan-next-wave, nudge, and tripwire intact. This note does not choose the lens card and does not add a plane.

Oscillator keys are not designed here beyond their seat: the suit feature file, next to `suit_temperament` and `complexity_thresholds`, allowed to move a threshold and to set sweep N. The public line does not describe a schedule.

Ponder's landing, from the packet, stays the reflection page as the file and synthesis as the due gate. This note does not add a reflection store.

Confer stays off unless it is already enabled.
