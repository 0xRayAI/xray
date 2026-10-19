# Packet: the pulsar

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

The pulsar is talent spotting. The mark is 🔫, the toy blaster. A seat can hand it to an agent. A new back (a backup that is not yet a regular holder) can be onboarded by being handed the pulsar. The holder has the wave. When the wave window ends, a confer says whether they used it well. That yes or no moves their score on the round-robin table that picks the next holder.

This file is the whole change. Lexicon, plates, and code stay as they are until critic PASSes this card.

## Packet

- goal: The pulsar (🔫) spots talent for one wave. A new back can be handed it. Confer then moves their score on the round-robin table that picks the next holder.
- constraints: Packet only. No code, lexicon, or plate edits. Confer stays off. A no lowers the score. Three nos start a one-wave lockout. Only the solar hammer overrides, and only for one pass.
- path: This PR is the card. After critic packet PASS, a later PR adds the score table, the wave-end verdict, the lockout, and the one-pass hammer override.
- acceptance: The card states the mark, the handoff, the wave of power, confer yes and no, the third-fail lockout, and the single-pass solar hammer. Critic PASS on this head gates any code.
- gates: Card only. B and D stay off. A and C apply when a later PR changes words or code. No code until critic packet PASS on this head.
- evidence: The wave window is `house/live/app/wave-schedule.mjs` (Monday 09:00 Chicago). The confer plate stays off. `govern_with_solar` is the hammer. No round-robin table exists yet.
- next owner: critic, for packet PASS.
- escalate: Blaze, if the lockout should run longer than one wave, or if the fail count should not be three.

Plates read: `docs-site/docs/plates/confer.md`, `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/grokbot.md`, `docs-site/docs/plates/governance.md`.

## What a friend would hear

You hand someone the toy gun for one wave. If they use it well, they move up the list that picks who holds it next. If they use it poorly, they move down. They stay on the list. After three poor waves in a row, they sit out one wave. Only the solar hammer can undo that call, and only for one pick.

## The mark and the pass

The mark is 🔫. One holder at a time.

Blaze may hand the pulsar to a new back when nobody holds it. That pass onboards them: it opens their row and gives them the current wave window. A new back starts at score 1, with no fail streak.

When a window ends and the confer is recorded, the table names the next holder and the pulsar passes to them. The passer is the table, not a chat.

A pass waits while someone already holds it.

## Power for one wave

The wave window is the one Bifrost already uses. `house/live/app/wave-schedule.mjs` stores it as a Chicago cron. The template default is `0 9 * * 1`, Monday 09:00 America/Chicago. The holder keeps the pulsar until that window ends and the confer is recorded.

While they hold it, the round robin does not pick someone else. The holder takes that wave's cards.

The pulsar does not move the ask-first lines. Money, credentials, deletes, publish, and production stay with Blaze. A critic PASS stays where the tier already requires it. The pulsar does not merge, publish, or spend.

## Confer when the window ends

The confer asks one question: did this holder use the pulsar well.

- Yes raises their score by 1 and clears their fail streak.
- No lowers their score by 1 and adds one to their fail streak. They stay on the table. A lower score is a later place in the order.
- The score floor is 0. A no at 0 stays 0 and still adds to the streak.
- No recorded verdict leaves the score and the streak where they are. The holder keeps the pulsar until a yes or a no is recorded. Silence does not punish and does not boost.

Confer stays off for the suit (`docs-site/docs/plates/confer.md`). This card does not enable it and does not turn on synthesis. While that quorum is off, critic posts the yes or no for this checkpoint. A model confer replaces that post only when confer is enabled for this checkpoint. A missing model vote stays UNREVIEWED and does not move the table.

## The table

The round robin is a score table. It does not exist yet. This card is the rule for the later PR.

Eligible rows are holders who are not in a lockout. The next holder is the eligible row with the highest score. A tie goes to whoever has gone longest since they last held the pulsar. A brand-new back has never held it, so a tie favors them.

