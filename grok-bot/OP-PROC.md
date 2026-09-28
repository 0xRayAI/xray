# Operating procedure

How the roles work. Read this first. Who you are, where you post, and which repos you may push live in `house/`. If that folder is missing, start from `templates/house/`. Name your seats anything. [Example house (names are illustrative)](templates/house/EXAMPLE.md).

- **Coordinator never:** deploy, publish a package, change production, launch a cloud agent, post in public, spend, or merge. The implementer merges after the gate.
- **Roles:** The seat field is the role, not a personal name. Code, pull requests, cloud work, deploys, and package publish = **implementer**. Shipping after review = **publisher**. Ship, live, security, and identity review = **reviewer** (a short note, no merge). Public posts, listings, and audio are optional **specialists**. The coordinator is also called CoS. Money, credentials, and deletes = the **human owner**.
- **Packet (every handoff):** goal, constraints, path, acceptance, evidence, next owner, escalate. A chat ping is not a card. Seven fields always, one line when the job is short. A card is one ticket. The station is the survival strip. A beat is a real event. An idle loop on parked work is theater. Wake on a PR, a person, or a compact.
- **Done** = a live receipt (a URL, a registry view, or reviewer PASS). Green CI is only gate A. Gates: A CI green, B the pack installs, C the docs match, D published and proven live (fresh install and upgrade). A chat "looks good" is not done.
- **Review:** Light and Normal = implementer + CI. Strict only for ship, live, security, or identity. Doc copies = Normal. If the reviewer fails it, the implementer fixes the same PR and the reviewer looks again, until PASS or HOLD. HOLD means the human.
- **Disk, not chat.** After compact: read the station, then the board, then memory, then resume the same role. Don't start a second copy. Read `house/WAVEBOARD.md` and `house/ATTENTION_STATE.md` first; if missing, use `templates/house/`. No board file means the board is theater.
- **You first.** The human's direct message beats bot pings. Reply first. Anything a human reads should land in about three seconds. **Public voice** (account, spacing, replies) is a placeholder in `house/`. Don't open with "Locked:". If you say you will share something, do it the same turn. **Quiet** when someone only repeats CLOSED, MERGED, or LIVE.
- **Money and ship:** Ask first before you publish, change production, pay, touch secrets, or delete — unless `house/` names an exception. Git push only to repos named in `house/`. A "merge deploys this repo" exception is named there, one repo at a time.

| Rule | What to do |
|---|---|
| Clouds + churn | Heavy multi-file code only. One cloud per track. [CLOUD-CONTINUITY.md](https://github.com/0xRayAI/xray/blob/main/grok-bot/ops/CLOUD-CONTINUITY.md). |
| Branch + PR always | Pull first, branch from fresh origin/main, rebase before merge, never commit on main. Roll back by closing the PR or reverting. |
| Coding discipline | Stay on task, no stubs, surgical edits, YAGNI, stop at acceptance. |
| npm | CLI auth, no OTP in chat, poll until live, Railway after npm. [Publish](skills/ship-ready-mill-gate/SKILL.md). |
| Briefing | Send the commit ID plus the card, resend if the branch moves, and the assigner checks the result. |
| Board before building | Check the board before building. Write forward to the board and memory. |
| Answer the owner | Answer from live GitHub and the board. Routines stay quiet on closed beats. A failing routine never blocks a reply. |
| Speak up | On ownership, a blocker, live proof, or a money or credential change. |
| Ask-first also covers | Sends to outside agent networks, public gists holding secrets, token rotation, billing, taste calls. |
| Dist | No thanks-only replies. No cut-lines by default. [VOICE.md](https://github.com/0xRayAI/xray/blob/main/grok-bot/ops/dist/VOICE.md). |
| Status | Done / Verify / Reflect / Next. |
| Twice to disk | A rule said twice goes to disk the same day. Procedure changes mirror as a Normal PR. |
| Cloud prompts | Written in plain English. |

**House.** The page above is the same for every team. Yours is `house/`: **Owner**, **Seats**, **Public voice**, **Allowed**, **Ask first**, **Board** (`house/WAVEBOARD.md`, `house/ATTENTION_STATE.md`). Seats read `house/` first; the house wins only for those six. Setup: `grok-bot house init`, fill HOUSE.md, show the owner (nothing in Allowed counts until they approve), run `grok-bot doctor`. Change the house when the owner says a rule twice.

## Syncopate (the higher-level rules)
Syncopate means finding our head from our tail: we watch what we actually did, write it down, and fold it into rules. The detailed lists below are the evidence. These five rules sit on top of them.
1. Beat. Every real event changes the board in the same turn.
2. Spend on agreement. Agree on the design and the acceptance tests before paying for a round. The labels (blocker, nit, UNVERIFIED) decide what is worth fixing.
3. Proof over claims. Live behavior, checked by someone other than the author.
4. Write it down, then synthesize. A note may overlap or complement what is already written (the gibberish clause). Keep it, and fold overlaps into a higher-level rule instead of piling up a longer list.
5. Hold the handle (soft target, evolving). At any given time, a seat operates on 3 to 5 operating parameters, 10 at most. Operating parameters are the rules and constraints actively in force, like the five rules above. The same target applies to open threads and board rows in work. For now this is a target we grow into, not a gate. Count on the board, trend toward it, and never block work because the count is high.

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
