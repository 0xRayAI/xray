# Oscillator and the per-plane sweep

Research for issue #538, phase 3, and the time side of the routing-terms packet (`grok-bot/ops/cards/ROUTING-TERMS-PACKET.md`, merged in #403). Read from `main` at `02a5ce6b8`. This pull request adds this note only.

The packet's inventory cites older line numbers (`evalNudges` at `server.mjs:910`, `TRIP_MS` at `:1296`, missing handoff at `:968`). The functions have moved. The Bifrost plate (`docs-site/docs/plates/bifrost.md`) matches the lines below. Use these lines.

Phase 2 questions 1–4, 6–8, 10, and 11 stay open. This note answers the time-side questions the packet numbers 5 and 9, and the phase 3 questions 12, 13, and 14. Dichotomy stays Blaze's.

## What this map covers

Everything here sets pace, how many seats or cards get attention, or whether a wake is held. Each row is the trigger, the default, and where it collides with the others.

Suit spawn caps and the Cadence "hold the handle" target are included because they count attention and must stay outside the oscillator.

## 1. Governor tripwire

`house/live/app/governor.mjs`

| Piece | Line | Trigger | Default |
| --- | --- | --- | --- |
| `tripwire` | 16 | Fingerprint changed since the last call | none; one bit of memory |
| `fingerprint` | 10 | Hash of real events plus a watch object. `feed_push` events are dropped (`realEvents`, 6) so a push of the feed cannot trip itself | sha256 |
| `mutedSeats` | 31 | Roster `parked` and `dark` | the caller's fallback |
| `selectStallSeats` | 39 | Seat is in the id list, is not `builder` or `builder-cloud`, and either has an open-line count above 0 or was just prompted. Muted seats stay out unless prompted | — |
| `createClock` / `observe` | 60 / 82 | Same move fingerprint for `tripMs`, and the window is armed | caller passes `tripMs` and `perSeatMs` |
| `start` deadlines | 66 | One deadline per seat, `perSeatMs` apart | caller |
| Stall | 91 | `openCards > 0`. Seats are `openSeats`, or the coordinator if that list is empty. A due plan adds the coordinator if missing | reason `stall` |
| Plan | 98 | No open cards, `planDue`, coordinator set | reason `plan` |
| `start_after` hold | 99 | `scheduled > 0` after the plan check | returns null; not an empty board |
| Burn hold | 101 | No open cards, no due plan, nothing scheduled, `burnQuiet` | reason `quiet`; sets `lastTrip` so it re-arms only after another `tripMs` |
| Empty | 102 | Otherwise, coordinator set | reason `empty` |
| Clear | 83 | Fingerprint changed and a run was active | reason `cleared`; `run` becomes null |
| Hand start | 104 | `startByHand` | reason `cos` |

A due plan does not hide a stall: the stall branch runs first and still adds the coordinator (`governor.mjs:93`).

Wired from `house/live/app/server.mjs`:

| Piece | Line | Default |
| --- | --- | --- |
| `TRIP_MS` | 1656 | `BIFROST_TRIPWIRE_MINUTES`, else 30 minutes |
| `PER_SEAT_MS` | 1657 | `BIFROST_RUN_SEAT_MINUTES`, else 2 minutes |
| `GOV_MS` tick | 1652 | `BIFROST_TICK_S`, else 60 seconds. Floor 200 ms |
| `clock` | 1669 | `createClock` with the saved `clock.json` |
| `governorRun` | 1721 | Each tick: flush the batch, `evalNudges`, `waveBoard`, then `clock.observe` |
| `moveFp` | 1714 | Events with `moves !== false`, plus the ack count |
| `openCards` | 1731 | `liveWorkCount` (live cards that are not the plan card) |
| `scheduled` | 1731 | `scheduledCards` (658): future `start_after` only |
| `wakeRun` | 1703 | On `stall`, `empty`, or `plan`, one inbox line per deadline |
| Who may start by hand | 1658 | `BIFROST_CLOCK_SEATS`, else the coordinator seat |

`observe` does not read difficulty, plane, or score. It reads whether the board fingerprint moved, and the card counts the server passes in.

## 2. Card nudge ladder

`evalNudges` is `server.mjs:1234`. It is the one card path. It also calls the line ladder, the seat ladder, and `evalHandoffs` (1291).

Called from two clocks:

- `governorRun` at 1723, every `GOV_MS` (default 60 seconds).
- `mergedHeader` at 1481, whenever a collector board is present. The header re-merges every 15 seconds (1648) and on ingest.

