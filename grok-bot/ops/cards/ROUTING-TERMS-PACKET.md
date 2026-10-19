# Packet: routing terms

Backlog card for one routing system. This file is the whole change. Lexicon, plates, and code stay as they are until a later phase on this same card.

The deep-seek reference agent that opened this card keeps it for the life of the card. Do not hand the card off.

## Packet

- goal: Amalgamate the complexity analyzer, the routing tiers, the stall clock, and the new terms into one routing system. Escalator is the scale. A threshold is one rung on that scale.
- constraints: Packet only in this PR. Public lines stay free of patent-sensitive mechanism. Seek behavior stays. Sizing stays on the routing plate. No second word for the scale. No separate role-picker entry. Dichotomy stays an open question for Blaze. Do not recreate the missing planes file.
- path: Phase 1 writes the lexicon and makes the cutoff numbers agree. Phase 2 wires the system after the open research on this card is answered. This PR lands only `grok-bot/ops/cards/ROUTING-TERMS-PACKET.md`.
- acceptance: The card states the settled terms, the public one-liners, the open research, the confer gate before code, the two phases, the files and plates, the tests, and what stays out. A later phase 1 PR matches those lines and one threshold table. A later phase 2 PR wires one system.
- gates: This PR is the card. Phase 1 later takes A and C (CI green, docs match the table and the lines). B and D stay off (no pack, no publish). Phase 2 does not start until the research listed here is answered on this card.
- evidence: Read of `grok-bot/OP-PROC.md`, `grok-bot/LEXICON.md`, `grok-bot/CADENCE.md`, `src/integrations/hooks/goggles-planes.json`, `src/delegation/complexity-core.ts`, `src/delegation/complexity-analyzer.ts`, `src/nucleus/thin-dispatch.ts`, `src/mcps/orchestrator/execution/execution-planner.ts`, `src/mcps/orchestrator/handlers/complexity-handler.ts`, and the plates named below. `PLANES-2026-09-28.md` is absent from the tree, from `origin/main`, and from git objects.
- next owner: deep-seek reference agent for this card. Do not hand off.
- escalate: Blaze, for the dichotomy gloss and for any capital call. The card stays with the reference agent.

Plates read: `docs-site/docs/plates/routing.md`, `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/orchestration.md`, `docs-site/docs/plates/temperament.md`, `docs-site/docs/plates/suit-settings.md`, `docs-site/docs/plates/synthesis.md`, `docs-site/docs/plates/reflection-page.md`, `docs-site/docs/plates/confer.md`, `docs-site/docs/plates/station-card.md`, `docs-site/docs/plates/goggles.md`, `docs-site/docs/plates/glossary.md`, `docs-site/docs/plates/centrifuge.md`, `docs-site/docs/plates/review.md`, `docs-site/docs/plates/grokbot.md`.

## Settled terms

Escalator is the scale. Blaze's phrase is "escalating scales of evaluation": the whole ladder of thresholds that work climbs by difficulty. Threshold is one rung, one cutoff, on that escalator. The lexicon does not add a second word for the scale.

Role picker is the switch at a rung. It names the seat or agent that does the work at that cutoff. It is a clause of the escalator entry, not its own row.

Seek stays the cheap-first skill choice. Its behavior stays. Its public line drops the held-card clause. The sizing pass stays on the routing plate (`scoreComplexity` / `scoreAndRoute`). Sizing feeds the escalator. It does not become a new meaning of seek.

## Public lines

These are the lines phase 1 may write. They are the public text.

- **escalator** — Escalator is the scale: the whole ladder of thresholds that work climbs by difficulty. At a rung, a switch names the seat or agent that does the work.
- **threshold** — A threshold is one rung, one cutoff, on the escalator. The oscillator may move a rung.
- **oscillator** — Oscillator changes pace, quiet, and wait through the suit's feature settings.
- **ponder** — Ponder is the slow pass after the work that writes one reflection.
- **seek** (replace the public line, leave the behavior) — A cheap-first choice. A branch, then a table, then a score. It declines when nothing matches. It does not call a model. Confer on the result is only a feat or a refactor, and the quorum stays off.

## One routing system

Today the work is scored in more than one place, and the fleet clock is a third machine.

- `scoreComplexity` in `src/nucleus/thin-dispatch.ts` calls `ComplexityAnalyzer` (`src/delegation/complexity-analyzer.ts`, thresholds from `src/delegation/complexity-core.ts`) and `routeToAgent` turns the level into an agent.
- `analyze-complexity` on the orchestrator goes through `ComplexityHandler` into `ExecutionPlanner.analyzeTaskComplexity`, which blends `estimatedComplexity` and does not call `ComplexityAnalyzer`.
- The stall clock is the Bifrost governor (`house/live/app/governor.mjs`): tripwire when nothing moves, nudge L1/L2/L3 when a live card has no beat, tandem as the governor. Drawn on `docs-site/docs/plates/bifrost.md`.

