# Packet: CoS stays, narrower

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

Amends `RETIRE-COS-MILL-PACKET.md` (#411). Blaze, 08:50 CT: do not retire blinky. This file is the CoS decision. The mill-seat half of #411 stands where it does not conflict with a line below.

## Packet

- goal: Keep blinky. CoS keeps four duties. Bifrost keeps the board, inbox routing, and wave timing. The #411 mill-seat retirement stands.
- constraints: Do not retire blinky or the mill plant. Mill-seat retirement stands unless a line here conflicts. No secrets.
- path: Critic PASSed this packet. This follow-up edits the files below. Mill follow-up from #411 still applies where this packet does not conflict.
- acceptance: Kept duties, removed eng-loop duties, the later file list, and the checks are stated. #411's forge wave-planner and empty-wake moves are withdrawn.
- gates: Critic packet PASS is done. A and C run on this follow-up. B and D stay off.
- evidence: Read the #411 packet, pack OP-PROC, house/OP-PROC, COORDINATOR.md, SEATS.md, HOUSE.md, and the bifrost plate. Blaze update 08:50 CT.
- next owner: The code follow-up applies this packet.
- escalate: Blaze, only if a kept duty conflicts with the mill-seat retirement.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/record-map.md`.

## Scope

CoS (blinky) stays. The eng-loop work #411 took off CoS stays off CoS: board ownership, inbox routing, nudge reassignment, and wave timing sit on Bifrost. blinky does not go back to assigning dev work.

Dev talk goes between Blaze and forge directly. The cos-forge 1:1 carries the printed `live-inbox` handoff line. A room post is not a handoff.

The mill seat still goes. forge launches the cloud agent that writes the code and pushes the branch. forge opens the PR through its App and merges. A seat still never merges code it wrote. The foundry mill plant (mill+inspect) stays. Suit fitting uses that plant.

## Kept

blinky keeps four things.

1. Planning the next wave at each close, carded on Bifrost. The plan-next-wave card stays this seat. `waveBoard` (`server.mjs:1033`) and the card seed (`server.mjs:3099`) pass `cosSeat()` / `COORD_SEAT || COS` in. That still gets blinky. Leave both.
2. Burn pacing. Do not launch when the day is over pace. At or above 75% weekly burn, the empty-board wake and the plan card stay quiet (`grok-bot/OP-PROC.md` tripwire, `house/OP-PROC.md` Pipe down).
3. Lane H friend-test plus Dist packets (per `grok-bot/ops/LANGUAGES.md`). Herald posts those words and does not invent them. Blaze's go stays.
4. Seat onboarding, including suit fitting, and parking. CoS lists a finished or idle seat and Blaze deletes it. A credential delete still asks Blaze.

Bifrost keeps the board, inbox routing, and wave timing. `seats.coord` stays. Its seat stays blinky. `needs-decision` and `lead` stay on that block. Inbox routing is Bifrost's, not a new forge triage job.

## Removed

These leave CoS. They are not retargeted at forge.

- Eng assignment, including the blinky "new issue" route and L2/L3 reassign. Drop the `cosSeat()` wakes in `nudgeLines`, `nudgeSeats`, the card ladder, `evalHandoffs`, `evalSilent`, and `wakeRun`. Do not point those wakes at forge, and do not give them back to blinky. The card owner keeps L1. `cosSeat` itself stays at `server.mjs:297`.
- #411's move that points the empty-board wake and `POST /clock` at forge is withdrawn. Those stay on blinky (`seats.coord`). Wave timing stays Bifrost. Planning the next wave stays blinky. `WAVE-SCHEDULE.md` keeps the plan card on CoS. Do not delete `seats.coord` (`governor.mjs` still skips the empty wake when the coord seat is missing).
- #411's rule that forge triages inbound PRs into current wave, next wave, or backlog. The plan-next-wave card is that decision.
- Dev status as a CoS hop. Blaze and forge talk in their direct chat. The cos-forge 1:1 carries the printed `live-inbox` handoff line. A room post is not a handoff.
- Deleting blinky: roster row, `@blinky` route, emoji, live-map node, `git:blinky`, and `COORDINATOR.md`. Rewrite the runbook to the four duties. Do not delete it.

`holdOwner` (`server.mjs:1086`) and the L1 `|| cosSeat()` fallback (`server.mjs:1183`) stay. They are not one of the four duties, and this packet does not name a new owner for them.

Not reassigned here, and not a reason to retire blinky: the sweep backstop for dropped wakes, boil-up, the design-before-spend agreement, the daily digest, cover-CoS, and the ship-cadence lap clock that is still waiting on Arch1. Commit credit for `Seat: mill` stays the open mill question from #411.

## Files this follow-up changes

OP-PROC:

- `grok-bot/OP-PROC.md` — narrow the coordinator. Keep the mill-seat split (cloud agent writes and pushes; forge opens through its App and merges; mill+inspect fasten stays).
- `house/OP-PROC.md` — drop "CoS assigns" and "forge does not implement". Keep blinky on the four duties. Mill implements → the cloud agent.

Seat descriptions:

- `grok-bot/runbooks/COORDINATOR.md` — rewrite to the four duties. Do not delete.
- `grok-bot/ops/SEATS.md` — narrow the coordinator section. Dist draft and friend-test stay. "Blinky routes" does not.
- `grok-bot/AGENTS.md` — coordinator stays, narrower. Implementer is the cloud agent. mill+inspect lines stay.
- `house/HOUSE.md`, `grok-bot/templates/house/HOUSE.md`, `grok-bot/templates/house/EXAMPLE.md` — coordinator = blinky stays, with the four duties. Implementer + publisher = forge stays.
- `grok-bot/LEXICON.md`, `grok-bot/CADENCE.md` — drop eng-loop CoS. Keep burn pacing and the plan-next-wave card.
- `grok-bot/skills/enterprise-cos-wave-loop/SKILL.md` — drop eng routing. Keep Dist and the four duties.
- `grok-bot/skills/dist-0xrayai-publish/SKILL.md`, `grok-bot/skills/synaptical-comms/SKILL.md` — blinky still writes and friend-tests the public copy.
- `grok-bot/runbooks/IMPLEMENTER.md`, `grok-bot/runbooks/SHIP.md` — mill-seat half of #411, unchanged.
- `grok-bot/runbooks/CRITIC.md` — drop the coordinator wake on the nudge row. Owner ladder stays.

House docs:

- `house/live/docs/inbox.md`, `board.md`, `fleet-setup.md`, `work-tracking.md`, `README.md`
- `house/live/README.md`, `house/live/SETUP.md`, `house/live/PLAYBOOK.md`
- `docs-site/docs/plates/bifrost.md`, `docs-site/docs/introduction.md`, `docs-site/docs/guides/features-since-3.1.md`, root `AGENTS.md` — drop the L2/L3 CoS wake. The plan-next-wave card stays blinky. Wave timing stays Bifrost. The empty-board wake and `POST /clock` stay on blinky.
- `house/live/app/server.mjs`, `governor.mjs`, `wave-schedule.mjs` — drop the L2/L3 wakes above. Leave the plan path on blinky (`waveBoard` at `:1033`, card seed at `:3099`, `seats.coord`). Drop mill from seat lists. Keep blinky. `governor.mjs` and `wave-schedule.mjs` keep the coord argument.
- `house/live/feed/fleet-roster.json`, `inbox-roles.json` — delete mill. Keep blinky. Keep `seats.coord`.
- `docs-site/static/live/live.js`, `live-events.json`, `grok-bot/skills/draw-seat-emoji/SKILL.md` — delete the mill seat marks. Keep blinky.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — the CoS seat does not post a handoff. It only acks a dev line and sends no message about it.

## Tests and checks

No new test file. A and C run on this follow-up. B and D stay off.

- `house/live/tests/nudge-escalation.test.mjs` — drop the L3 reassign. Keep the owner ladder. Keep a coord seat. Do not delete blinky to satisfy it.
- `house/live/tests/mill-forge-wake.test.mjs` — retarget the mill wake to forge, as #411 said.
- Roster and fallback locks (`test_routing_ours.py`, `test_fleet_seats.py`). Drop mill. Keep blinky.
- Keep `grok-bot-house-template.test.ts` (no fleet names in the generic kit) and `grok-bot-house-migrate.test.ts` (mill+inspect plant).

## Out of scope

Retiring blinky. The mill plant. Critic, herald's posting job, and forge's publisher job, except where the mill-seat half already moves implementation to the cloud agent forge launches.