Constants at 602–604:

| Env | Default | Role in the card ladder |
| --- | --- | --- |
| `NUDGE_L1_S` | 3600 seconds | Live card, not pinned, not waiting, has `last_beat_t`, age at least this. L1 goes to `nudge_to`, else the packet `next owner`, else the card owner, else the coordinator (`1275`) |
| `NUDGE_L2_S` | 1800 seconds | Not a level. A gap added into the first L3 time |
| `NUDGE_L3_S` | 7200 seconds | Repeat to that same L1 seat. First repeat at L1 time plus L2 plus L3. Later repeats every L3 (`1283`) |
| `HELD_MAX_S` | 72 hours | A `held` card past this gets one nudge, level 0, to the hold owner (`1251`). It does not step L1–L3 |

Skips:

- Plan cards (`1249`). The scheduler owns their beat.
- `cardNoNudge`, closed or merged items (`1250`).
- A buffered batch (`batch.inBeat`, `1261`) ends open card nudges and does not raise L1. Lexicon **cloud batch** says the same thing.
- Future `start_after` parks the card inside `applyStartAfter` (`1187`) before the ladder. Parked cards are not `live`, so the L1 test fails.

The comment at `1230` still says L2 goes to the coordinator 30 minutes after L1, and that L3 repeats every 2 hours to that owner. The code does not write a level-2 card nudge, and it does not retarget the coordinator. OP-PROC **Nudge** (`grok-bot/OP-PROC.md:21`), the lexicon nudge row (`grok-bot/LEXICON.md:146`), and the Bifrost plate agree with the code: L1 to the next owner or the card owner, L3 repeats to that seat, the coordinator is not woken to reassign. Phase 3 must not revive the comment.

`nudgeToCloud` (`1029`) copies a builder nudge into the builder-cloud inbox. `selectStallSeats` never wakes `builder` or `builder-cloud` (`governor.mjs:45`). A nudge can land on a seat the stall clock will not call.

## 3. Unacked-line ladder

`nudgeLines` at `server.mjs:766`, constant `NUDGE_LINE_MS` at 765.

| | |
| --- | --- |
| Trigger | An open inbox line (unacked, not done, card not closed) older than the window |
| Default | `NUDGE_LINE_S`, else 900 seconds |
| Levels | L1, then L2, then L3, on that same seat, one window apart. Stops at 3. Does not use `NUDGE_L2_S` or `NUDGE_L3_S` |
| Wake | `noteWake` on that seat with reason `nudge L{n}` |
| Close | Ack, or the line leaves the open set |

Muted seats are already absent from `openLines` (`726`), unless a prompt in the last 10 minutes unmuted them (`PROMPT_WORK_MS`, line 2).

This ladder has three rungs. The card ladder has two records (L1 and repeating L3) and uses L2 only as a wait. Same word, different shape.

## 4. Missing handoff

`missingHandoffs` is `house/live/app/handoff.mjs:260`. `evalHandoffs` is `server.mjs:1320`.

| | |
| --- | --- |
| Trigger | `handoffObligations` (`226`) has a current kind, the age is at least `l1ms`, and no inbox packet covers that kind, seat, repo, number, and sha (`packetCovers`, `211`) |
| Wait | `NUDGE_L1_MS` (the card L1, default 3600 seconds), passed as `l1ms` at `1322` |
| Kinds | `handoff.mjs:77`: `ready` (author owes, reviewer receives), `critic_fail` (reviewer owes, author receives), `merge` (author owes, merger receives), `live_pass` (merger owes, reviewer receives), `ci_fail` (merger owes, author receives). Roles come from `inbox-roles.json` `handoffs`, not from names in the file |
| Ladder | L1 at once when due (`1330`). L2 to the same owing seat after `NUDGE_L2_MS` (`1338`, via string `escalation`). L3 after `NUDGE_L3_MS` from L2, then every L3 (`1344`) |
| Wake | L1 and L2 call `noteWake`. The L3 push at `1350` does not |
| Skip | Owing seat not in `SEAT_IDS`. A future `start_after` on the card (`1327`) |
| Clear | The obligation leaves the due set (a covering packet, or the walk no longer current) |
| Room posts | Not inbox lines, so they never cover the miss (`handoff.mjs` header) |

The handoff ladder writes L2. The card ladder does not. Binding one `wait_s` to both will change handoff L2 and the card's first L3 gap together. That coupling should be explicit in the test, not an accident.