The amalgamation makes these one system. The escalator is the scale the score climbs. Each published cutoff is a threshold on that scale. The rung switch names who works that cutoff. The oscillator is the settings layer that can move a rung, and that can change pace, quiet, and wait. The stall clock is the time side of the same system: how long a rung sits still before nudge and tripwire fire. Ponder is the pass after the work that writes one reflection. Seek still chooses a skill and does not size the work.

## Phase 1 — lexicon and one threshold table

Write the public lines into `grok-bot/LEXICON.md`. Add the escalator clause for the rung switch. Do not add a role-picker row. Do not add a row named scale. Rewrite the seek public line as above. Leave seek code and its tests alone.

Make one cutoff table, and make every published copy use it. These copies disagree today:

- Routing plate (`docs-site/docs/plates/routing.md`): ≤15 single-agent, ≤25 multi-agent, ≤50 orchestrator-led, above that orchestrator-led.
- Routing skill (`.agents/skills/routing/SKILL.md`): at most 15 one agent, at most 25 one agent with tools, at most 50 more than one agent, above that the orchestrator leads.
- `complexity-core.ts` comment: 0–25 simple, 26–50 moderate, 51–75 complex, 76–100 enterprise. `DEFAULT_THRESHOLDS` is 15 / 25 / 50 / 75. `getLevelFromScore` treats a score above complex as enterprise, so 75 is not itself a cutoff.
- `complexity-analyzer.ts` header: simple 15, moderate 25, complex 50+, enterprise 75+.
- `xray/features.json`, `docs-site/docs/guides/features-json.md`, and `docs-site/docs/full-reference.md`: simple 15, moderate 25, complex 50, enterprise 100. The guide maps those to the plate's bands.
- `src/__tests__/unit/complexity-analyzer-calibration.test.ts` uses `enterprise: 100` as sample input to `updateThresholds`. That fixture is not the source of truth.

Phase 1 picks one table before editing. Default proposal, unless Blaze picks another: the bands `getLevelFromScore` already applies (15, 25, 50, and above that enterprise), and `features.json` `enterprise` matches that meaning. Each band edge is a threshold. The ladder of those thresholds is the escalator.

`docs-site/docs/guides/features-since-3.1.md` only names `complexity_thresholds` as tier boundaries. Touch it only if it starts quoting numbers.

Sizing stays drawn on the routing plate. Phase 1 aligns words and numbers. It does not wire the planner or the governor.

## Phase 2 — wiring, after research

After the open questions below are answered on this card, wire one path:

- The score that climbs the escalator comes from one scorer. `scoreComplexity` / `ComplexityAnalyzer` and `ExecutionPlanner.analyzeTaskComplexity` stop being two scores.
- `routeToAgent` and `getSkillForTier` either become the rung switch or stay behind it, once the research says which picker the switch drives.
- Oscillator settings live in the suit feature file and are allowed to move a threshold. Temperament stays the host profile. Button-up stays the one burn cliff. Quiet stays the speech rule.
- Nudge, tripwire, and the governor read the same card the escalator climbed, on the time side. They do not become a second scale.
- Ponder writes one reflection under `docs/reflections` after the work. Synthesis stays the due gate. A reflection stays off the repertoire law file.

## Research still open

Answer these on this card before phase 2 code. The dichotomy question is Blaze's. The reference agent does the rest and records the answer here.

1. Dichotomy is a worn map name in `goggles-planes.json`. A look refuses it. No plate, lexicon, or cadence gloss exists. Blaze supplies the gloss or retires the name. Do not invent one in phase 1.
2. `PLANES-2026-09-28.md` is missing from the repo, from `origin/main`, and from git history. Do not recreate it. The worn names that survived are dichotomy, syncopate, synthesis, digest, triage, loop, beside the four planes dev, integration, domain, ecosystem.
3. Which scorer is the trunk: `ComplexityAnalyzer` through `scoreAndRoute`, or `ExecutionPlanner.analyzeTaskComplexity`. The other becomes a caller of the trunk.
4. The one numeric table, if Blaze rejects the default proposal in phase 1.
5. How the stall clock joins the scale. Nudge levels, tripwire, and the governor are time. Thresholds are difficulty rungs. The join is one system with two sides. The words stay distinct until this answer is written.
6. The seat reads. A cloud agent does the code (`grok-bot/OP-PROC.md` cloud rule). Confirm the bottom of the staffed ladder is that split, at the rung switch, and that no rung sends a build back to the seat's own computer.
7. Arch1 in OP-PROC is anyone outside the fleet, reached by a GitHub mention. The rung switch may name Arch1 on a review rung. Confirm that does not rewrite the outside-fleet rule.
8. Which existing picker the rung switch drives: fleet roles (implementer, publisher, reviewer, coordinator), inbox routing, or `routeToAgent` (simple to code-reviewer, every higher tier to architect) and `getSkillForTier`.
9. Where oscillator keys sit in `xray/features.json` next to `suit_temperament` and `complexity_thresholds`. The public line does not describe a schedule.
10. Ponder's landing: the reflection page is the file, synthesis is the due gate, boil-up folds OP-PROC, the inference cycle turns a corpus into a proposal, and the status beat already says Reflect. Phase 2 names which of those ponder calls, and adds no second reflection store.
11. Syncopate in `grok-bot/CADENCE.md` means fold what we did into a higher rule. Leave that word on Cadence. Do not use it as a name for the oscillator.

