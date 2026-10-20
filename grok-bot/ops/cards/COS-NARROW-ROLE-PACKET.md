# Packet: CoS stays, narrower

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

Amends `RETIRE-COS-MILL-PACKET.md` (#411). Blaze, 08:50 CT: do not retire blinky. This file is the CoS decision. The mill-seat half of #411 stands where it does not conflict with a line below. No code is edited here.

## Packet

- goal: Keep blinky. CoS keeps four duties. Bifrost keeps the board, inbox routing, and wave timing. The #411 mill-seat retirement stands.
- constraints: Packet only. No code. Do not retire blinky or the mill plant. Mill-seat retirement stands unless a line here conflicts. No secrets.
- path: Critic PASS on this packet, then one follow-up edits the files below. Mill follow-up from #411 still applies where this packet does not conflict.
- acceptance: Kept duties, removed eng-loop duties, the later file list, and the checks are stated. #411's forge wave-planner and empty-wake moves are withdrawn.
- gates: Critic packet PASS before any code. Docs-only. A and C wait on the follow-up. B and D stay off.
- evidence: Read the #411 packet, pack OP-PROC, house/OP-PROC, COORDINATOR.md, SEATS.md, HOUSE.md, and the bifrost plate. Blaze update 08:50 CT.
- next owner: critic for packet PASS. The follow-up waits on that PASS.
- escalate: Blaze, only if a kept duty conflicts with the mill-seat retirement.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/record-map.md`.

## Scope

CoS (blinky) stays. The eng-loop work #411 took off CoS stays off CoS: board ownership, inbox routing, nudge reassignment, and wave timing sit on Bifrost. blinky does not go back to assigning dev work.

Dev talk goes between Blaze and forge directly. The cos-forge chat carries CoS↔forge handoffs only.

The mill seat still goes. forge launches the cloud agent that writes code and opens the PR, and forge merges. A seat still never merges code it wrote. The foundry mill plant (mill+inspect) stays. Suit fitting uses that plant.

## Kept

blinky keeps four things.

1. Planning the next wave at each close, carded on Bifrost. The plan-next-wave card stays this seat. `server.mjs:897` and `:2947` pass `COORD_SEAT || COS` into the wave scheduler and the card seed. That still gets blinky, and that is the plan, not a defect to move.
2. Burn pacing to the 10/25 reset. Pause waves when a day runs hot. The server's existing quiet stays the mechanism: do not launch when the day is over pace, and weekly burn at or above 75% keeps the empty-board wake and the plan card quiet (`grok-bot/OP-PROC.md` tripwire, `house/OP-PROC.md` Pipe down).
3. The human-facing side. Friend-test anything public. Write Dist and herald packets. Herald posts those words and does not invent them. Blaze's go stays.
4. Seat onboarding, suit fitting, and parking or retiring seats. A credential delete still asks Blaze.

Bifrost keeps the board, inbox routing, and wave timing. `seats.coord` stays. Its seat stays blinky. `needs-decision` and `lead` stay on that block. Inbox routing is Bifrost's, not a new forge triage job.

## Removed

These leave CoS. They are not retargeted at forge.

- Eng assignment, including the blinky "new issue" route and L2/L3 reassign. Drop `cosSeat()` at `server.mjs:618` used for `:637` (unacked-line L3), `:658` (unrouted and quiet), `:1048`, `:1055`, `:1126`, and `:1455`. Do not point those wakes at forge, and do not give them back to blinky. The card owner keeps L1.
- #411's move that points the empty-board wake and `POST /clock` at forge. Wave timing stays Bifrost. Planning the next wave stays blinky. Do not delete `seats.coord` to retarget the clock (`governor.mjs:100-102` still skips the empty wake when the coord seat is missing).
- #411's rule that forge triages inbound PRs into current wave, next wave, or backlog. The plan-next-wave card is that decision.
- Dev status as a CoS hop. Blaze and forge talk in their direct chat. CoS↔forge handoffs use the cos-forge chat.
- Deleting blinky: roster row, `@blinky` route, emoji, live-map node, `git:blinky`, and `COORDINATOR.md`. Rewrite the runbook to the four duties. Do not delete it.

`holdOwner` (`server.mjs:944`) and the L1 `|| COS` fallback (`:1041`) stay as #411 left them. They are not one of the four duties, and this packet does not name a new owner for them.

Not reassigned here, and not a reason to retire blinky: the sweep backstop for dropped wakes, boil-up, the design-before-spend agreement, the daily digest, cover-CoS, and the ship-cadence lap clock that is still waiting on Arch1. Commit credit for `Seat: mill` stays the open mill question from #411.

## Files to change later

Not this PR.

OP-PROC:

- `grok-bot/OP-PROC.md` — narrow the coordinator. Keep the mill-seat split (cloud agent writes and opens; forge merges; mill+inspect fasten stays).
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
- `docs-site/docs/plates/bifrost.md`, `docs-site/docs/introduction.md`, `docs-site/docs/guides/features-since-3.1.md` — drop the L2/L3 CoS wake. The plan-next-wave card stays blinky. Wave timing stays Bifrost.
- `house/live/app/server.mjs`, `governor.mjs`, `wave-schedule.mjs` — drop the L2/L3 wakes above. Leave the plan path on blinky (`:897`, `:2947`, `seats.coord`). Drop mill from seat lists. Keep blinky.
- `house/live/feed/fleet-roster.json`, `inbox-roles.json` — delete mill. Keep blinky. Keep `seats.coord`.
- `docs-site/static/live/live.js`, `live-events.json`, `grok-bot/skills/draw-seat-emoji/SKILL.md` — delete the mill seat marks. Keep blinky.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — no CoS or mill name. No edit unless a follow-up has a real rule change there.

## Tests and checks

No new test in this PR. Docs-only: A and C wait on the follow-up. B and D stay off.

- `house/live/tests/nudge-escalation.test.mjs` — drop the L3 reassign. Keep the owner ladder. Keep a coord seat. Do not delete blinky to satisfy it.
- `house/live/tests/mill-forge-wake.test.mjs` — retarget the mill wake to forge, as #411 said.
- Roster and fallback locks (`test_routing_ours.py`, `test_fleet_seats.py`) — drop mill. Keep blinky.
- Keep `grok-bot-house-template.test.ts` (no fleet names in the generic kit) and `grok-bot-house-migrate.test.ts` (mill+inspect plant).

## Out of scope

Code, route edits, and roster edits. Retiring blinky. The mill plant. Critic, herald's posting job, and forge's publisher job, except where the mill-seat half already moves implementation to the cloud agent forge launches.