`via: 'escalation'` on the handoff L2 (`1339`) is a label on a nudge record. It is not the incident escalator in `src/postprocessor/escalation/EscalationEngine.ts`, and it is not a difficulty rung.

## 5. Seat quiet, silent seats, wake gate

Three more attention holds sit on the same tick as the ladders.

| Piece | Line | Trigger | Default |
| --- | --- | --- | --- |
| Wake quiet | `WAKE_QUIET_MS` `server.mjs:380`, `wakeBoard` `382` | No good wake POST within the window (or since boot if none) | `BIFROST_WAKE_QUIET_MINUTES`, else 240 minutes |
| Seat nudge | `nudgeSeats` `791` | No route, a refused GitHub login, or wake quiet. One open nudge on that seat. Not a coordinator wake | level 1 |
| Silent seat | `SILENT_MS` `1368`, `evalSilent` `1369` | Seat owns live work or an open nudge, and merged presence is older than the window, and the seat is not marked working. Runs only with a fresh box view (`1486`) | `SILENT_S`, else 7200 seconds. Nudge level 2, kind `silent` |
| Wake gate | `house/live/app/wake-gate.mjs` `wakeConfig` `15`, `gateLine` `203` | Every inbox wake except ladder lines | see below |
| Ladder bypass | `isLadder` `65` | `timed_run`, id prefix `clock:`, reason starting `nudge L`, `L3 no move`, `handoff missing`, or `L3 handoff` | skips the hour cap and the kind cooldown. Still waits out an open turn (`210`) |

Wake-gate defaults (`wakeConfig`):

| Key | Env | Default |
| --- | --- | --- |
| paused | `BIFROST_WAKES` of `off`, `0`, `false`, `no` | not paused |
| `batchMs` | `WAKE_BATCH_S`, else `WAKE_DEBOUNCE_S` | 60 seconds |
| `cooldownMs` | `WAKE_KIND_COOLDOWN_S` | 900 seconds |
| `maxPerHour` | `WAKE_MAX_PER_HOUR` | 6 |
| `turnOpenMs` | `LIVE_TURN_OPEN_MIN` | 20 minutes |
| `statMs` | `WAKE_STAT_H` | 24 hours |

Server wake delivery, separate from the gate (`343–350`): coalesce 50 ms (`WAKE_COALESCE_MS`), debounce 60 s, 3 attempts, retry 400 ms, stagger 1500 ms between seats.

`TURN_OPEN_MS` (`server.mjs:1`) is the same 20 minutes for GitHub working marks (`1818`) and for clearing an ended turn. A prompt pulse is 10 minutes (`PROMPT_WORK_MS`, line 2) and unmutes a parked seat for that long (`1686`).

`BIFROST_WAKES=off` pauses ordinary wakes. Ladder lines are still classified as wakes (`isLadder`). The pause is checked again in `offerLines` (`429`) before `gateLine`, so a paused board drops those too. An off switch stops the doorbell. It does not stop `evalNudges` from recording the nudge.

## 6. Wave schedule (#400)

`house/live/app/wave-schedule.mjs`. On main via `cc0ffabc8`. Tests in `house/live/tests/wave-schedule.test.mjs`.

| Piece | Line | Trigger | Default |
| --- | --- | --- | --- |
| `BURN_QUIET` | 12 | `burnQuiet` (`155`): weekly burn number ≥ this | 0.75 |
| `DEFAULT_WINDOW` | 11 | Chicago cron stored on the plan card | `0 9 * * 1` (Monday 09:00 America/Chicago) |
| `PLAN_EXPIRE_MS` | 13 | Plan age from `raised_at` | 7 days |
| `liveWorkCount` | 51 | Cards with `state === 'live'` that are not the plan card | — |
| `scheduleWaves` | 589 | A real seeded wave is closed (`planFrom`, `261`) | one card, title `plan next wave`, owner the coordinator |
| Plan beat refresh | `nudgeMs` `593`, `refreshPlan` `301` | Same backlog and the beat is older than `nudgeMs`, or the backlog changed | 60 minutes |
| Burn suppresses a new plan | 605 | `burnQuiet` true | `fresh` is null. An open plan gets `last_beat_t` set to now and its flag cleared (`620`) |
| Due flag | 628 | `due_at` passed, no unseen card, not quiet | flag `nothing carded` (`PLAN_FLAG`, line 10). Sets `planDue` |
| Expire | 623 | Age ≥ `expireMs`, and the wave on an expired plan is not raised again (`614`) | state closed, stage done, flag `expired` |
| `acceptWaveCards` | 658 | Empty collector payload while the feed is stalled or older than the stall window | keep the previous cards |