## Confer and deeper research before code

Confer stays off unless features enable it (`docs-site/docs/plates/confer.md`). This packet does not turn it on.

Before phase 2, the reference agent writes a seam note on this card: trunk scorer, which picker the rung switch drives, and how the stall clock sits on the time side of the escalator. That note is the deeper research. A confer quorum runs only when confer is already enabled for that checkpoint. Phase 2 code waits on the seam note and on Blaze's dichotomy answer. Phase 1 may proceed once the threshold table is chosen, and it stays words and numbers.

## Files

This PR:

- `grok-bot/ops/cards/ROUTING-TERMS-PACKET.md`

Phase 1:

- `grok-bot/LEXICON.md`
- `docs-site/docs/plates/routing.md`
- `.agents/skills/routing/SKILL.md`
- `src/delegation/complexity-core.ts` (comment; constants only if the chosen table changes them)
- `src/delegation/complexity-analyzer.ts` (header comment)
- `xray/features.json`
- `docs-site/docs/guides/features-json.md`
- `docs-site/docs/full-reference.md`
- `docs-site/docs/guides/features-since-3.1.md` only if it starts quoting numbers

Phase 2, after the seam note:

- `src/nucleus/thin-dispatch.ts`
- `src/delegation/complexity-analyzer.ts`
- `src/delegation/complexity-core.ts`
- `src/mcps/orchestrator/execution/execution-planner.ts`
- `src/mcps/orchestrator/handlers/complexity-handler.ts`
- `src/mcps/orchestrator/server.ts`
- `house/live/app/governor.mjs` and the nudge path it calls (`house/live/feed/nudges.py`, `house/live/app/server.mjs`)
- `xray/features.json` for oscillator keys
- `src/nucleus/synthesis.ts`
- `src/inference/inference-accumulator.ts`
- Plates whose drawings change: routing, bifrost, orchestration, temperament, suit-settings, synthesis, reflection-page

`grok-bot/ops/dist/brand/LEXICON.md` is a pointer to `grok-bot/LEXICON.md`. Leave the pointer.

## Plates and docs

Phase 1 draws the escalator as the scale on the routing plate, and each cutoff as a threshold. The routing skill's bands match that drawing.

These plates stay in force and change only in phase 2 if the seam note says the drawing is wrong:

- Bifrost: governor, tripwire, nudge. Time side, not a second scale.
- Orchestration: `analyze-complexity` is a caller of the trunk scorer.
- Temperament: host profile. Suit settings: the feature file the oscillator writes into.
- Synthesis and reflection-page: ponder's gate and ponder's file.
- Confer: stays off unless enabled.
- Station card: `Cascade:` remains the wake handoff of lenses.
- Goggles and glossary: one plane. Centrifuge: goggles looks on and does not spin.
- Review: one critic pass on a head.
- Grokbot: attention is what needs the owner.

## Tests and checks

- `src/__tests__/unit/skill-seek.test.ts` stays green and stays unedited in phase 1. Seek behavior does not change.
- `src/__tests__/unit/plates.test.ts` lists the routing id and does not lock the drawing text. Re-run it if the plate file is edited.
- `src/__tests__/unit/complexity-analyzer-calibration.test.ts` stays a calibration test. Do not treat its `enterprise: 100` samples as the table.
- No current test locks `DEFAULT_THRESHOLDS`. If phase 1 changes the constants, add a unit that locks the chosen table.
- `src/__tests__/unit/thin-dispatch-extra.test.ts`, `src/__tests__/unit/nucleus-primary.test.ts`, `src/__tests__/integration/test-complexity-analysis.test.ts`, `house/live/tests/governor.test.mjs`, and `src/__tests__/unit/delegation-gate.test.ts` are the phase 2 suites to extend when those files change.
- `bifrost check --only lexicon` applies when a new bold term lands in OP-PROC or a runbook. Phase 1 keeps the new words in the lexicon, so that check is not required for the lines alone.
- Friend-test the public lines before they ship in the lexicon.

## Out of scope

- Any edit in this PR besides this packet.
- A lexicon row for role picker, or a lexicon row named scale.
- A change to seek behavior, or a rewrite of the seek tests.
- Moving the sizing pass off the routing plate.
- Recreating `PLANES-2026-09-28.md`.
- A new goggles plane, or a new plate id, in phase 1.
- Turning confer on.
- Gate B, gate D, and npm publish.
- Handing this card to another seat.
- Writing patent-sensitive mechanism into public docs, the lexicon, or a plate.

## Kept out of public docs

The public lines and the plates do not carry these. Record them here only as names, so a later edit does not spell them out:

- annals time layer
- card-to-KB mapping
- seek per card (the held-card clause dropped from the seek line)
- ponder internals

The oscillator line does not describe a duty cycle. The ponder line stops at one reflection. The seek line does not name a card list.
