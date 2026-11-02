# Packet: Bifrost fleet mode (#566)

raci: R=Arch1 A=Blaze C=forge,critic

This packet is the review. No mode code lands in this pull. Critic PASS on this head, then the build pulls, in the order below.

## Goal

Bifrost decides who it wakes. A held card does not burn a wake. The board shows the mode and who set it. Each wake reads that flag first.

## Out

Per-seat schedules. Spend metering. #384, bifrost #42, and #793.

## Phase 1 — held cards stop nudges

Ship this first.

- A held card raises no L1, L2, or L3.
- The held line stays on the board. It is not dropped.
- `evalNudges` in `house/live/app/server.mjs` today raises one owner nudge when a held card has no beat past `HELD_MAX_S`. That nudge stops.
- The live twin is `server.mjs` in the bifrost repo.

Test: a held card makes no wake.

## Phase 2 — modes

- `full`: normal waking.
- `lights-on` (default): wake only for P1 cards, lights-on cards, and scheduled runs. Everything else stays queued on the board.
- `dark`: wake nobody except scheduled runs.
- P1 lines and scheduled lines get through in every mode.
- A manual switch by Blaze or blinky overrides the schedule until it is set back or the next scheduled change. A seat wake cannot reset it.
- The board shows the current mode and who set it.
- Each wake checks the mode first.

Test: a held card makes no wake while lights-on. A P1 card does wake in lights-on. Dark wakes only scheduled runs. The manual switch overrides the schedule, and a seat wake does not clear it.

## Phase 3 — schedule, then the route

Schedule, in CT. The example on the card is full on weekdays 7:30–15:30, lights-on otherwise. The schedule switches mode at those boundaries.

Then the deep-compute route, one more board flag, set by the same schedule and the same switch: `arch1`, `cursor-cloud`, `grok-cli`, or `none`. A seat picks a task route only from the routes the board allows. Every launch logs the route it used. If the board cannot be read, the seat treats the mode as lights-on and does not launch Cursor cloud unless the card is P1.

## One stanza

The mode and route rule is one stanza in `grok-bot/OP-PROC.md`. Nothing else restates it. These readers link to that stanza:

- `house/live/app/server.mjs` — `evalNudges`, `wakeRun`
- `house/live/app/governor.mjs` — stall wake
- `house/live/app/wake-gate.mjs` — which seat is woken
- `house/live/app/arch1-launch.mjs` — cloud launch
- bifrost `server.mjs`, `governor.mjs`, `wake-gate.mjs`, `arch1-launch.mjs` — the live board
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md`
- the station skill
- each suit boot: forge, critic, blinky, herald, magnet, Nibbler, sound

A check fails if one of those suits has no link, or if a suit copies the rule.

## Docs, same pull as the code

The build pull updates the changelog, the house README, the board help text, and the starter-kit docs. Each names full, lights-on, and dark, who can switch, and what each route costs, and links to the OP-PROC stanza. Docs do not describe a mode or a route the code does not have.

## Done when

Critic PASS on this packet. Then phase 1 is a code pull. Modes, the schedule, and the route follow in that order.