A yes is a boost: score plus 1, so the picker reaches them sooner. A no is a lower score, so the picker reaches them later. Equal scores still rotate by time since the last hold.

## Timed lockout

A confer no lowers the score. The holder stays eligible.

Three confer nos in a row start a timed lockout. A yes clears the streak, so the three have to be consecutive. One poor wave does not sit them out.

The lockout lasts one wave window, the same Chicago window as the hold. During it they are off the picker. Their lowered score stays. When the window ends they are eligible again at that score, and serving the lockout clears the streak. The next lockout needs three new nos. A yes also clears the streak.

Worked example. A new back starts at score 1. Three nos move the score 1, then 0, then 0, then 0, and the third no sits them out for one wave. When that wave ends they return at 0 with a clear streak. A later yes takes them to 1.

## Solar ban hammer

The solar ban hammer is one `govern_with_solar` decision (`src/integrations/governance/governance-client.ts`). It is the only thing that can override a recorded confer, and the override covers a single picker pass.

- It can put a locked-out or lowered holder into one pick, or keep a boosted holder out of one pick.
- That one pass uses the hammer. Then the recorded confer applies again. The lockout clock keeps running.
- The hammer does not clear the fail streak, does not change the score, and does not grant a second pass.
- A chat, the holder, and the coordinator cannot override the confer.

If there is no recorded yes or no, there is nothing for the hammer to override.

## Out of scope

Code, lexicon edits, plate edits, and a live board write. Turning confer on. Turning synthesis on. A fifth kit. Payments. Replacing critic where the tier already requires critic. Moving Blaze's ask-first lines. Retiring any seat.

## Later PR, only after critic PASS

- A score table beside `house/live/app/wave-schedule.mjs`. The wave module keeps deciding the window. It does not become the talent table.
- One lexicon row for pulsar in `grok-bot/LEXICON.md`.
- Tests that fail when the rule is reverted:
  - a yes adds 1 and clears the streak
  - a no subtracts 1, floors at 0, and adds one to the streak
  - the third consecutive no starts a lockout that ends after one wave window
  - a locked-out row is skipped, and the next eligible row is picked
  - a tie uses longest time since the last hold
  - UNREVIEWED does not move the score or the streak
  - one solar hammer pass overrides a single pick and leaves the score, the streak, and the remaining lockout alone
  - a second hammer pass in the same lockout is refused
  - a new back can be handed the pulsar when it is free, and cannot be handed it while someone holds it

## Open edges

Blaze named three fails and a timed lockout, with room on the exact count, and named no clock length. This card proposes three consecutive nos and one wave window. Those two numbers are the escalate line. The score step of 1 and the floor of 0 are the mechanics a test can pin. Critic may nit the step. Critic PASS is the gate before any of this becomes code.

## Shipped game

4.1.3 already carries the version. This game is what that publish includes. It does not bump again.

The mark is still 🔫. Nobody hands a free pulsar. The claim is one line in `grok-bot/OP-PROC.md`. A command, a room message, and a Bifrost card do not take it. The first valid line is the handoff. A new back can write that line.

The prize is the local board for one wave. The wave ends at the next Monday 09:00 America/Chicago, wall time, including the weeks the offset changes. After that minute the holder takes no cards. Silence does not extend the hold. The ledger stays closed after the first hit.

The score table, the fail streak, and the solar roster pass are not in this publish. One `governWithSolar` decision, off the merge path, with `onChain: false`, and a refusal of a second pass, stays the follow-up on #416. This game does not call it.

The range stays out of the lexicon **wave** gloss, out of review fails, and out of `task_distribution_strategy`. The plan-next-wave card and the ask-first lines stay put.

The puzzle and the charge word are not written in this card. Critic PASS on `25fbd61` was the packet. The game is the owner's ship for 4.1.3.
