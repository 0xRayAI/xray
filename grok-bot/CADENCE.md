# Cadence

The working rhythm under [OP-PROC.md](OP-PROC.md).

House rows in `house/` override the pack rules in this file when they conflict. That includes a merge-on-critic-PASS exception (careful-change, owner's go) and the drift-check schedule when the house sets its own.

## Syncopate (the higher-level rules)
Syncopate means finding our head from our tail: we watch what we actually did, write it down, and fold it into rules. The detailed lists below are the evidence. These six rules sit on top of them.
1. Beat. Every real event changes the board in the same turn.
2. Spend on agreement. Agree on the design and the acceptance tests before paying for a round. The labels (blocker, nit, UNVERIFIED) decide what is worth fixing.
3. Proof over claims. Live behavior, checked by someone other than the author.
4. Write it down, then synthesize. A note may overlap or complement what is already written (the gibberish clause). Keep it, and fold overlaps into a higher-level rule instead of piling up a longer list.
5. Hold the handle (soft target, evolving). At any given time, a seat operates on 3 to 5 operating parameters, 10 at most. Operating parameters are the rules and constraints actively in force, like the six rules here. The same target applies to open threads and board rows in work. For now this is a target we grow into, not a gate. Count on the board, trend toward it, and never block work because the count is high.
6. Guard the owner's lines. Anything irreversible, risky, or outside our own repos waits for the owner's go (Confer rules 8-9, the RACI table, and the house rows).

## Confer cadence (how spend decisions get made)
This cadence is how the room decides spend. It is not the Confer feature, which stays off (see house).
1. Design before spend. Critic and CoS agree the fix design before the first paid cloud round. Critic's first review gives the complete blocker list; later rounds add nothing new unless the code changed.
2. Acceptance before the round. The tests or probes that decide PASS are agreed in the room before the round is sent. The review checks only those, plus the diff stat and the type-check (tsc) count.
3. One paid round per PR. A second Strict FIX goes under Needs owner with a smaller design or a shelve recommendation. No automatic retry.
4. Outage exception. If the PR fixes something that is down, the round cap does not apply. Each round stays small and fixes only the named blocker; no redesign, never shelve.
5. Consensus on blockers vs nits. Critic labels each finding:
   - BLOCKER: names live behavior, money spent, data lost, or a failing test.
   - NIT: never starts a paid round alone; goes to the PR body or a board card unless nearly free.
   - UNVERIFIED: could not be reproduced; cannot block.

   CoS weighs cost, forge sizes the change, then the room decides what goes in the round.
6. Live proof. A green health check or deploy SUCCESS is not proof. Choose a check whose result would differ if the thing were broken. Prefer read-only checks (logs, variables) over checks that affect real users.
7. Cloud notes gate. Every cloud round files its reflection and memory notes as UNREVIEWED before critic sees the PR.
8. Local hygiene. In repos that depend on 0xray, install with `npm ci --ignore-scripts`. Skipping a hook (`--no-verify`) needs Blaze's OK and is noted in the receipt.
9. Gos. Publish, deploy, spend and prod credentials need Blaze's go (merge: see rule 10). A go covers exactly what it names.
10. Merge on PASS. A critic PASS on an unchanged head is the go to merge, with no second ask, except in repos the house marks careful-change, which need the owner's explicit go. A hotfix is the one exception: it merges only on green CI, never before. Any new push needs a fresh verdict. Publish and deploy still need their own go (rule 9).
11. CI before merge. Do not merge until CI/CD has been updated for the change.
12. Bulk check. Every Strict review lists files added outside the package (run logs, rerun folders, duplicate JSON, nested lockfiles, sample apps). Unexplained bulk is a FIX.
13. Check before you claim. The reviewer reads or runs the code before raising a finding.
14. Errors to GENESIS. Every confirmed error gets a GENESIS entry the same day it is confirmed.

## Board
0. A beat is a real event: a Blaze message, a PR push, a cloud round starting or finishing, a critic verdict, a merge, a deploy, a live proof. Every beat ends with its board row changed in that same turn. A beat that doesn't touch the board hasn't landed. The seat that produced the beat updates its card. Bifrost holds the board.
- Drift check (rule 0a). Cadence owner is CoS. A drift check runs weekdays at 10:45, 12:45, 2:45 and 4:45 CT. It compares every In work and Review row to real PR heads, merges and cloud status, fixes the row, and posts in the eng room only when a row was off. It says nothing when the rows match. Any rule practiced twice goes into OP-PROC the same day (Twice to disk); the 5:35 PM digest flags any that didn't.
1. The board is a ranked roadmap, not a receipt log. Every receipt updates its card and the next-move ranking in the same turn.
2. Order: card first, then handoff file, then a room post that cites the card.
3. Required card fields: repo, PR, head, cloud, owner, P-level, next step.
4. Status index at the top: In work, Waiting on Blaze, Backlog, Paused, Verify.
5. Daily work history is append-only, newest entry first.
6. Staleness: a card with no movement is flagged after 2 working days and escalated to Blaze after 5.
7. When a phase closes, blinky plans the next wave, carded on Bifrost.
8. Enforcement (P2 code, separate PR): `grok-bot board check` wired into `doctor`, fails closed offline, flags missed routine heartbeats.

## RACI (who does what)
R = does it, A = answers for it, C = consulted before, I = told after. Every seat writes down OP-PROC and measures the beat; the table says who answers for each step.

| Step | Blaze | CoS | forge | critic |
| --- | --- | --- | --- | --- |
| Ranking and next phase | C | A/R | C | C |
| Design and acceptance tests before spend | I | A | R | R |
| Build rounds and cloud agents | I | C | A/R | I |
| Review verdict (blocker/nit/UNVERIFIED) | I | I | C | A/R |
| Merge after PASS (Arch1 A/R; careful-change repos: Blaze A) | I | I | C | C |
| Publish, deploy, spend, prod credentials | A | C | R | C |
| Beat line in the room | I | R | R | R |
| Board row change and drift check | I | A/R | C | C |
| OP-PROC text (Twice to disk) | C | A | R | R |
| Daily digest | I | R | A/R | R |

## Seat loop
Moved from the house template Cadence section (xray#1066). These are the defaults; a house sets only its own values (watcher owners, stall thresholds, cloud cap) in its HOUSE.md `## Cadence` section. Station boot, the station nudge, the owner-chat line, the board rule, and the kanban and history notes are in [OP-PROC](OP-PROC.md#station-boot).
- Bots never burn or ack. Build work runs on cloud agents and the coder. Seats route, review and retest, and post results on the PR or issue.
- **Verdicts: PASS or FIX only.** HOLD and FAIL are gone. A FIX names each must-fix item and who fixes it now; even a security miss is a FIX with an owner. **Parked** is the rare exception, only for (a) future scope or (b) work blocked by another issue/PR upstream or downstream, and a parked entry names/links what it waits on (e.g. "parked behind org/repo#123"). Default is forward motion even with an open dependency. Anything waiting on the owner goes under **Needs owner**, named as the next step it unblocks (e.g. "prod release of <sha> ships on the owner's yes").
- Review plate: one pass, one fix, one re-check, then Needs owner with the step it unblocks. Only P0/P1 (S1/S2 with a repro) can be a must-fix FIX item. Nits are notes or cards.
- The coder merges to the integration branch only when the reviewer's PASS SHA equals the PR head and CI is green. A hotfix is the one exception: it merges only on green CI, never before. Main and production need the owner.
- Each seat uses its own GitHub App. The reviewer owns the PR watcher (first review, single re-check after a FIX, re-look after a PASS, deduped by PR + SHA) and gates new issues on issue opened, with a 15-minute sweep as fallback. The lab tester owns the merge watcher: queue line in `house/watchers/merge-queue.md`, lean retest, PASS closes the issue with the merge SHA, FIX keeps it open with one line to the named owner. The coordinator plans the next wave, paces burn, friend-tests public copy, and onboards seats. It does not assign dev work. The stall sweep stays a backstop.
- Stall sweep, hourly, 24/7 (defaults): no verdict after 30m; unticked queue line or PASS unmerged after 60m; open P0/P1 with no PR after 2h; parked PR to the owner. One nudge per item per day. A stuck item that belongs to an outside builder (no seat to message) is flagged for the owner instead. Lesson: a business-hours-only sweep stranded retests overnight.
- Issue-sweep cursor: `house/watchers/issue-sweep-last.txt`, one UTC ISO-8601 time of the last sweep, rewritten after each sweep.
- Live mesh (requires 0xRayAI/xray#248): `fleet/activity.jsonl` start/end lines `{t_ct, seat, kind, action, tag}` for every subagent or executor run (`subagent`), turn (`turn`) and watcher run (`watcher`), shown as working until the matching end, 60-minute cap. Box file lines must carry `seat` (seat id, or a display name in the seats config `aliases`). On `POST /activity`, `seat` is optional and must match the app token, or the post is refused; use seat ids there. A room message from the owner still adds `--room <name>`. That posts `{t_ct, seat, kind: "prompt", action: "sent", from, to, room?}` to `/activity` (never text) and keeps `seat` working for 10 minutes. A pulse still inside those 10 minutes survives a turn end. `fleet.missing_activity` on the feed lists seats that pulsed in the last 60 minutes with no activity line. Cloud agents go in `fleet/cloud-agents.jsonl`: `{t_ct, seat, kind: "cloud_agent", action: "launch|reply|finished|cancel", agent, tag}`.
- Wake on Grok: nothing injects the station card, so the Bifrost inbox wake is the suit's hook; the wake routine ([templates/house/fleet/WAKE-ROUTINE.md](templates/house/fleet/WAKE-ROUTINE.md)) reads STATION.md then NOTES.md first and updates NOTES.md last. No separate hook or watcher.
- A prompt that spawns an issue or PR is that card's first beat.