Server join:

- `weeklyBurnFraction` (`1047`) reads `BIFROST_WEEKLY_BURN`. Empty or invalid is 0. A number above 1 is divided by 100, so `75` and `0.75` match. OP-PROC **Tripwire** (`:20`) and the lexicon tripwire row (`LEXICON.md:145`) say the same.
- `waveBoard` (`1061`) calls `scheduleWaves`.
- `publishBoard` (`1138`) and `governorRun` (`1724`) both run it.
- `governorRun` passes `burnQuiet(weeklyBurnFraction())` into `clock.observe` (`1731`).

`paceHolds` in `house/live/app/pr-batch.mjs:12` is a second reader of the same cliff. It holds a batch flush when `house/ATTENTION_STATE.md` matches "over pace", or "weekly burn" at 75% or more, or "pipe down" near "full". A hotfix skips the hold. The file on disk in this checkout (`house/ATTENTION_STATE.md`) is a 2026-09-25 mirror and does not contain those phrases, so this checkout's batch gate is open unless the deployed file differs. The env fraction and the attention-file text can disagree: one can be under 0.75 while the file still says the week is full.

## 7. Button-up, speech quiet, and the other quiets

These share the word and must not share a setting.

| Name | Where | What it holds | Default |
| --- | --- | --- | --- |
| Button-up | Lexicon **button up**, `grok-bot/LEXICON.md:189` | The burn cliff. Seats stop new work, run no local build or deploy, pause the inbox wake until reset, leave cloud agents for essential work | the hold line is the 0.75 above |
| Burn quiet | `burnQuiet` `wave-schedule.mjs:155` | Empty-board wake, new plan card, due flag, batch flush when the attention text matches | 0.75 |
| Speech quiet | Lexicon **quiet**, `LEXICON.md:179`. OP-PROC **You first**, `:48` | Say nothing when the line only repeats CLOSED, MERGED, or LIVE | a speech rule, no timer |
| Wake quiet | `server.mjs:380` | A seat nudge when the webhook has been failing | 240 minutes |
| Feed quiet | `feedQuiet` `server.mjs:2207` | `/healthz` only. Collector file older than `COLLECTOR_STALE_S` | 180 seconds |
| Card lag | `CARD_BEHIND_S` `2253` | `/healthz` when open-card data is ahead of the board | 180 seconds |
| Active window | `WINDOW_MIN` `141` | Seat `active` chip | 15 minutes |
| Box stale | `BOX_STALE_MS` `135` | Box working marks drop | 180 seconds |

Button-up is the cliff. The oscillator does not replace it. Speech quiet is the speech rule. The oscillator does not replace it. Feed quiet is a collector health bit. The sweep does not read it.

## 8. Park, mute, and one-cloud caps

| Piece | Line | Effect |
| --- | --- | --- |
| `start_after` | `server.mjs:1181` and `610` | ISO with a Chicago offset, at most 30 days out. Future time sets `state: 'parked'`, `stall: false`. Not an open card. Not a nudge. Counted by `scheduledCards`. At the time, one inbox line, woken once |
| Roster mute | `loadMutedSeats` `1672`, fallback `PARKED_QUEUE` `1611` | `herald`, `magnet`, `nibbler`, `sound` when the roster has no `parked` or `dark` arrays. Out of `openLines` and out of stall seats unless prompted in the last 10 minutes |
| Arch1 queue day | `queueStale` `1617` | Lines whose title or id mentions arch10x, from a previous Chicago day, leave the open queue |
| One cloud per card | OP-PROC **Clouds + churn**, `:53`. Board rows `server.mjs:1491` | One worker, then that PR's critic. Wake runs do not launch. `prBusy` (`845`) treats a running cloud row as busy so the batch stays in beat |
| Spawn governor | `src/orchestrator/agent-spawn-governor.ts` class at `52`. Limits from `xray/features.json` `agent_spawn` `134` | Suit cap: `max_concurrent` 8, `max_per_type` 3, cooldown 500 ms, 20 per minute. Also `multi_agent_orchestration.max_concurrent_agents` 3 (`features.json:42`). Not a board clock |
| Cadence handle | `grok-bot/CADENCE.md:13` rule 5 | Soft target: 3 to 5 operating parameters, 10 at most, same target for open threads and board rows. Not a gate. No function in the governor |
| Cadence staleness | `CADENCE.md:46` rule 6 | Flag a card after 2 working days, escalate to Blaze after 5. Not implemented in `evalNudges` or `observe` |
| 72-hour park | OP-PROC **Beat**, `:15` | "A live pull request with no beat for 72 hours parks." The server's 72-hour number is `HELD_MAX_S`, and it nudges a card that is already `held`. It does not set `parked` on a `live` card |

