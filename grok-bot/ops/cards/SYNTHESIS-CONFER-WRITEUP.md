# Synthesis confer write-up

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

Docs only. This card records the old synthesis checkpoint and every Confer entry point still in the tree. It does not enable Confer, does not set `synthesis.enabled`, and does not change code.

Line numbers are from `main` at `27f9ac427` (2026-10-19). The two commits after `b4aa19c3e` only bump the package version. They do not move these lines.

## Sources

| Commit | Date | Subject |
| --- | --- | --- |
| `90cfb0b6e` | 2026-06-19 | feat(nucleus): Synthesis PR1 — slice counter + checkpoint state |
| `2851eb187` | 2026-06-19 | feat(nucleus): Synthesis PR2 — pre-tool gate + Aside spawn |
| `2c51d9562` | 2026-06-19 | fix(synthesis): P0 rewire — surface context, sessionId, success gate |
| `9e1cd9b24` | 2026-06-19 | fix(synthesis): P1 outcome-gated checkpoint completion |
| `441db9bd6` | 2026-06-19 | fix(synthesis): resolve P2 review gaps — turns, todos, meta-inference, inference bridge |
| `a5d3b9066` | 2026-06-19 | feat(confer): auto 3-agent quorum at synthesis checkpoint |
| `2e3ea9134` | 2026-06-19 | fix(confer): verdict mapping, FAIL gating, architect prompt wiring |
| `7ef5b7547` | 2026-06-20 | feat(pipeline): wire P0–P2 governance and Grok hook pipeline facets |
| `91b00ecda` | 2026-08-22 | feat(v3): suit temperament — constitution always on, ceremony by host |
| `16d663569` | 2026-08-22 | fix(v3): frontier spawn-todo warn, confer opt-in, constitution in SSOT |
| `7a21cd996` | 2026-09-23 | fix: cursor gate follows the suit mill, not a sibling synthesis checkpoint |
| `8cd356c24` | 2026-09-27 | fix: keep Confer off unless it is explicitly enabled |
| `da8a08936` | 2026-09-27 | fix: let Confer FAIL, and record a no-model abstain as UNREVIEWED |
| `8776562d7` | 2026-09-27 | fix: complete Confer only on a real approve |
| `5134c5d05` | 2026-09-27 | fix: bind Confer receipts to a synthesis cycle |
| `4cf27577c` | 2026-10-13 | fix: confer asks the TUI that already spawned the MCP servers (#243) |

Full hashes for the two seeds: `a5d3b9066b8bd55faae79699c5adb04bd4b6b259`, `7a21cd99636c30c5192ca5778598fb4abc13d76e`.

`htafolla/jelly` is not reachable. `GET https://api.github.com/repos/htafolla/jelly` returned 404 with this credential. The only public name match is `htafolla/jelly-roast-bot`, one commit `bf8a85ad` (2026-01-15, "Initial commit: Jelly Roast Bot"). A code search for `confer_on_synthesis` in that repo returned no hits. History that lived only in a private `htafolla/jelly` repo is unconfirmed.

## Cadence

The counter lives in `src/nucleus/synthesis.ts`. State file: `.xray/state/synthesis-checkpoint.json` (`synthesis.ts:52-54`).

Shipped thresholds, still the factory default (`90cfb0b6e`, and `xray/features.json:173-178`, worn `.xray/features.json` the same, `src/core/features-config.ts:945-950`, `defaultSynthesisConfig` at `synthesis.ts:56-62`):

| Knob | Value | Effect |
| --- | --- | --- |
| `synthesis.enabled` | `false` | `recordExecutionSlice` returns null (`synthesis.ts:190-191`). `evaluateSynthesisDue` returns not due (`synthesis.ts:145-147`). `isSynthesisCheckpointDue` returns false (`synthesis.ts:258`). |
| `every_n_gates` | `12` | A gate count at or above 12 marks due, reason `gate threshold (n/12)` (`synthesis.ts:148-153`). |
| `every_n_turns` | `0` | A zero threshold never trips (`synthesis.ts:154-158`). Turns are still counted when enabled. |
| `every_n_todos_completed` | `0` | Same rule: counted, never the due reason (`synthesis.ts:160-167`). |

Slice kinds (`synthesis.ts:12`, `172-180`):

- `gate` — `evaluatePreToolGate` after the synthesis deny check, and only while the checkpoint is not already due (`src/nucleus/delegation-gate.ts:724-728`).
- `turn` — Grok `user_prompt_submit` (`src/integrations/grok/hooks/session-start.js:105-106` via `recordSynthesisTurnSlice` in `src/integrations/hooks/synthesis-hook-runtime.mjs:45-49`, introduced `d53443647`). Hermes when `recordTurn` or `event === 'user_prompt_submit'` (`src/integrations/hermes-agent/bridge.mjs:862-866` and `900-901`). OpenCode `chat.message` (`src/plugin/xray-codex-injection.ts:449-460`, introduced `441db9bd6`).
- `todo_completed` — `updatePlanTodoStatus` when a non-consult todo completes (`src/nucleus/lead-dev-plan-persistence.ts:363-368`). Synthesis consult todos `s.1`–`s.3` do not count (`lead-dev-plan-persistence.ts:286-292`).

While `synthesisDue` is already true, a further `gate` or `turn` is dropped (`synthesis.ts:199`). A `todo_completed` still increments. The due bit stays until `completeSynthesisCheckpoint` (`synthesis.ts:231-248`). The only production caller of that clear is `tryCompleteSynthesisCheckpointAfterTodo` (`lead-dev-plan-persistence.ts:295-311`). It runs when the checkpoint is due, the persisted plan is a synthesis realignment plan, and every consult todo is `completed`. Side effects after the clear: `runSynthesisCheckpointSideEffects` (`src/nucleus/synthesis-completion.ts:10-33`) refreshes meta-inference and ingests one repertoire feedback row.

A missing `sessionId` records nothing (`synthesis.ts:187`). A checkpoint whose `sessionId` does not match the caller is not due (`synthesis.ts:256-257`).

Cursor hooks do not call `recordExecutionSlice` or `recordSynthesisTurnSlice`. Confirmed by reading `src/integrations/cursor/hooks/`. Cursor still reaches the gate counter when its pre-tool hook calls `evaluatePreToolGate` (`src/integrations/cursor/hooks/pre-tool-use.js:99-104`). OpenClaw: no `recordExecutionSlice` / `recordSynthesisTurnSlice` / `confer` hit under `src/integrations/openclaw/`. An OpenClaw slice counter outside that tree is unconfirmed.

Frontier ceremony is `lite` (`src/nucleus/suit-temperament.ts:223-224`). `evaluatePreToolGate` skips `evaluateSynthesisGate` when ceremony is lite (`delegation-gate.ts:718-722`, introduced `91b00ecda`) and still records the gate slice on the next lines. Grok and Cursor default to frontier (`suit-temperament.ts:43-44`). This checkout's `suit_temperament.profile` is `auto` (`xray/features.json:5-12`), so a Grok or Cursor host resolves frontier and does not deny on a due checkpoint. Guided and strict stay `full` and do deny.

## What it did

From `90cfb0b6e` through `a5d3b9066` the checkpoint is a count of work, then a forced reflect.

1. Each allowed pre-tool call, user turn, or finished non-consult todo increments a counter for the session.
2. At 12 gates the state file sets `synthesisDue` and a `dueReason`.
3. While due, `evaluateSynthesisGate` (`delegation-gate.ts:480-554`) denies writes, spawns, and shell. Reads stay allowed. `analyze-complexity` and `get-orchestration-status` stay allowed (`delegation-gate.ts:214-220`). `govern-and-apply` is refused in the orchestrator itself (`src/mcps/orchestrator/server.ts:572-590`) with gate `synthesis-checkpoint`.
4. `analyze-complexity` (`server.ts:342-485`) loads the due session, builds collocated context (`src/nucleus/synthesis-context.ts:77-89`), and asks `ComplexityHandler` to persist a realignment plan.
5. That plan is phase `phase-synthesis` with todos `s.1` researcher, `s.2` architect-tools, `s.3` code-review (`src/nucleus/autonomy-kernel.ts:23-29` and `182-195`). `a5d3b9066` then runs the quorum automatically after the plan persists (`complexity-handler.ts:276-294`).
6. The quorum prompt requires a verdict line of `PASS`, `CONDITIONAL`, or `FAIL` (`confer.ts:168-188`). Seats map to MCP tools (`confer.ts:192-232`): `xray-architect-tools` / `architecture-assessment`, `xray-researcher` / `analyze_proposal`, `xray-code-review` / `analyze_proposal`.
7. A consult todo completes only on verdict `PASS` (`src/nucleus/synthesis-consult-receipt.ts:100-104`). `CONDITIONAL`, `FAIL`, and `UNREVIEWED` block (`8776562d7`, `da8a08936`).
8. When `s.1`–`s.3` are complete for this session and this `consultCycleId` (`5134c5d05`, checked at `confer.ts:537-547` and `lead-dev-plan-persistence.ts:338-349`), the checkpoint counters reset and gated work can resume.
9. Manual retry is `orchestrate-task` with `confer: true` (`server.ts:148-152`, `task-handler.ts:127-149`), added in `a5d3b9066`.

`a5d3b9066` called the three agents inside `runConferQuorum`. `4cf27577c` changed the live host. `SessionConferHost` writes `.xray/state/confer-ask-${todoId}.json` and returns `pending` (`src/nucleus/confer-host.ts:28-64`). `runConferQuorum` then returns status `pending` (`confer.ts:506-514`). The wearing TUI is supposed to call the seat MCP and store the verdict with governance tool `record_confer_receipt` (`src/mcps/governance.server.ts:141-156`, handler `governance.server.ts:359-375`).

The plate says the same shape in one line: a gate, a turn, or a finished todo goes in; due or not due comes out (`docs-site/docs/plates/synthesis.md`). Confer's plate: a synthesis checkpoint goes in; the result is skipped unless Confer is enabled (`docs-site/docs/plates/confer.md`).

## Confer entry points

Every production call site found from `git log -S` on the Confer symbols, then read at `27f9ac427`. Tests and `scripts/mjs/verify-*.mjs` call the same functions and are harnesses, not host entry points.

### Switch and config

| Entry | File:line | What it does |
| --- | --- | --- |
| `defaultConferConfig` | `src/nucleus/confer.ts:77-78` | `{ enabled: false, on_synthesis: false }`. At `a5d3b9066` this was `{ enabled: true, on_synthesis: true }` (that commit's `confer.ts` lines 65-67). |
| `loadConferConfig` / `confer_on_synthesis` | `src/nucleus/confer.ts:89-108` | Opt-in. `confer.enabled === true` or `multi_agent_orchestration.confer_on_synthesis === true` turns it on. `on_synthesis` stays on unless `confer.on_synthesis` is false. A missing key stays off. A thrown JSON parse stays off. |
| `isConferEnabled` | `src/nucleus/confer.ts:111-113` | Reads that config. |
| `runConferQuorum` disabled return | `src/nucleus/confer.ts:366-372` | Status `skipped`, message `Confer disabled in features.json`, when `enabled` or `on_synthesis` is false. |
| `conferDefaultForProfile` | `src/nucleus/suit-temperament.ts:232-234` | Returns false for every profile. `8cd356c24` stopped `loadConferConfig` from calling it. The function remains. |
| Config type | `src/core/features-config.ts:96-98` | Optional `confer_on_synthesis` boolean and optional `confer` object with `enabled` and `on_synthesis`. The comment still says "Auto-run 3-agent confer at synthesis checkpoint". |
| Schema | `xray/features.schema.json:46-57` | `confer_on_synthesis` description: "Opt in to the 3-agent confer quorum. A missing key stays off." At `a5d3b9066` the description said default true. |
| Factory features | `xray/features.json:39-58` | `multi_agent_orchestration` has no `confer` key and no `confer_on_synthesis` key. Worn `.xray/features.json` matches. |
| `conferExplicitlyEnabled` | `src/nucleus/autonomy-kernel.ts:89-103` | Same opt-in test the plan builder uses. |
| CLI | `src/cli/index.ts:138-148` | `0xray confer <on\|off>` runs `scripts/node/confer-switch.cjs`. |
| Switch script | `scripts/node/confer-switch.cjs:4-5` and `53-59` | `on` sets `confer.enabled` and `confer.on_synthesis`. `off` sets both false and `confer_on_synthesis` false. Header: "Synthesis stays untouched." |

### analyze-complexity (automatic)

| Entry | File:line | What it does |
| --- | --- | --- |
| Tool case | `src/mcps/orchestrator/server.ts:342-485` | If `synthesis-checkpoint.json` is due, calls `handleAnalyzeComplexity` with `synthesisCheckpoint: true`, the due reason, collocated text, and `conferFixture` set from `XRAY_CONFER_FIXTURE === '1'` (`server.ts:453-459`). |
| Quorum call | `src/mcps/orchestrator/handlers/complexity-handler.ts:276-294` | After the realignment plan persists, if `isConferEnabled()` and `sessionId` are set, calls `runConferQuorum`. Fixture text is requested only when `conferFixtureAllowed()` is also true (`complexity-handler.ts:290`). |
| Plan builder | `src/nucleus/autonomy-kernel.ts:159-169` | `buildSynthesisCheckpointPlan` returns null unless lead-dev mode is on and Confer is explicitly enabled. With Confer off there is no `s.1`–`s.3` plan to run. |
| Lead-dev consults | `src/nucleus/autonomy-kernel.ts:225-227` | Ordinary phased plans also prepend the three consult todos when Confer is explicitly on and the plan is phased. Those todos are `1.1`–`1.3`, not the synthesis `s.*` todos. |
| In-progress no-op | `server.ts:402-430` | A due checkpoint whose consult todos are unfinished returns the todo list and does not start a second plan. |
| Hint when quorum text is absent | `server.ts:470-476` | Appends a line that Confer runs at the checkpoint. This branch runs only when `result.ok` and the handler text does not already include `Confer quorum`. |

### orchestrate-task (manual)

| Entry | File:line | What it does |
| --- | --- | --- |
| Tool schema | `src/mcps/orchestrator/server.ts:148-156` | Boolean `confer` runs the quorum instead of task execution. `conferFixture` is declared beside it. |
| Handler | `src/mcps/orchestrator/handlers/task-handler.ts:127-149` | `confer === true` and `isConferEnabled()` calls `runConferQuorum` with `dueReason` set to the task description. Disabled returns `Confer disabled in features.json`. |
| No realignment plan | `src/nucleus/confer.ts:375-381` | Quorum status `skipped`, message `No synthesis realignment plan — confer not applicable`. A manual flag does not invent the `s.*` plan. |

### Quorum, asks, seats

| Entry | File:line | What it does |
| --- | --- | --- |
| `conferAgentMcpTarget` | `src/nucleus/confer.ts:192-232` | Seat to server and tool. |
| `invokeConferAgent` | `src/nucleus/confer.ts:256-282` | One seat through the host port. Empty text or an unparseable verdict throws. |
| `runConferQuorum` | `src/nucleus/confer.ts:341-535` | The loop. Live path uses `options.host` or `new SessionConferHost()` (`confer.ts:440`). |
| Fixture wall | `src/nucleus/confer.ts:81-86` and `358-364` | `conferFixtureAllowed()` is `NODE_ENV=test` or `VITEST`. Otherwise fixture mode returns `CONFER_FIXTURE_UNREACHABLE` (`8cd356c24`). |
| Ask file | `src/nucleus/confer-host.ts:48-64` | Writes the ask and returns `pending`. Does not spawn an MCP server (`4cf27577c`). |
| `InProcessConferHost` | `src/nucleus/confer-host.ts:67-76` | Test double. Answers from a map passed by the caller. |
| Researcher seat | `src/mcps/researcher.server.ts:468-472` | `proposalType === "synthesis-confer"` returns `buildHostConferEvidence` and does not vote. |
| Code-review seat | `src/mcps/knowledge-skills/code-review.server.ts:443-447` | Same shape, role `code-review`. |
| Architect seat | `src/mcps/architect-tools.server.ts:164` tool name, `58-78` renderer, `283-284` handler | `architecture-assessment` always formats verdict `UNREVIEWED` (`architect-tools.server.ts:75`). `conferVerdictFromModelVote` (`architect-tools.server.ts:25-31`) is not called by that handler. |
| Architect schema | `src/mcps/architect-tools.server.ts:167-196` | Published input schema has `projectRoot`, `assessmentType`, `focusMetrics`. It does not list `conferPrompt`. The renderer still reads `args.conferPrompt` (`architect-tools.server.ts:66`). Whether the MCP layer drops that field is unconfirmed. |
| Governance record | `src/mcps/governance.server.ts:141`, `181`, `233-234`, `359-375` | `record_confer_receipt` calls `applyConferConsultResult`. |
| Post-tool receipt | `src/nucleus/delegation-gate.ts:778-796` | A matching consult spawn can also record a receipt from tool output and then try to complete the todo. Grok post-tool calls this (`src/integrations/grok/hooks/post-tool-use.js:73-77`). Hermes post phase calls it (`bridge.mjs:881-890`). |
| Todo completion gate | `src/nucleus/lead-dev-plan-persistence.ts:338-349` | A consult todo stays incomplete without a receipt for this session, subagent, and `consultCycleId`, or when the verdict blocks. |
| Checkpoint clear | `src/nucleus/lead-dev-plan-persistence.ts:295-311` | Clears only after those todos are complete. |
| PASS rule | `src/nucleus/synthesis-consult-receipt.ts:100-104` | `consultVerdictBlocksCompletion` blocks every verdict other than `PASS`, and it blocks a null verdict. |

`localConferVote` (`src/governance/local-confer.ts:12-41`) is the no-model abstain used when a normal `analyze_proposal` has no LLM vote (`researcher.server.ts:493-495`, `code-review.server.ts:450-461`). `formatGovernanceVoteText` turns that abstain into verdict `UNREVIEWED` (`local-confer.ts:58-61`). The `synthesis-confer` branch returns before that vote. `security-audit.server.ts:1008` also calls `localConferVote`. It has no `synthesis-confer` branch. It is outside the three quorum seats (`autonomy-kernel.ts:25-29`).

### Session hint

| Entry | File:line | What it does |
| --- | --- | --- |
| `isConferPendingForSession` | `src/integrations/hooks/confer-hook-runtime.mjs:45-48` | Loads `isConferPending` (`confer.ts:154-166`). |
| `readConferReviewHint` | `confer-hook-runtime.mjs:52-70` | Returns `UNREVIEWED` if a `synthesis-consult-*.json` receipt says so. |
| Boot payload | `src/integrations/grok/hooks/grok-hook-utils.js:310-341` | Sets `conferPending: true` and `conferTrigger: 'analyze-complexity at synthesis checkpoint'` when a consult plan is unfinished. `a5d3b9066` added the hint; `2e3ea9134` moved it through this runtime. |

`isConferPending` is false when there is no synthesis realignment plan (`confer.ts:158-159`). With Confer off, `buildSynthesisCheckpointPlan` writes no such plan, so the boot hint stays quiet.

## Why it broke or was disabled

These are separate failures. The flag is off because of the last explicit disable. The earlier ones are why turning the flag back on is unsafe on the current code.

1. The counter shipped dark. `90cfb0b6e` added `synthesis.enabled: false` in `xray/features.json`. The gate and the quorum have no slices to react to until that flag is true.

2. Confer shipped default-on. `a5d3b9066` message: "confer_on_synthesis config (default on)." A missing features file returned `{ enabled: true, on_synthesis: true }`. A present file treated a missing key as on (`enabled !== false`). That is `loadConferConfig` at `a5d3b9066` lines 69-84.

3. Frontier was opted out first. `16d663569` (2026-08-22): strict still forced Confer on; frontier required `confer.enabled === true` or `confer_on_synthesis === true`; other profiles kept the old missing-key-means-on default. Same day, `91b00ecda` made frontier ceremony `lite`, and `delegation-gate.ts:718-722` skips the synthesis deny on lite. A frontier host can count gates and still not stop.

4. A sibling checkpoint denied the Cursor host. `7a21cd996` (2026-09-23): "A leftover synthesis due file on a sibling repo was denying the host because the hook took the first heat root." Before the fix, `pre-tool-use.js` used `heatRoots[0]`. After it, `cursorGateRoot` (`src/integrations/cursor/hooks/cursor-hook-utils.js:266-273`) picks the heat root whose `package.json` name is `0xray`, and uses `heatRoots[0]` only when that mill is absent. `pre-tool-use.js:91` calls it. The commit does not name the sibling path. That path is unconfirmed.

5. Confer was forced off for every profile. `8cd356c24` (2026-09-27) says Confer defaults off for every suit profile, strict does not force it on, a features file with no confer key stays off, `orchestrate-task` with `confer: true` is refused when features omit confer, and `conferFixture` plus `XRAY_CONFER_FIXTURE` cannot write a receipt outside tests. That is the current `loadConferConfig` and `conferFixtureAllowed`.

6. Completing a todo on a fake approve. Same day, three follow-ups:
   - `da8a08936` — a no-model abstain is `UNREVIEWED`, and `FAIL` must be able to fail the quorum.
   - `8776562d7` — complete Confer only on a real approve.
   - `5134c5d05` — a PASS receipt from an older `consultCycleId` must not clear the next `s.N`.

7. The live quorum was calling MCP servers the TUI had already spawned. `4cf27577c` (#243, 2026-10-13) moved the live path to an ask file plus `record_confer_receipt`. A caller that expects `runConferQuorum` to return `completed` in-process gets `pending` (`confer.ts:506-514`).

8. The architect seat cannot PASS on the current renderer. `renderArchitectureAssessment` hardcodes verdict `UNREVIEWED` (`architect-tools.server.ts:75`). `consultVerdictBlocksCompletion` then refuses to complete `s.2`. `conferVerdictFromModelVote` exists and is unused by that handler.

9. Synthesis on, Confer off, cannot clear itself. `buildSynthesisCheckpointPlan` returns null when Confer is off (`autonomy-kernel.ts:166-169`). `tryCompleteSynthesisCheckpointAfterTodo` returns unless a realignment plan exists and its consult todos are complete (`lead-dev-plan-persistence.ts:302-304`). On a guided or strict host, `evaluateSynthesisGate` would keep denying after the 12th gate. On frontier, the deny is skipped and the due bit still sticks, so later gates are not counted (`synthesis.ts:199`). This interaction is what the current functions do. No commit message states it as the reason Confer was disabled.

## What a safe revive has to keep

This card does not do the revive.

- Leave `xray/features.json` and the worn `.xray/features.json` as they are: `synthesis.enabled` false, no `confer` key. `scripts/node/confer-switch.cjs` does not flip synthesis. The two flags are independent, and synthesis-on with Confer-off cannot clear a due checkpoint (item 9 above).
- Keep the opt-in in `loadConferConfig` (`confer.ts:101-104`). A missing key stays off, including strict. `conferDefaultForProfile` staying false matches that.
- Keep `conferFixtureAllowed` (`confer.ts:81-86`). `XRAY_CONFER_FIXTURE=1` on the analyze-complexity path (`server.ts:458`) must keep failing closed outside tests.
- Keep completion on `PASS` only (`synthesis-consult-receipt.ts:100-104`), bound to `sessionId` and `consultCycleId` (`confer.ts:537-547`).
- Keep `SessionConferHost` as the live host (`confer.ts:440`, `confer-host.ts:48-64`). The TUI records through `record_confer_receipt` (`governance.server.ts:359-375`). `InProcessConferHost` stays a test double.
- Keep `cursorGateRoot` (`cursor-hook-utils.js:270-273`). The gate root is the `0xray` package when that root is in the heat set. Using the first heat root is how `7a21cd996` was denying the host.
- Decide the frontier deny before enabling the counter. Lite skips `evaluateSynthesisGate` (`delegation-gate.ts:718-722`) and still records gates (`delegation-gate.ts:724-728`). Enabling `synthesis.enabled` on a frontier host counts to due and does not stop the host. Enabling it on a guided host stops the host, and with Confer still off the stop does not clear.
- Give `s.2` a real `PASS` path before expecting the architect seat to finish. Today `architecture-assessment` returns `UNREVIEWED` (`architect-tools.server.ts:75`). The published schema also omits `conferPrompt` (`architect-tools.server.ts:167-196`).
- Treat a due checkpoint as a count on the session that is already running. The synthesis lens says a due checkpoint does not start a second job. The server no-op at `server.ts:402-430` is that rule in code.
- Prove it with the existing harnesses before a features change: `npm run verify:confer` and `npm run verify:synthesis` (`package.json:141-142`). Those scripts build, then run `scripts/mjs/verify-confer-core.mjs` and the synthesis verify scripts. This card did not run them.

## Unconfirmed

- Private or deleted `htafolla/jelly` history. The public repo 404s. `htafolla/jelly-roast-bot` is a different project and has no Confer code.
- The sibling path that was due in `7a21cd996`. The commit names the bug and the fix, not the path.
- Whether an MCP client drops `conferPrompt` because it is absent from the architect tool schema.
- An OpenClaw slice counter outside `src/integrations/openclaw/`.
- A product decision, beyond the commits above, for when Confer should be turned on. The code says how the off switch works. It does not name a date or an owner for turning it on.
