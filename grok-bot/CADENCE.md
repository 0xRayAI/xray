# Cadence

The working rhythm under [OP-PROC.md](OP-PROC.md).

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
3. One paid round per PR. A second Strict FAIL goes to Blaze with a smaller design or a shelve recommendation. No automatic retry.
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
10. Merge on PASS. A critic PASS on an unchanged head is the go to merge, with no second ask, except in repos the house marks careful-change, which need the owner's explicit go. Any new push needs a fresh verdict. Publish and deploy still need their own go (rule 9).
11. CI before merge. Do not merge until CI/CD has been updated for the change.
12. Bulk check. Every Strict review lists files added outside the package (run logs, rerun folders, duplicate JSON, nested lockfiles, sample apps). Unexplained bulk is a FAIL.
13. Check before you claim. The reviewer reads or runs the code before raising a finding.
14. Errors to GENESIS. Every confirmed error gets a GENESIS entry the same day it is confirmed.

## Release gate: wear what we ship
On 2026-09-28, 0xray 4.0.29 (#141) passed CI and critic and broke setup for non-git projects. `wear` and `setup` exited `not a git work tree`. Nobody installed the packed tarball and ran what users run. Our seat suits are non-git, so one local wear would have caught it.
1. Before critic review and again before publish: local build, then `npm pack`. Install that tarball on the forge seat suit first, then run the command the install message tells users to run (`npx 0xray wear`), then `doctor`, then one real run. Next, one more seat. Then fresh temp folders, one git and one non-git, each with a temp HOME: run wear, setup, and doctor, and diff the files written against the previous version.
2. The critic gives no PASS on anything that ships to npm without personally installing the packed tarball and running the user command.
3. Only the exact tarball that passed gets published. Record its shasum in the release receipt. Seats re-wear one at a time.
4. If a published release is broken, first move npm `latest` back to the last good version (`npm dist-tag add <pkg>@<good> latest`), then fix forward.

## Board (WAVEBOARD)
0. A beat is a real event: a Blaze message, a PR push, a cloud round starting or finishing, a critic verdict, a merge, a deploy, a live proof. Every beat ends with its board row changed in that same turn. A beat that doesn't touch the board hasn't landed. The seat that produced the beat posts one line in the room; CoS turns it into the row change.
- Drift check (rule 0a). Cadence owner is CoS. A drift check runs weekdays at 10:45, 12:45, 2:45 and 4:45 CT. It compares every In work and Review row to real PR heads, merges and cloud status, fixes the row, and posts in the eng room only when a row was off. It says nothing when the rows match. Any rule practiced twice goes into OP-PROC the same day (Twice to disk); the 5:35 PM digest flags any that didn't.
1. The board is a ranked roadmap, not a receipt log. Every receipt updates its card and the next-move ranking in the same turn.
2. Order: card first, then handoff file, then a room post that cites the card.
3. Required card fields: repo, PR, head, cloud, owner, P-level, next step.
4. Status index at the top: In work, Waiting on Blaze, Backlog, Paused, Verify.
5. Daily work history is append-only, newest entry first.
6. Staleness: a card with no movement is flagged after 2 working days and escalated to Blaze after 5.
7. When a phase closes, CoS starts the next non-capital phase immediately.
8. Enforcement (P2 code, separate PR): `grok-bot board check` wired into `doctor`, fails closed offline, flags missed routine heartbeats.

## RACI (who does what)
R = does it, A = answers for it, C = consulted before, I = told after. Every seat writes down OP-PROC and measures the beat; the table says who answers for each step.

| Step | Blaze | CoS | forge | critic |
| --- | --- | --- | --- | --- |
| Ranking and next phase | C | A/R | C | C |
| Design and acceptance tests before spend | I | A | R | R |
| Build rounds and cloud agents | I | C | A/R | I |
| Review verdict (blocker/nit/UNVERIFIED) | I | I | C | A/R |
| Merge after PASS (careful-change repos: Blaze A) | I | I | A/R | C |
| Publish, deploy, spend, prod credentials | A | C | R | C |
| Beat line in the room | I | R | R | R |
| Board row change and drift check | I | A/R | C | C |
| OP-PROC text (Twice to disk) | C | A | R | R |
| Daily digest | I | R | A/R | R |
