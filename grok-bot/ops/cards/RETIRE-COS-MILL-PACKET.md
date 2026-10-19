# Packet: retire CoS and the mill seat

CoS (blinky, the coordinator) is dead weight on the eng loop. Bifrost already does handoffs, the review queue, wakes, and receipts. The mill seat (eng implementer) is dead weight too: forge launches the cloud agent that writes code and opens the PR.

This file is the whole change. No other file is edited here.

## Packet

- goal: Retire the CoS role (blinky) and the mill seat. Eng-loop duties sit on the Bifrost board and collector. Forge owns release and inbound triage, and launches the cloud agent that implements.
- constraints: Packet only. Do not edit OP-PROC, the house layer, live docs, the lexicon, plates, skills, or templates in this PR. Do not retire the mill plant (foundry mill+inspect). Do not decide the open questions. No secrets.
- path: Critic PASS on this packet, then one follow-up that edits the files below to match the tables.
- acceptance: Every in-scope CoS and mill-seat reference is in the tables with a replacement, or in Open questions. The new inbound-triage rule is stated. Plant hits are listed as out of this retirement.
- gates: Critic packet PASS is the gate before any code. The @arch10x comment is a fleet-wide read, not the gate. This PR is docs-only; A and C wait on the follow-up. B and D stay off.
- evidence: Read pack OP-PROC, house/OP-PROC, WAKE-ROUTINE, house/live docs, LEXICON, bifrost plate, CADENCE, the runbooks, the seat skills and house templates, wave-schedule.mjs, fleet-roster.json, critic review 5575662717 at `84e6533`, and review 5575857672 at `df7d42f`. Checked `server.mjs:159`, `:283`, `:618`, `:637`, `:658`, `:944`, `:1041`, `:1048`, `:1055`, `:1126`, `:1397-1403`, `:1455`, `:1493`, `governor.mjs:100-102`, and `inbox-roles.json:110-122`.
- next owner: critic for packet PASS. Follow-up code waits on that PASS.
- escalate: Blaze, for the open questions only.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/lens-gate.md`, `docs-site/docs/plates/record-map.md`.

## Replacement

| Bucket | Takes |
|---|---|
| Bifrost board / collector | Board ownership, plan-next-wave card, beat → card, drift between board and PR heads. The card owner already gets L1. Drop the L2/L3 CoS wake. Do not retarget it. |
| forge | Release. Inbound triage (new rule below). Launches the cloud agent that writes code and opens the PR. Empty-board wake and `POST /clock`. |
| delete | Seat rows, roster entries, `@blinky` / `@mill` routes, emoji, and the coordinator runbook, after Blaze answers anything that is only CoS. Do not delete `seats.coord`. |

`grok-bot/templates/house/fleet/WAKE-ROUTINE.md` does not name CoS or mill. Line 24 already hands builds to forge's chat and reviews to critic. No edit until a follow-up has a real rule change there.

## New rule

Outside and inbound PRs are triaged on the board by forge into **current wave**, **next wave**, or **backlog**, and each card carries a **target release**.

That replaces CoS assignment and the blinky "new issue" route. It does not replace critic PASS, Arch1's yes where the tier already requires it, or Blaze on money, credentials, deletes, publishing, production, and taste. Handoff kinds stay (`handoff.mjs:78-82`): critic reviews, forge merges, `critic_fail` and `ci_fail` go to the author.

## Coord route (critic round 1)

`seats.coord` is one block with two jobs. Do not delete it.

- Critic's cites for this blocker: `server.mjs:1397-1403`, `governor.mjs:100-102` (it skips the wake when the coord seat is missing), and the L2/L3 reassign at `:618`, used at `:1048`, `:1055`, `:1126`, and `:1455`. The `cosSeat()` fallback to `COS = 'blinky'` is at `:283`.
- The empty-board wake and `POST /clock` read `seats.coord.seat` (`server.mjs:1397-1403`). `CLOCK_SEATS` defaults to that seat (`:1401-1403`). If the seat is missing, the empty wake does not run (`governor.mjs:100-102`).
- That same lookup is `cosSeat()` (`server.mjs:618`). `:1048` passes the constant `COS`. `:637`, `:658`, `:1055`, `:1126`, and `:1455` call `cosSeat()`. If the route is missing, `cosSeat()` falls back to `COS = 'blinky'` (`:283`). One delete cannot both wake forge and stop those CoS wakes.
- Round 2 (review 5575857672): `:637` is the unacked-line L3 reassign. `:658` is the unrouted and quiet nudge. Both still wake blinky. Add both to this drop list. Keep both off forge.
- Follow-up: point the empty-board wake and the clock at forge by a separate target. Stop using this seat for L2/L3, including `:637` and `:658`. Do not retarget L2/L3 at forge.
- The block also holds labels `needs-decision` and `lead`, and the same needles (`inbox-roles.json:110-122`). `seat` stays `blinky` until Blaze answers Q4. Do not move those labels by rewriting `seats.coord.seat`.
- `holdOwner` (`server.mjs:944`) and the L1 fallback `|| COS` (`:1041`) are the no-owner path. Leave them until Q5.

## CoS inventory

| Where | What CoS does there | Replacement |
|---|---|---|
| `grok-bot/OP-PROC.md:6` | Coordinator never deploys, publishes, launches a cloud, posts, spends, or merges | delete the role |
| `grok-bot/OP-PROC.md:7` | Coordinator is also called CoS. CoS cards a new seat's first work | delete the name. First-card hire is an open question |
| `grok-bot/OP-PROC.md:10` | A CoS room post is not a handoff. CoS is woken at L3 | drop the L3 wake. Room-post rule stays |
| `grok-bot/OP-PROC.md:16` | Empty board and plan-next-wave wake the coordinator | empty-board wake and clock → forge. Do not delete `seats.coord` to get there |
| `grok-bot/OP-PROC.md:17` | L2 to CoS. L3 wakes CoS to reassign. CoS owns the board | drop L2/L3 (`server.mjs:1048`, `:1055`). Do not retarget them. Owner keeps L1 |
| `grok-bot/OP-PROC.md:19` | Coordinator runbook | delete `grok-bot/runbooks/COORDINATOR.md` after open questions |
| `grok-bot/CADENCE.md:18` | Critic and CoS agree design before the paid round | open question |
| `grok-bot/CADENCE.md:27` | CoS weighs cost, then the room decides | open question |
| `grok-bot/CADENCE.md:39` | CoS turns the room beat into the board row | board / collector |
| `grok-bot/CADENCE.md:40` | Cadence owner. Weekday drift check | board / collector for drift. Digest is an open question |
| `grok-bot/CADENCE.md:47` | CoS starts the next phase | board / collector (plan-next-wave) |
| `grok-bot/CADENCE.md:53-64` | RACI column: ranking, design, board, digest, OP-PROC text | board rows → collector. Design, digest, OP-PROC accountability → open question |
| `grok-bot/LEXICON.md:5` | CoS steers from station | delete |
| `grok-bot/LEXICON.md:40` | Seat list includes CoS | delete CoS |
| `grok-bot/LEXICON.md:74` | station ≠ board, glossed as CoS deck ≠ Bifrost | delete the CoS gloss. Station stays the seat ticket |
| `grok-bot/LEXICON.md:144` | Tripwire empty board and plan-next-wave wake the coordinator | same as OP-PROC:16 |
| `grok-bot/LEXICON.md:145` | Nudge L2/L3 to the CoS role | same as OP-PROC:17 |
| `grok-bot/LEXICON.md:156-157` | Coordinator owns the board via tripwire and nudge, and the never-list | delete both rows |
| `grok-bot/LEXICON.md:159-160` | Handoff L3 wakes CoS. A CoS room post is not a handoff | drop the L3 wake. Room-post rule stays |
| `grok-bot/LEXICON.md:168` | Roles list includes coordinator | delete coordinator |
| `grok-bot/LEXICON.md:186` | CoS triggers boil-up | open question |
| `grok-bot/LEXICON.md:193` | Plan-next-wave card is for the coordinator | forge, under the new triage rule |
| `grok-bot/runbooks/COORDINATOR.md:3-4` | L3 reassign. Empty board and plan-next-wave wake this seat | drop L3. Empty wake and clock → forge. Delete the runbook after the open questions |
| `grok-bot/runbooks/COORDINATOR.md:9` | Boil-up | open question |
| `grok-bot/runbooks/COORDINATOR.md:12` | Coordinator only enters through tripwire and nudge | delete |
| `house/OP-PROC.md:11-12` | CoS does not police chimes. CoS assigns | delete. Inbound assignment is forge |
| `house/OP-PROC.md:14` | After a close, the coordinator starts the next step | board / collector |
| `house/OP-PROC.md:23` | CoS logs weekly spend in ATTENTION_STATE | open question |
| `house/OP-PROC.md:24` | Spend bound names CoS and mill beside forge and critic | drop CoS and mill from the list |
| `house/OP-PROC.md:25-27` | CoS relays Pipe down, declares In the dark, confirms Lights on | open question |
| `house/OP-PROC.md:29` | CoS lists seats to retire. Blaze deletes | open question |
| `house/OP-PROC.md:39` | Herald posts only the words CoS handed over | open question |
| `house/OP-PROC.md:42` | CoS assigns, keeps the board, steps in when the loop stalls | board → collector. Assign inbound → forge. Stall wake → collector |
| `house/OP-PROC.md:44` | Forge sends the packet to CoS | delete. Handoff stays seat to next seat |
| `house/OP-PROC.md:46` | Hire gate: CoS creates the agent and cards first work | open question |
| `house/OP-PROC.md:51` | Dist stays stopped until CoS posts Ship-it | open question |
| `house/OP-PROC.md:65` | Forge's three cards are ones CoS can see | delete the CoS clause. The board already shows the cards |
| `house/OP-PROC.md:150` | CoS owns the board digest. Forge owns eng cadence | digest → open question. Eng cadence stays forge |
| `house/OP-PROC.md:156` | CoS sets the lap clock | open question (section is still waiting on Arch1) |
| `house/OP-PROC.md:163` | CoS logs cadence refinements into one OP-PROC PR | open question |
| `house/live/docs/inbox.md:3-5` | CoS owns the board. Nudge L2/L3 and the empty-board wake go to CoS | drop L2/L3. Empty-board wake → forge. Keep `seats.coord` |
| `house/live/docs/inbox.md:39` | Handoff-missing L3 wakes CoS | drop it (`server.mjs:1126`). Do not retarget it |
| `house/live/docs/inbox.md:51` | Blinky's scheduled sweep is the backstop for dropped wakes | open question |
| `house/live/docs/inbox.md:58` | Blinky's sweep covers seats with no webhook | open question |
| `house/live/docs/inbox.md:68` | New issue routes to blinky | forge (new rule) |
| `house/live/docs/inbox.md:69-70` | Comment-watch and PR-head heads-up copy blinky | delete the blinky copy. Author seat and critic stay |
| `house/live/docs/inbox.md:75` | needs-decision / lead label routes to blinky | keep. The labels are `seats.coord` (`inbox-roles.json:114-121`) until Q4 |
| `house/live/docs/inbox.md:78` | Fallback seat is blinky | forge for an inbound PR. Anything else → open question |
| `house/live/docs/inbox.md:82` | Server nudges and silent-seat lines go to blinky (was coord) | drop the blinky copy |
| `house/live/docs/inbox.md:86-87` | Coordinator fallback and PR-head copy to blinky | same as :78 and :70 |
| `house/live/docs/inbox.md:146` | No-webhook seats learn of work from blinky's sweep | open question (same sweep) |
| `house/live/docs/inbox.md:218` | Arch1's lines are never copied to blinky | delete the blinky clause when fallback moves |
| `house/live/docs/inbox.md:272` | Empty board wakes the CoS seat. `POST /clock` defaults to coord | point both at forge. Keep `seats.coord` so the wake still runs |
| `house/live/docs/inbox.md:274` | Card L2 goes to CoS | drop L2. Do not send it to forge |
| `house/live/docs/inbox.md:276-277` | Unrouted and quiet-seat nudges go to CoS | collector records them. Drop the CoS wake |
| `house/live/docs/board.md:22` | Handoff-missing L3 wakes CoS | drop it. Do not retarget it |
| `house/live/docs/board.md:28-30` | Nudge ladder L2/L3 to CoS | drop L2/L3. Owner keeps L1 |
| `house/live/docs/board.md:65` | start-after wake lists blinky beside mill, critic, forge | drop blinky and mill |
| `house/live/docs/board.md:144` | blinky avatar on the board | delete with the seat |
| `house/live/docs/fleet-setup.md:7` | Roster names blinky | delete from `feed/fleet-roster.json` |
| `house/live/docs/fleet-setup.md:13` | `coord` → blinky | keep until Q4. Wake and clock are a separate forge target |
| `house/live/docs/fleet-setup.md:19-20` | Fallback, PR heads, and comment-watch include blinky | same as inbox.md :68-78 |
| `house/live/docs/fleet-setup.md:30` | Example: login `blinky` is a stranger, not the seat | drop the example name |
| `house/live/docs/fleet-setup.md:34` | Board strip includes blinky | delete from the strip |
| `house/live/docs/fleet-setup.md:60` | Nudges go to blinky (was coord) | drop the L2/L3 copy. Keep `seats.coord` |
| `house/live/SETUP.md:13` | A login GitHub does not know nudges CoS | collector shows `routing: fail`. Drop the CoS nudge |
| `house/live/SETUP.md:37` | Seat-key list includes blinky | drop the seat. Key deletion stays with Blaze |
| `house/live/SETUP.md:49` | blinky inbox is CoS / board asks | delete. Inbound PRs go to forge |
| `house/live/SETUP.md:76` | blinky or forge may read every card | forge keeps all-cards. Drop blinky |
| `house/live/SETUP.md:104` | A silent seat nudges blinky | drop the CoS nudge |
| `house/live/PLAYBOOK.md:12` | L2 nudge to Coord | drop L2. Playbook is the stale 30-min ladder; match `board.md` |
| `house/live/PLAYBOOK.md:24` | Coord unblocks, reassigns, or parks | drop the reassign. Park stays a card state |
| `house/live/docs/README.md:3` | Kit example roles include Coord | delete Coord from the example list |
| `house/live/app/wave-schedule.mjs:3` | Plan-next-wave is raised for the CoS seat | forge |
| `house/live/app/wave-schedule.mjs:252` | Plan card owner `coord` | forge |
| `house/live/app/wave-schedule.mjs:268` | Packet next owner `coord` | forge |
| `house/live/app/wave-schedule.mjs:338` | `opts.coord` default `'coord'` | forge |
| `house/live/feed/fleet-roster.json:2-3` | `seats` and `board` include blinky | delete blinky |
| `grok-bot/templates/house/EXAMPLE.md:5` | coordinator = blinky | delete the line |
| `grok-bot/templates/house/HOUSE.md:26` | Coordinator handles parked PRs, owner-only asks, fleet mechanics, stall sweep | stall and parked cards → collector. Owner-only asks stay Blaze. Delete the coordinator sentence |
| `grok-bot/templates/house/WAVE-SCHEDULE.md:9` | Plan-next-wave card for the CoS seat | forge |
| `grok-bot/templates/house/WAVE-SCHEDULE.md:11` | Empty board wakes the coordinator | forge, under the new triage rule |
| `grok-bot/skills/enterprise-cos-wave-loop/SKILL.md:2` | Skill is the CoS wave loop | delete the eng-loop. Dist rewrite and cover-CoS → open question. Do not delete the file until Blaze answers |
| `grok-bot/skills/enterprise-cos-wave-loop/SKILL.md:5` | Assign, don't do. CoS never does the seat's job | delete. Forge launches the cloud; critic reviews |
| `grok-bot/skills/enterprise-cos-wave-loop/SKILL.md:14` | Blinky routes. The best seat executes | forge routes inbound. Cloud agent executes |
| `grok-bot/skills/enterprise-cos-wave-loop/SKILL.md:21` | Fatal if CoS implements, launches a cloud, or posts Dist | delete the eng half. Dist post → open question |
| `grok-bot/skills/enterprise-cos-wave-loop/SKILL.md:27` | CoS does not stamp a fake PASS | delete. Critic stamps PASS |
| `grok-bot/skills/enterprise-cos-wave-loop/SKILL.md:57-58` | Cover CoS when the 1:1 looks dead | open question |
| `grok-bot/skills/synaptical-comms/SKILL.md:20` | CoS refuses H-jargon | open question (Dist) |
| `grok-bot/skills/synaptical-comms/SKILL.md:30` | CoS rewrite of Dist openers | open question |
| `grok-bot/skills/dist-0xrayai-publish/SKILL.md:12-14` | Exact CoS copy. CoS owns the plain rewrite. Herald does not invent it | open question |
| `grok-bot/skills/draw-seat-emoji/SKILL.md:28` | blinky mark | delete with the seat |
| `grok-bot/skills/draw-stamped-card/recipes/bifrost-storyboard/steps.json:20` | Step label "Nudge, then CoS" | drop the CoS step |
| `docs-site/docs/plates/bifrost.md:40` | Tripwire tells CoS. Empty board wakes CoS. CoS can `POST /clock` | drop the stall tell. Empty wake and clock → forge |
| `docs-site/docs/plates/bifrost.md:44` | `evalNudges` L2/L3 and quiet/unrouted nudges go to CoS | drop the CoS wake. Owner ladder stays |
| `docs-site/docs/introduction.md:60` | L2 nudge goes to the CoS role | drop L2 |
| `docs-site/docs/guides/features-since-3.1.md:14` | Same nudge ladder to CoS | drop L2/L3. Owner keeps L1 |
| `AGENTS.md:242` | L2 to CoS. L3 wakes CoS | drop L2/L3. Owner keeps L1 |
| `docs-site/static/live/live.js:25` | blinky labeled CoS | delete the node |
| `docs-site/static/live/live.js:30` | blinky color | delete |
| `docs-site/static/live/live.js:35` | blinky label | delete |
| `docs-site/static/live/live.js:41` | subtitle "CoS seat" | delete |
| `docs-site/static/live/live.js:45` | BLINKY stamp | delete |
| `docs-site/static/live/live.js:48` | blinky map position | delete |
| `docs-site/static/live/live.js:51-56` | edges to and from blinky | delete those edges |
| `docs-site/static/live/live.js:79` | blinky bot image | delete |
| `docs-site/static/live/live.js:186` | health events draw to blinky | retarget the health edge off blinky. Do not invent the new node here |
| `docs-site/static/live/live-events.json:17` | sample seat blinky | delete |
| `docs-site/static/live/live-events.json:2367` | sample event `to: blinky` | delete or retarget in the follow-up |
| `docs-site/static/live/live-events.json:2738` | sample label mentions CoS | delete the CoS phrase |
| `docs-site/static/live/live-events.json:4252` | sample event `to: blinky` | delete or retarget in the follow-up |
| `house/live/app/server.mjs:159` | a `coord` credit returns blinky | when blinky leaves the roster, do not keep this hardcoded return. Not a reason to delete `seats.coord` |
| `house/live/app/server.mjs:283-284` | `COS = 'blinky'`. Alias `coord` → blinky. `cosSeat()` falls back here | do not delete the route to avoid this fallback. L2/L3 stop calling it |
| `house/live/app/server.mjs:288` | default `SEAT_IDS` still lists mill and blinky | drop mill with the seat. blinky stays listed while `seats.coord.seat` is blinky |
| `house/live/app/server.mjs:618` | `cosSeat()` reads `seats.coord`, else blinky | wake and clock do not use this for L2/L3. Drop `:637` and `:658` too |
| `house/live/app/server.mjs:637` | unacked-line L3 reassign wakes `cosSeat()` | drop. Keep it off forge |
| `house/live/app/server.mjs:658` | unrouted and quiet nudges go to `cosSeat()` | drop. Keep them off forge |
| `house/live/app/server.mjs:944` | `holdOwner` returns `COS` when the card has no seat | leave until Q5 |
| `house/live/app/server.mjs:1041` | L1 target falls back to `COS` | leave until Q5 |
| `house/live/app/server.mjs:1048` | L2 nudge seat is `COS` | drop. Do not retarget at forge |
| `house/live/app/server.mjs:1055` | L3 reassign wakes `cosSeat()` | drop. Do not retarget at forge |
| `house/live/app/server.mjs:1126` | handoff-missing L3 wakes `cosSeat()` | drop. Do not retarget at forge |
| `house/live/app/server.mjs:1397-1403` | `COORD_SEAT` is `seats.coord.seat`. Clock seats default to it | point the empty-board wake and the clock at forge. Leave the coord block |
| `house/live/app/server.mjs:1455` | a stall run also tells `cosSeat()` | drop. Do not retarget at forge |
| `house/live/app/server.mjs:1493` | login map still has `git:mill` and `git:blinky` | drop `git:mill`. `git:blinky` stays while Q4 holds `seats.coord.seat` |
| `house/live/app/governor.mjs:100-102` | empty wake does not run when `coord` is missing | forge is that argument. Do not pass null |
| `house/live/app/governor.mjs:104` | `startByHand` records reason `cos` | clock starter is forge. Reason text can follow in the same edit |
| `house/live/feed/routing/inbox-roles.json:110-122` | `seats.coord` seat blinky, labels needs-decision and lead | keep the whole block until Q4 |
| `grok-bot/runbooks/CRITIC.md:22` | nudge check wakes the coordinator once after L1→L3 | drop the coordinator wake. Owner ladder stays |
| `grok-bot/runbooks/SHIP.md:1` | runbook title | no seat duty. Listed so the follow-up opens the file |
| `grok-bot/runbooks/SHIP.md:16` | ship seat takes dev cards when the implementer is full | the implementer is the forge-owned cloud agent |
| `grok-bot/AGENTS.md:8` | key agents include coordinator and implementer | drop coordinator. Implementer is the cloud agent |
| `grok-bot/AGENTS.md:35` | Coordinator routes. Implementer executes | forge triages inbound. The cloud agent executes. Forge still does not mint for it |
| `src/__tests__/unit/grok-bot-house-template.test.ts:57` | Generic auto-review text must not match blinky | keep. The kit must stay free of the fleet name |
| `src/__tests__/unit/grok-bot-house-template.test.ts:72` | Generic role map must not match blinky | keep |
| `src/__tests__/unit/grok-multi-seat-wear.test.ts:200` | Temp dir named `blinky-suit` | not the role. Leave |

## Mill seat inventory

The seat that writes code and opens PRs. Not the foundry plant.

| Where | What mill does there | Replacement |
|---|---|---|
| `grok-bot/LEXICON.md:161` | Implementer is the seat that writes code and opens PRs (ours: mill) | forge-owned cloud agent. Forge is already the publisher (`LEXICON.md:162`) |
| `grok-bot/OP-PROC.md:6` | Implementer writes code and opens PRs. Publisher keeps the merge chain | cloud agent writes and opens. Forge merges. A seat still never merges code it wrote |
| `grok-bot/OP-PROC.md:7` | Code, PRs, cloud work, deploys, publish = implementer. Fasten line is the plant, not the seat | split. Seat half → cloud agent under forge. `mill+inspect` fasten stays (plant) |
| `grok-bot/OP-PROC.md:9` | Implementer sets `gates:` | the cloud agent's packet sets `gates:`. Critic may still raise, never lower |
| `grok-bot/OP-PROC.md:19` | Implementer runbook | rewrite `grok-bot/runbooks/IMPLEMENTER.md` for the cloud agent. Forge pushes |
| `grok-bot/OP-PROC.md:51` | Implementer drafts the GitHub Release notes in the npm pass | forge-owned cloud agent drafts them. Reviewer friend-test and owner publish stay |
| `grok-bot/runbooks/IMPLEMENTER.md:3` | Written by mill, the implementer seat | forge-owned cloud agent |
| `grok-bot/runbooks/IMPLEMENTER.md:18` | Commit as `mill <mill@local>` | cloud agent commits. Forge pushes with the forge App. Do not keep a mill git identity |
| `house/OP-PROC.md:15` | A seat may do a small job itself, including a file edit | eng code and PRs are the cloud agent. This line must not keep mill as the implementer |
| `house/OP-PROC.md:24` | Spend bound includes mill | drop mill |
| `house/OP-PROC.md:32-34` | mill = implementer. mill implements and opens the PR. forge does not implement | cloud agent implements and opens. forge launches it and merges. Delete "forge does not implement" |
| `house/OP-PROC.md:45` | Implement goes to mill | forge-owned cloud agent |
| `house/OP-PROC.md:46` | Suit receipt is the hire gate for mill | open only for who hires. The plant fasten stays |
| `house/OP-PROC.md:157` | Mill builds one branch per lap | forge-owned cloud agent |
| `house/live/docs/inbox.md:64` | Roster includes mill | delete from `feed/fleet-roster.json` |
| `house/live/docs/inbox.md:74` | Implement / rebase / `mill wave` routes to mill | forge. Forge launches the cloud agent |
| `house/live/docs/inbox.md:76` | `@mill` mention routes to mill | `@forge` |
| `house/live/docs/board.md:65` | start-after webhook list includes mill | drop mill |
| `house/live/docs/board.md:129` | `Seat:` trailer example `Seat: mill` | open question (credit) |
| `house/live/docs/board.md:148` | mill has no avatar, drawn badge only | delete the seat from the badge list |
| `house/live/docs/fleet-setup.md:7` | Roster names mill | delete |
| `house/live/docs/fleet-setup.md:34` | Board strip includes mill | delete from the strip |
| `house/live/docs/work-tracking.md:32` | Example map `bc-mill0001` → mill | forge, or the cloud row's owning seat. Owning seat is forge |
| `house/live/README.md:114` | mill commits through forge's identity. `Seat: mill` credits mill | open question (credit). forge0x1 already signs |
| `house/live/SETUP.md:37` | Seat-key list includes mill | drop the seat. Key deletion stays with Blaze |
| `house/live/SETUP.md:48` | mill inbox is implement / rebase asks | forge |
| `house/live/feed/fleet-roster.json:2-3` | `seats` and `board` include mill | delete mill |
| `grok-bot/templates/house/EXAMPLE.md:6` | implementer + publisher = forge | already forge. Keep that line. It matches this packet |
| `grok-bot/skills/draw-seat-emoji/SKILL.md:31` | mill glyph | delete with the seat |
| `docs-site/static/live/live.js:25` | mill labeled Eng Dev | delete the node |
| `docs-site/static/live/live.js:30` | mill color | delete |
| `docs-site/static/live/live.js:35` | mill label | delete |
| `docs-site/static/live/live.js:41` | subtitle Eng Dev | delete |
| `docs-site/static/live/live.js:45` | MILL stamp | delete |
| `docs-site/static/live/live.js:48` | mill map position | delete |
| `docs-site/static/live/live.js:51` | edge blinky–mill | delete |
| `docs-site/static/live/live.js:53` | edge mill–GitHub | delete |
| `house/live/tests/mill-forge-wake.test.mjs:1` | A `pr_open` that mentions mill attempts a mill wake | follow-up retargets that wake to forge |

## Not this retirement (mill plant)

These say mill and mean the foundry organ (build, test, ship inside the suit). Leave them.

| Where | Why it stays |
|---|---|
| `grok-bot/LEXICON.md:16-18` | mill is the plant inside the suit. Line 5's "on the mill" is this plant, in the same breath as CoS. Edit only the CoS clause |
| `grok-bot/LEXICON.md:57` | "the plant" = mill floor |
| `grok-bot/LEXICON.md:61` | organ list: mill, inspect, repertoire |
| `grok-bot/LEXICON.md:71` | mill ≠ plant (verb) |
| `grok-bot/OP-PROC.md:7` | fasten suit (mill+inspect) |
| `grok-bot/lib/seat-doctor.cjs:60-64` | `millPlantFromInventory` |
| `grok-bot/lib/seat-doctor.cjs:680-683` | fasten mill+inspect |
| `grok-bot/lib/seat-doctor.cjs:738-748` | doctor requires the mill skill file |
| `grok-bot/lib/seat-doctor.cjs:781-806` | plant PASS line |
| `grok-bot/lib/seat-doctor.cjs:928` | doctor help text |
| `grok-bot/skills/fasten-suit-and-hangar/SKILL.md:4` | plant mill+inspect |
| `grok-bot/skills/fasten-suit-and-hangar/SKILL.md:12-13` | thin mill plant |
| `grok-bot/skills/fasten-suit-per-agent/SKILL.md:4` | one mill+inspect suit per agent |
| `grok-bot/skills/fasten-suit-per-agent/SKILL.md:18` | fasten thin mill |
| `grok-bot/skills/fasten-suit-per-agent/SKILL.md:26` | inspect expects mill + inspect |
| `grok-bot/skills/plant-hangar-shops/SKILL.md:30` | do not plant hangar as a substitute for mill |
| `grok-bot/skills/ship-ready-mill-gate/SKILL.md:2` | gate name. The foundry release gate, not the seat |
| `grok-bot/skills/ship-ready-mill-gate/SKILL.md:4` | "if a mill may merge" means this gate |
| `grok-bot/skills/ship-ready-mill-gate/SKILL.md:21` | gate D. "implementer deploy/publish" is the publisher step; retarget the word implementer in the follow-up, do not delete the gate |
| `grok-bot/skills/ship-ready-mill-gate/SKILL.md:69` | "mill liturgy" as jargon to avoid |
| `grok-bot/skills/ship-ready-mill-gate/SKILL.md:86` | mill as an operating plane of the suit |
| `docs-site/docs/plates/foundry.md:8` | the mill builds and ships a suit |
| `docs-site/docs/plates/suit.md:40` | a foundry is mills and hangars |
| `docs-site/docs/plates/suit-wear.md:37` | wear fastens mill and inspect |
| `docs-site/docs/plates/glossary.md:22` | mill builds and ships the plant |
| `src/__tests__/unit/grok-bot-house-migrate.test.ts:271` | asserts the fasten mill+inspect step |
| `grok-bot/AGENTS.md:10` | fasten mill+inspect per agent | plant. Leave |
| `grok-bot/AGENTS.md:18` | doctor PASS is mill+inspect | plant. Leave |
| `grok-bot/AGENTS.md:40` | mill nested in the tarball | plant. Leave |
| `grok-bot/AGENTS.md:52` | mill gates | plant. Leave |

## Files to change (follow-up, not this PR)

- `grok-bot/OP-PROC.md`
- `grok-bot/CADENCE.md`
- `grok-bot/LEXICON.md`
- `grok-bot/runbooks/COORDINATOR.md` (delete after open questions)
- `grok-bot/runbooks/IMPLEMENTER.md`
- `grok-bot/runbooks/CRITIC.md:22`
- `grok-bot/runbooks/SHIP.md:1` and `:16`
- `grok-bot/AGENTS.md:35` (the review's `AGENTS.md:35`; line 8 is the same role list. mill+inspect lines stay)
- `house/OP-PROC.md`
- `house/live/docs/inbox.md`
- `house/live/docs/board.md`
- `house/live/docs/fleet-setup.md`
- `house/live/docs/work-tracking.md`
- `house/live/docs/README.md`
- `house/live/README.md`
- `house/live/SETUP.md`
- `house/live/PLAYBOOK.md`
- `house/live/app/server.mjs` — non-blocking, from the review: `:159` a coord credit still returns blinky; `:288` the hardcoded seat list; `:1493` `git:mill` and `git:blinky` in the login map. B1 drop list: `:618` used at `:637` (unacked-line L3 reassign), `:658` (unrouted and quiet nudge), `:1048`, `:1055`, `:1126`, and `:1455`. Keep `:637` and `:658` off forge. Also `:1397-1403`, and the blinky fallback at `:283`.
- `house/live/app/server.mjs:944` `holdOwner` and `:1041` the L1 `|| COS` fallback — leave both alone until Blaze answers Q5.
- `house/live/app/governor.mjs` — `:100-102` skips the empty wake when the coord seat is missing.
- `house/live/app/wave-schedule.mjs`
- `house/live/feed/fleet-roster.json`
- `house/live/feed/routing/inbox-roles.json` (keep `seats.coord` at `:110-122` until Q4; other blinky copies still move)
- `grok-bot/templates/house/EXAMPLE.md`
- `grok-bot/templates/house/HOUSE.md`
- `grok-bot/templates/house/WAVE-SCHEDULE.md`
- `grok-bot/skills/enterprise-cos-wave-loop/SKILL.md`
- `grok-bot/skills/synaptical-comms/SKILL.md`
- `grok-bot/skills/dist-0xrayai-publish/SKILL.md`
- `grok-bot/skills/draw-seat-emoji/SKILL.md`
- `grok-bot/skills/draw-stamped-card/recipes/bifrost-storyboard/steps.json`
- `grok-bot/skills/ship-ready-mill-gate/SKILL.md` (the word implementer on line 21 only)
- `docs-site/docs/plates/bifrost.md`
- `docs-site/docs/introduction.md`
- `docs-site/docs/guides/features-since-3.1.md`
- `docs-site/static/live/live.js`
- `docs-site/static/live/live-events.json`
- `AGENTS.md`

`grok-bot/templates/house/fleet/WAKE-ROUTINE.md` is in scope and has nothing to change.

## Plates and docs

Touched plates: `bifrost` only, among stamped plates. Introduction and features-since-3.1 repeat the L2 sentence. Live-page JS is the seat map, not a plate.

House live docs with no CoS and no mill seat, so no edit: `faq.md`, `activity-upload.md`, `sources.md`, `upstream.md`, `usmail-port-audit.md`.

## Tests (follow-up)

No new test in this PR.

- `house/live/tests/nudge-escalation.test.mjs:2-3` and `:32` lock an L3 reassign to whatever `seats.coord` names. Follow-up drops that reassign and keeps the owner ladder. Deleting the coord route is not the fix.
- `house/live/tests/mill-forge-wake.test.mjs:1` locks a mill wake. Follow-up retargets it to forge.
- `house/live/tests/test_routing_ours.py` and `house/live/tests/test_fleet_seats.py` are the roster and fallback locks cited from `inbox.md:64` and `:84`. Follow-up updates them to the roster without blinky and mill.
- Re-read `governor.test.mjs`, `test_nudges.py`, and `fleet-seats.test.mjs` in that follow-up. This packet does not claim their line numbers.
- Keep `grok-bot-house-template.test.ts` (no fleet names in the kit) and `grok-bot-house-migrate.test.ts:271` (plant).

## Open questions for Blaze

Not decided here.

1. Dist packets. CoS still drafts EXECUTE copy, friend-tests it, and rewrites openers. Herald posts those words and does not invent them (`house/OP-PROC.md:39`, `:51`; `dist-0xrayai-publish`; `synaptical-comms`). Who drafts after CoS?
2. Fleet-wide notices. Pipe down, In the dark, Lights on, and the weekly spend line in `ATTENTION_STATE.md` (`house/OP-PROC.md:23-27`). Who tells every seat?
3. Blinky's sweep. It is the backstop for dropped wakes and for seats with no webhook (`inbox.md:51`, `:58`, `:146`). Does the collector own that, or does some seat?
4. needs-decision and lead. They are `seats.coord.labels` and `needles` (`inbox-roles.json:110-122`), and `seat` is still blinky. Keep that whole block until this is answered. Forge triage, or Blaze?
5. No-owner path. Fallback for an actionable event that is not an inbound PR (`inbox.md:78`). Also `holdOwner` (`server.mjs:944`) and the L1 fallback `|| COS` (`:1041`). Leave both until this is answered.
6. Hire gate. CoS creates the agent and cards first work (`house/OP-PROC.md:46`). Who hires?
7. Boil-up trigger (`LEXICON.md:186`, `COORDINATOR.md:9`).
8. Design-before-spend agreement, cost weigh, and the daily digest (`CADENCE.md:18`, `:27`, `:40`, `:53-64`).
9. Cover CoS, the temporary stand-in when blinky's 1:1 looks dead (`enterprise-cos-wave-loop` :57-58).
10. Ship-cadence lap clock and refinement log (`house/OP-PROC.md:156`, `:163`). That section is still marked as waiting on Arch1.
11. Commit credit. `Seat: mill` and "mill commits through forge" (`board.md:129`, `house/live/README.md:114`). After the seat is gone, is every eng commit just forge0x1?
12. Seat stamps and the Dist voice line that signs blinky. Those live under `grok-bot/ops/dist/` and `grok-bot/ops/SEATS.md`, outside the tables above. Same retirement, or do they stay until the Dist question is answered?

## Out of scope

Code, route edits, roster edits, and plate edits. The mill plant. Critic, herald, magnet, nibbler, sound, arch1, and forge's publisher job, except where a row above moves a CoS or mill duty onto forge or the board.
