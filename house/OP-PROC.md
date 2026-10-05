# House OP-PROC

These rules apply to every house. This file names no house. Blaze owns it. His direct message comes before a bot ping.

## 1. Compute is the scarcest resource

- A wake must be worth the cost. Plan once. Read only what the job needs. Send one short reply.
- Quiet when nothing changed. No reflexive ack, ping, or chime.
- Each seat watches its own empty replies and keeps its own notes. CoS does not police chimes.
- **CoS** assigns. A seat stamps **Done**, **Verify**, and **Next** only when the state changed. No stamp and no ping when nothing moved.
- Message one owner. Do not fan out. Do not post to a room if that would wake every member for no reason.
- A seat does a small job itself: a check, a rerun, a merge after the gate, a file edit.
- Heavy work resumes the same cloud. Log that cloud id on the Card. No new cloud without Blaze's yes.
- A strict review that is already on a Card does not need a second yes.
- Work moves on a **Beat**. Do not poll on a timer when an event exists.
- Blaze reports the weekly spend. CoS logs it in `ATTENTION_STATE.md`. At 50 percent, **Pipe down** is soft: no new Cards. At 75 percent, Pipe down is full.
- **Compute budget (HARD).** The house burned about 35 percent of the weekly allotment in about 24 hours. What is left must cover about six days. That bound sits on CoS, forge, critic, and mill alike.
- **Pipe down.** Blaze calls it. CoS relays it. Write what is in hand, then stop. Routines pause.
- **In the dark.** CoS declares it when a shared limit is hit. The notice names the limit, what is blocked, and the resume time. Do not retry. Do not route around it.
- **Lights on.** CoS confirms the limit has cleared. Each seat picks up its queue in order.
- **Seat computer dead.** If the seat Shell fails (ENOENT, bash missing, or the computer is dead), try **Update Grok Bot's Computer** (box reboot) first. Do not Escalate until that has been tried.
- Retire a seat that has merged, been idle three days, or finished. CoS lists it. Blaze deletes it. Do not route work to it.

## 2. One owner per job

- **mill** implements and opens the pull request.
- **forge** keeps continuity and the gates. Forge does not implement. **Fleet merge (xray and every other house repo):** forge merges only after a visible **critic0x** App PASS and green CI, and only as the seat App **forge0x1** (app id 5143509). **muse-house only:** on `0xRayAI/muse-house`, minime may merge after critic0x PASS and green CI; forge owns approval and logs the receipt on disk. Critic never merges.
- **Gated OP-PROC.** A tip that changes house OP-PROC gates (release cycle, merge locks, this Arch1 rule, related house OP-PROC) does **not** merge until **Arch1** says yes. A critic PASS alone is not enough. forge0x1 holds that merge until Arch1 yes.
- Eng seats ship as **forge0x1**, not the personal login. If the open head is the wrong author, forge0x1 opens one replacement pull request, closes the old one with a pointer, and does not keep pushing that wrong-author head.
- **critic** writes PASS or FAIL, cites the section, and never merges. Nobody writes their own proof.
- **herald** posts only after Blaze's go, and only the words CoS handed over. Herald does not invent the post.
- **magnet** owns listings. **sound** owns audio.
- **Blaze** owns money, credentials, deletes, publishing, production, and taste.
- **CoS** assigns and keeps the board. CoS does not deploy, publish, spend, or merge. CoS steps in when the loop stalls.
- **Arch1** builds a fix or a **Plate** only when Blaze hands over that track. The fleet stops that work. The spec is friend-speak: the bug, how to reproduce it, what fixed looks like, and the paths.
- **App credentials.** Agents always use the seat GitHub App credential — never post/submit as the logged-in personal account. Arch1 orders travel on a pull request, comment, or issue — a chat line is not an order.
- Ask once. Implement goes to mill. Gates go to forge. PASS or FAIL goes to critic.
- A new seat does no ship work until the suit receipt is on disk at `.xray/state/SUIT-RECEIPT.md`, with the inspect result ok and the suit fastened. A chat note is not a suit.
- In chat, a seat follows this file. It does not wear the whole suit.

- **Confer.** Confer and Calling stay **off** unless Blaze turns them on. An unreviewed result with no model in the loop must not pass.
- **Dist.** When Dist is armed: one idea per public post, no double-post, no thanks-only replies. Friend-test before send. Blaze's go is still required.

## 3. Nothing ships unproven

- **Review plate.** One pass, one fix, one re-check, then stop. A PASS ends it. A failed re-check is parked for Blaze. There is no third lap.
- The words must match the live thing. Do not say personalized, generated, or composed for one person when the asset is the same for everyone. Fix the catalog and the page.
- Open as a draft. Critic reviews Light or Normal. Merge only after the gate. Do not land unreviewed work on main.
- **Wrong-author supersede.** If the open head is not forge0x1 when forge0x1 is required, forge0x1 opens one replacement pull request and closes the old one with a pointer. A forge0x1 FAIL stays on that Review plate. Do not open a new pull request for every FAIL.
- A **Nit** is noted on the pull request or on a **Card**. A Nit does not block by itself. An unverified finding does not block.
- A blocking FAIL is a live break: wrong ship, money, lost data, or a security hole. Name the file and the check that fails on the old code.
- A **Ship-gate FAIL** still blocks: the packed install was skipped or used the wrong package, a secret remains, stamp choruses are in the product, or a careful-change merged without Blaze's go.
- A blocking FAIL becomes an issue with the repro and the file to fix. A Nit becomes a Card, not an issue. One pull request per issue, with `Fixes #N`. Merge closes the issue. A parked pull request leaves the issue open and labeled parked. A review FAIL stays on the pull request unless it is a new blocking break.
- A fix is the smallest change that solves the problem and passes its checks. Bigger work gets its own Card.
- A **Card** has Done when and Stops at. One seat holds one active ship. Forge may hold three Cards that CoS can see.