`live`, `parked`, and `closed` are the lexicon states (`LEXICON.md:39`). `held` is also a state the server branches on. A sweep park has to be the lexicon `parked`, with a reason that is not `start_after`, or `scheduledCards` and `liveWorkCount` will both treat it wrong (section 11).

## 9. Station and wake routines

Two boots. OP-PROC **Station boot** (`grok-bot/OP-PROC.md:18`) says a chat turn uses station and does not also run wake step 0. A webhook wake uses the routine and does not also run station.

| Routine | Where | Pace effect |
| --- | --- | --- |
| Station card | `.xray/state/STATION.md`, writer `formatStationMarkdown` in `src/integrations/hooks/station-hook-runtime.cjs`. Plate `docs-site/docs/plates/station-card.md` | One ticket. Intent stays. The plan is the next cut. Not a board scheduler |
| `wakeOrder` | `station-hook-runtime.cjs:1505` | On a compact or a host change: `continue`, `repair`, `stop`, or `start`. Same intent continues. A different intent stops. This is the suit's wake, not a seat inbox wake |
| Cascade line | `formatCascadePointer` in `src/integrations/hooks/wake-cascade.cjs:68` | `Cascade: record-map · notes N current`. Planes in that file (`14`) are `record-map`, `station-card`, `notes-page`, `memory-recall`. It is the lens handoff for one session. Heat writes it. It is not a board field |
| Centrifuge | plate `docs-site/docs/plates/centrifuge.md`. Mark `wakeOrder` | One wake is one turn. Goggles looks and does not spin |
| Seat wake | `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` | Claim, inbox, ack, handoff. Step 4: do not launch or resume a cloud when the day is over pace or weekly burn is at 75% or more, except a hotfix. A webhook wake never launches a cloud. Empty inbox skips the middle steps |
| Attention file | `house/ATTENTION_STATE.md`, read by `attentionNow` (`server.mjs:837`) and by the wake before a launch | What needs the owner. `paceHolds` parses it. The oscillator does not own this file |
| Profile planes vs goggles planes | OP-PROC `:18` and the station plate: fleet `Plane:` is core, integration, ecosystem, distribution, or live. Goggles answers dev, integration, domain, ecosystem (`docs-site/docs/plates/goggles.md`). Refused names in `src/integrations/hooks/goggles-planes.json:2`: dichotomy, syncopate, synthesis, digest, triage, loop | The sweep walks the four goggles planes. It does not walk the fleet profile list, and it does not walk a refused name |

`thingOfPath` / `PATH_OWNER` in `src/integrations/hooks/goggles-pipeline.mjs` (see `docs/research/SEEK-MAP.md` section 2) already place a file on one plane. Board cards do not store a plane today. The sweep has to derive one, or skip the card.

## 10. Where they overlap