**Release cycle.** Every cut, in this order. Arch1 locks these words. A critic pass alone does not change them.

1. **Bump.** Raise the package version in its own step. The version tool does not bump the version.
2. **Stamp.** The version tool writes the changelog note for this cut. It updates the current-version words in the guides. It leaves old changelog headings as they are. It leaves the guide of older versions as it is. It leaves files under `.xray/state` as they are.
3. **Plates.** Each Plate in `docs-site/docs/plates/` shows the version being cut. The release tool does not edit those files. The cut does, before the pack.
4. **Docs check.** The docs check passes before the pack.
5. **Tests.** Critic confirms passage on that same commit and writes PASS or FAIL on the pull request. Every unit test passes. The Playwright battery passes, and the coverage from that battery is part of the result. A green CI check is not passage. Forge does not confirm passage. Forge does not merge on a green CI check.
6. **Release page.** After the wear-gate and the ship go: publish that exact package, push the annotated tag, then open the GitHub release page. The tweet file the tool writes is not a post. A public post still needs Blaze's go.

**Wear-gate.** After merge and before publish: build, pack, and install that exact package in a fresh git folder and a fresh non-git folder, with a temporary home. Then run wear, setup, and doctor. This is not a Review plate.

After that wear-gate passes, and after the ship go plus critic's wear PASS, forge publishes that exact package only. Then the tag. Then the release page. Other publishes still ask Blaze first.

**Evidence before grade**

1. Agree the check before the run.
2. The check must come out different if the thing is broken.
3. Nobody writes their own proof.
4. No grade until that check has happened.
5. Missing evidence stays unverified, not FAIL.

## 4. Lines only Blaze crosses

Ask first:

- Publishing a package, a release page, a listing, or a public post, except the wear-gate path in section 3.
- A production deploy, money, credentials, token changes, and deletes.
- A message to a person outside the fleet.
- A connector. Blaze clicks connect. A bot does not add one to get around a block.
- A merge that deploys. Name that repo in `house/`, one repo at a time.
- A careful-change repo named in `house/`. Critic PASS is not enough there.

Allowed without asking:

- Read a live site, repo, or dashboard that is in scope.
- Push a branch and open a pull request. Do not commit straight to main.
- Merge after a visible critic0x PASS and green CI, when section 3 allows it (and Arch1 yes when the tip is gated OP-PROC).
- A lab check that does not spend and does not publish.

Public words are friend-speak. Test them on a person before they go out.

## 5. Rules flow upstream

- A rule that belongs in the product goes upstream. Pull from upstream before starting work.
- **Organ gate**, **CAP**, **Lens**, and **Plate** stay defined in the Lexicon. Do not expand them here.
- Changes to this file are committed in git. Do not keep a second copy.

## Lexicon

- **Review plate.** One pass, one fix, one re-check, then stop. Wear-gate is not a Review plate.
- **Nit.** A review finding below a blocking FAIL. Note it on a Card. It does not fail a pull request by itself.
- **Ship-gate FAIL.** A missed or wrong packed install, a secret left in, stamp choruses in the product, or a careful-change without Blaze. It still fails at publish.
- **CAP.** The plan when something fails the Organ gate. Plan, build, wear, validate.
- **Pipe down.** Write what is in hand, then stop. Routines pause.
- **In the dark.** A shared limit is hit. Name it. Do not route around it.
- **Lights on.** The limit has cleared. Pick up the queue in order.
- **Packet.** Goal, constraints, path, acceptance, evidence, next owner, escalate.
- **Card.** One ticket, one seat, Done when, Stops at.
- **Station.** A seat's short survival note on disk.
- **Ping-pong.** Seat to seat on a pull request or an issue: review, fix, check again, merge. Not a public post.
- **Beat.** A real event, not a timer.
- **Arch1.** The builder outside the fleet. Specs are friend-speak.
- **Organ gate.** Useful, fit for purpose, production grade, powers up the suit.
- **Lens.** The search door: one token, one skill, and the related Plates.
- **Plate.** The stamped drawing. The entry, exit, setup, and teardown template is not a Lens.

## Board

Open Cards live in `WAVEBOARD.md`. What needs Blaze lives in `ATTENTION_STATE.md`. Do not repeat that status in chat.

Watchers follow Beats on the repos named in `house/WATCHERS.md`. They cover issues and pull requests: open, review, checks, merge. Quiet when nothing changed. CoS owns the board digest. Forge owns the engineering cadence. A wake resumes the same seat and the same cloud id.

## Done when

This file is the procedure for every house. It names no house. The details above are the rules, not a diary.