| Overlap | What actually happens |
| --- | --- |
| Card L1 is 60 minutes. Tripwire is 30 minutes. Plan beat refresh is 60 minutes. Silent seat is 2 hours. Wake quiet is 4 hours. Held nudge is 72 hours. Line ladder is 15 minutes | Seven clocks. Only the card L1, the handoff wait, and the plan refresh share 60 minutes, and the plan refresh does not call `evalNudges` (plan cards are skipped) |
| Comment at `server.mjs:1230` vs the code at `1283` | Comment sends L2 to the coordinator. Code and the public nudge line do not. Wiring from the comment would page the coordinator again |
| Card ladder vs line ladder vs handoff ladder | Card: L1 then repeating L3, no L2 record. Line: three levels, 900 seconds, then stop. Handoff: L1, L2, L3 on the owing seat, using L2 and L3 seconds. One `wait_s` cannot mean all three without a written binding |
| `burnQuiet` vs `paceHolds` vs the wake routine | Same 75% cliff, three readers (env fraction, attention-file text, the wake's launch ban). They can disagree |
| Sweep park vs `liveWorkCount` vs `scheduledCards` | `live` counts for the stall. Future `start_after` counts as scheduled and blocks the empty wake. A new `parked` that is neither `live` nor `start_after` makes `openCards` 0 and `scheduled` 0. The next armed window takes the empty path (or `quiet` if burn is high, or `plan` if a plan is due). That is an empty-board wake the sweep caused |
| Sweep beat vs nudge vs tripwire | Changing `last_beat_t` ends the card nudge (`1246`). A feed event with `moves !== false`, or an ack, changes `moveFp` and clears a running trip (`observe` `83`). A sweep that writes either one clears the time side. The packet says a pass does not clear a stall |
| Sweep vs burn quiet | `observe` skips only the empty wake. Open cards still stall while burn is high. Button-up says seats stop new work at that line. A sweep step during that week is new work |
| Sweep vs plan-next-wave | `scheduleWaves` raises, expires, and flags one coordinator card. A sweep that calls it, or that refreshes that card's beat, can clear `nothing carded` or hide a due plan. The packet says a due plan survives a pass |
| In-beat batch vs L1 | A buffered PR suppresses card L1. A sweep that still selects that card double-assigns a card the ladder is holding |
| `mergedHeader` vs `governorRun` | Nudges and `scheduleWaves` already run on ingest and on the 15-second header, and again on the 60-second tick. A sweep on the header path would run many times a minute |
| Goggles vs the sweep | A look holds one plane and does not spin (`centrifuge` plate, `goggles` plate). The sweep is the rotator. Putting the pass inside `lensBeforeResearch` would make a search spin the planes |
| Station `Cascade:` vs a finding moving to the next plane | One line, one session, memory planes only. A board pass that writes it overwrites the lens handoff |
| Spawn caps vs N | 8, 3, and the soft 3-to-5 are suit or cadence counts. N is cards per plane per pass. They answer different questions. The oscillator does not write `agent_spawn` |
| Fleet planes vs goggles planes | Two lists share the word plane. A sweep that walks core, distribution, or live is walking seats, not the four look planes |
| Packet inventory "then CoS" | Stale, same as the `1230` comment. Current law is the nudge stanza |

## 11. Oscillator

One object in the suit feature file. It moves rungs and sets N, pace, quiet, and wait. It does not grow a second table of timers.

Place it in `xray/features.json` immediately after `suit_temperament` (`:5`) and beside `complexity_thresholds` (`:144`). Add the same property to `xray/features.schema.json`. Wear already copies the feature file; no new settings file.

```json
"oscillator": {
  "n": 2,
  "pace_s": 3600,
  "wait_s": 1800,
  "quiet": "burn",
  "rungs": null
}
```

| Key | Default | What it is allowed to move | What it leaves |
| --- | --- | --- | --- |
| `n` | 2 | Cap for one sweep pass on one plane. The packet's "about two get attention" | Spawn caps, Cadence 3-to-5, `max_concurrent_agents` |
| `pace_s` | 3600 | Card L1 (`NUDGE_L1_S`) and the sweep's own period and cold cutoff. A card is cold when its beat is at least this old | Tripwire minutes, line spacing, silent, wake quiet, held 72 hours |
| `wait_s` | 1800 | The card gap that is today `NUDGE_L2_S` (first L3 delay) and the handoff L2 delay (`NUDGE_L2_MS` in `evalHandoffs`) | `NUDGE_L3_S` (7200) and `NUDGE_LINE_S` (900) stay env |
| `quiet` | `"burn"` | `"burn"` means the sweep and the empty-board wake follow `burnQuiet` / button-up. `"off"` means do not hold the sweep for burn (the empty-board wake still follows `burnQuiet`, because that cliff is not this key) | Speech quiet. Wake-quiet minutes. Feed quiet |
| `rungs` | `null` | `null` leaves `complexity_thresholds` alone. An object may set `simple`, `moderate`, and `complex` only. Those are the band edges `getLevelFromScore` already applies (15, 25, 50). Enterprise stays 100 as the top of the published table, not a fourth cutoff | Temperament (`suit_temperament`). `delegation.confidence_threshold` (0.5). Incident thresholds |

`pace_s` and `wait_s` are seconds, matching `NUDGE_L1_S` and `NUDGE_L2_S`. The board process does not read `xray/features.json` today. Phase 3 reads the object at the governor tick and, when a key is absent, keeps the env default. Env still overrides a deployed board that has no feature file, so a house without the suit does not change pace.

The public line stays the packet's line: oscillator changes pace and wait through the suit's feature settings. This note is the only place the keys are named. Plates do not gain a schedule description.

Rung moves are phase 2's job (one scorer, then the settings may move an edge). Phase 3 may land `n`, `pace_s`, `wait_s`, and `quiet` first. `rungs` stays `null` until that wiring exists. A non-null `rungs` before the single scorer would add a third cutoff table.

## 12. Per-plane sweep

Does not fold into `wave-schedule.mjs`. They are not one pass.

| | Plan next wave | Sweep |
| --- | --- | --- |
| Trigger | A real seeded wave is closed | Governor tick, and `pace_s` since the last pass |
| Result | One coordinator card | Up to N cold cards on one plane, each stepped or parked |
| Burn | Suppresses the plan and the empty wake | Skips the pass when `quiet` is `"burn"` and `burnQuiet` is true |
| Stall | Does not clear `moveFp` | Must not clear `moveFp` or a card beat |
| Module | `wave-schedule.mjs` | a new `house/live/app/sweep.mjs` |

`scheduleWaves` is already the wave machine: cron, expiry, branch attachment, seed retain. Folding the sweep in would let a cold-card pass refresh plan beats (`refreshPlan`) and clear `nothing carded`. The shared piece is the predicate `burnQuiet` and the tick `governorRun`, not the module.

### Pass

1. `governorRun` calls the sweep after `clock.observe`, never from `mergedHeader` or `publishBoard`.
2. If the last pass was under `pace_s` ago, return.
3. If `oscillator.quiet` is `"burn"` and `burnQuiet` is true, return. The empty-board wake is already held. The sweep stays off for the whole cliff, including a board that still has open cards, so a step cannot sneak past button-up.
4. Plane order is dev, integration, domain, ecosystem. The cursor lives beside the clock (`sweep.json` in the same state dir as `clock.json`), not on the station card. The next pass starts at the next plane. A restart continues there.
5. A plane with no cold card is skipped. The cursor still advances.
6. Cold means `state === 'live'`, not a plan card, not pinned, not in beat (`batch.inBeat`), not a future `start_after`, beat older than `pace_s` (missing beat counts as cold).
7. Plane of a card comes from `thingOfPath` on the card's files. No file, or a refused name: skip, do not park.
8. Oldest beat first, at most `n`. One busy plane cannot take another plane's cap. There is no second budget for the whole rotation (question 14).
9. Each chosen card is handed to an injected `seek` function. The board module does not import the suit. A decline, or a seek that names no step, parks the card. Otherwise the result is one step: the escalator's next owner and next step, recorded on the card as a sweep mark.
10. The mark is not `last_beat_t` and not a feed event. Nudges and `moveFp` stay as they were.
11. Park sets `state: 'parked'` and `park_reason: 'sweep'`. It does not write `start_after`.
12. `governorRun` counts sweep-parked cards in the `scheduled` number passed to `observe`, next to future `start_after`. They are not `openCards`. A board of only those cards does not take the empty path (`observe` returns null when `scheduled > 0`, after the plan check). A due plan still wins, because the plan branch is before the scheduled check. Live cards that were not parked still count, so a stall with remaining live work still fires.
13. The pass does not call `scheduleWaves`, does not edit the plan card, and does not change the fingerprint. An active `run` therefore survives the pass.

Seek stays the cheap-first choice. The sweep calls it once per chosen card, on the plane the pass is holding. The escalator, once phase 2 has one, assigns the owner. Until that wiring, the step mark stores the seek result and the current owner, and does not invent a second who-table.

Scope rank, on `goggles-planes.json`: the `scope` array stays unranked and gains no fifth string. Add `scope_rank` as that array reversed. Narrow to wide is that reversal. The sweep does not look at scope. Phase 2's rung widen reads `scope_rank`. Goggles still looks at one plane.

### Cascade

Do not write the station `Cascade:` line. `formatCascadePointer` is the session lens handoff (`record-map` and the notes count). A board pass that writes it fights heat and is invisible on `GET /cards`.

The rotation is the cursor in `sweep.json`. A finding is seen on the plane the pass held. The next pass holds the next plane. That is the move. No second cascade word. `docs-site/docs/plates/station-card.md` stays as drawn. Goggles and centrifuge stay as drawn: goggles looks, the sweep is the thing that rotates, and the sweep is not a goggles search.

## 13. Lens question

The escalator rides the routing lens. It does not get its own card.

- The scale is already the drawing on `docs-site/docs/plates/routing.md`: the four bands and `routeToAgent`. Phase 1 draws thresholds there either way.
- The routing card is already in `.xray/state/LENS.md` (integration plane, file `src/nucleus/thin-dispatch.ts`, plates orchestration and processor). A lens card is not a plane. The four planes stay.
- A new card would be a new plate, a new `goggles-planes.json` entry, and a new skill. That splits the score from the scale it climbs. Stamp-plate says stamp one plate only for a card that has none. This one has one.
- Arch1 on #538 (comment from @arch10x, 2026-10-21) answered the same way: ride the routing lens, no fifth plane. This note agrees.
- `src/__tests__/unit/plates.test.ts` lists the routing id and does not lock drawing text. It gains a case only if a new plate is stamped. It does not, so that test stays unedited.

Phase 3 adds the sweep sentence to the routing plate: a pass visits one plane and leaves a chosen card one step along or parked. N comes from the oscillator. No schedule mechanism on the plate.

## 14. Files and tests

Phase 3, after phase 2 and after this note. No new plate.

| File | Change |
| --- | --- |
| `house/live/app/sweep.mjs` | New. Pure pass: plane cursor, cold set, cap N, seek injection, step or park. No cron, no plan card, no fingerprint |
| `house/live/app/server.mjs` | `governorRun` calls it after `observe`. Counts `park_reason: 'sweep'` in `scheduled`. Does not call it from `mergedHeader` |
| `house/live/app/governor.mjs` | No change to `observe` if the server passes `scheduled` correctly. Add a unit only if the empty path needs a named reason for "held by sweep park" |
| `xray/features.json` | `oscillator` object as above |
| `xray/features.schema.json` | The same property |
| `src/integrations/hooks/goggles-planes.json` | `scope_rank` = reverse of `scope`. `scope` unchanged |
| `docs-site/docs/plates/routing.md` | Sweep sentence and that N is per plane per pass. Bands stay |

Not in this change: `wave-schedule.mjs` (left whole), `station-card.md`, `goggles.md`, `centrifuge.md`, a new plate, seek behavior, `skill-seek` tests.

| Test | Locks |
| --- | --- |
| `house/live/tests/sweep.test.mjs` (new, `node:test`, same style as the wave tests) | N is per plane: a plane with more than N cold cards yields N, oldest first. The other planes are untouched. A full rotation can reach 4N, one plane per pass. Each chosen card is `step` or `parked`. A decline parks. A plane with nothing cold is skipped and the cursor advances. `park_reason` is `sweep` and `start_after` is absent. `last_beat_t` is unchanged. No feed event is returned |
| `house/live/tests/wave-schedule.test.mjs` (extend) | A fixture with a due plan card, run through `sweep` then `scheduleWaves` with the same inputs, keeps `planDue`, the plan title, and the flag. The sweep module does not export `scheduleWaves` |
| `house/live/tests/governor.test.mjs` (extend) | Same fingerprint, inside the trip window: `observe` does not return `cleared` and the run stays. `burnQuiet` still returns `quiet` on an empty board. `scheduled > 0` with `openCards` 0 and no due plan returns null, not `empty` |
| `src/__tests__/unit/goggles-pipeline.test.ts` (extend) | `scope_rank` is the reverse of `scope`. Length 4. Refused names are not in the sweep plane list. The four sweep planes are dev, integration, domain, ecosystem |

A features loader test does not exist (`src/__tests__/unit/features-config.test.ts` is absent). Add a small unit next to the loader that reads the oscillator defaults: `n` 2, `pace_s` 3600, `wait_s` 1800, `quiet` `"burn"`, `rungs` null, and rejects a rung key other than `simple`, `moderate`, `complex`.

`src/__tests__/unit/plates.test.ts` stays unedited.

## 15. Answers the packet asked this pass to record

5. The stall clock joins the scale as the time side of the same card. Thresholds are difficulty rungs. Nudge, tripwire, and the governor do not read the score. They read the beat and the board fingerprint. Pace and wait move the nudge spacing. Tripwire minutes stay the board env. The words stay distinct.

9. Oscillator keys sit in `xray/features.json` after `suit_temperament` and beside `complexity_thresholds`, schema included. The public line does not describe a schedule.

12. The escalator rides the routing lens. No new card. No fifth plane.

13. The sweep does not write the station `Cascade:` line. The cursor in `sweep.json` is the rotation. One word stays on the station card and keeps its meaning.

14. N is per plane per pass. Confirmed. There is no second cap for the whole rotation. One pass holds one plane, so attention at once is N.

## Out of this note

- No code, no lexicon edit, no plate edit.
- Dichotomy. Blaze supplies the gloss or retires the name.
- Which scorer is the trunk, and which picker the rung switch drives. Those are the phase 2 seam.
- Patent-sensitive names. They stay in the packet's kept-out list and are not repeated here.
