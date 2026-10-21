# House OP-PROC

House: 0xRay Grok Bot fleet. Blaze owns it. His direct message comes before a bot ping.

OP-PROC is **layered**: pack base (`grok-bot/OP-PROC.md`) then this house file (`house/OP-PROC.md`). Seats read house/ first; house wins for Owner, Seats, Public voice, Allowed, Ask first, Board — not by erasing the pack.

## 1. Compute is the scarcest resource

- A wake must be worth the cost. Plan once. Read only what the job needs. Send one short reply.
- Quiet when nothing changed. No reflexive ack, ping, or chime.
- Each seat watches its own empty replies and keeps its own notes. CoS does not police chimes.
- Bifrost routes the inbox. CoS does not assign dev work. A seat stamps **Done**, **Verify**, and **Next** only when the state changed. No stamp and no ping when nothing moved.
- Message one owner. Do not fan out. Do not post to a room if that would wake every member for no reason.
- After a real close, blinky plans the next wave, carded on Bifrost. Aim for about two agents awake per real state change.
- A seat does a small job itself: a check, a rerun, a merge after the gate, a file edit. A seat does not deploy from its own computer. A cloud agent deploys. See [Clouds + churn](../grok-bot/OP-PROC.md#clouds-churn).
- Webhook, `critic_bc`, and who launches a cloud: see [Clouds + churn](../grok-bot/OP-PROC.md#clouds-churn). Before a launch, read `ATTENTION_STATE.md` and do not launch when the day is over pace or weekly burn is at 75% or more, except a hotfix.
- **Packet-first.** See [Packet-first](../grok-bot/OP-PROC.md#packet-first) and [Green sign-off](../grok-bot/OP-PROC.md#green-sign-off). The owner's chat acts on one flushed `batch` (`run_end` or `ci_pass`), not on each follow-up.
- **Forward-motion.** See [Forward-motion](../grok-bot/OP-PROC.md#forward-motion). A second FAIL of an original blocker goes to Blaze.
- A strict review that is already on a Card does not need a second yes.
- Work moves on a **Beat**. Do not poll on a timer when an event exists. A script may poll; the seat may not. Seeing a line starts the work.
- **Queue.** A non-empty live-inbox read is the queue, in order, this turn. A non-empty read is the work; a seat never reads open lines and then waits.
- **Server, not seats.** Scripted services (collection, cards, dispatcher, nudges, inbox writes, push wakes, health checks) run on the server. AI seats do judgment work only, because an AI turn is expensive. A seat never runs a loop a script can run. A script may poll; the seat may not, and a line the script already found is the seat's work the turn it sees it.
- Blaze reports the weekly spend. CoS logs it in `ATTENTION_STATE.md`. At 50 percent, **Pipe down** is soft: no new Cards. At 75 percent, Pipe down is full.
- **Compute budget (HARD).** Live spend and what is left this week are in `ATTENTION_STATE.md`; check it before heavy work. That bound sits on CoS, forge, and critic alike. CoS paces burn: do not launch when the day is over pace, and at or above 75% weekly burn the empty-board wake and the plan card stay quiet.
- **Pipe down.** Blaze calls it. CoS relays it. Write what is in hand, then stop. Routines pause.
- **In the dark.** CoS declares it when a shared limit is hit. The notice names the limit, what is blocked, and the resume time. Do not retry. Do not route around it.
- **Lights on.** CoS confirms the limit has cleared. Seats resume the normal Queue rule above.
- **Seat computer dead.** If the seat Shell fails (ENOENT, bash missing, or the computer is dead), try **Update Grok Bot's Computer** (box reboot) first. Do not Escalate until that has been tried.
- Park a seat that has merged, been idle three days, or finished. CoS lists it. Blaze deletes it. Do not route work to it.

- On any inbound message, the seat runs the station skill first. The rule is [Station boot](../grok-bot/OP-PROC.md#station-boot).
- A real owner-chat source is future work. This is the line: On every owner message, first run `live-inbox <seat> --prompt --from owner --note "<gist>"`; after handling any inbox line (in chat or on a wake), ack it right away with `live-inbox <seat> --ack <id>` (or `--ack all` once everything open is handled); when you launch or resume a cloud agent run `live-inbox <seat> --turn start --tag "bc-<first8> <track>"`; when it finishes or is cancelled run `live-inbox <seat> --turn end --tag "bc-<first8>"`. No exceptions for short turns.

## 2. One owner per job

- Pack roles map here: the cloud agent forge launches = implementer, **forge** = publisher/merge seat, **critic** = reviewer, **blinky** = CoS.
- The cloud agent forge launches implements and pushes the branch. forge opens the pull request through its App.
- **forge** keeps continuity and the gates, launches that cloud agent, and merges. **Fleet merge (xray and every other house repo):** forge merges only after a visible **critic0x** App PASS and the gates for its tier (see "Allowed without asking"), and only as the seat App **forge0x1** (app id 5143509). Critic never merges.
- **Gated OP-PROC.** Major releases, new features, and tips that change house OP-PROC gates (release cycle, merge locks, this Arch1 rule) do **not** merge until **Arch1** gives a deep review and yes on the PR. A critic PASS alone is not enough. forge0x1 holds that merge until Arch1 yes. An inbox yes/no from Arch1 is that decision, and it must name the PR. A hold on one PR does not hold the next ask; any "wait for Blaze" or "wait for Arch1" must name the PR.
- Eng seats ship as **forge0x1**, not the personal login. If the open head is the wrong author, forge0x1 opens one replacement pull request, closes the old one with a pointer, and does not keep pushing that wrong-author head.
- **critic** writes PASS or FAIL, cites the section, and never merges. Nobody writes their own proof.
- **herald** posts only after Blaze's go, and only the words CoS handed over. Herald does not invent the post.
- **magnet** owns listings. **sound** owns audio.
- **Blaze** owns money, credentials, deletes, publishing, production, and taste.
- **CoS** (blinky) plans the next wave at each close, paces burn (no launch when the day is over pace; at or above 75% weekly burn the empty-board wake and the plan card stay quiet), friend-tests Lane H and writes Dist packets, and onboards seats, including suit fitting. CoS lists a finished or idle seat. Blaze deletes it. CoS does not assign dev work, deploy, publish, spend, or merge. Bifrost keeps the board, inbox routing, and wave timing.
- **Arch1** builds a fix or a **Plate** only when Blaze hands over that track. The fleet stops that work. The spec is friend-speak: the bug, how to reproduce it, what fixed looks like, and the paths.
- **App credentials.** Agents always use the seat GitHub App credential — never post/submit as the logged-in personal account. Arch1 is outside the fleet: see **Two loops** in the pack OP-PROC (`grok-bot/OP-PROC.md`). An order or yes in a comment must @-mention the next seat, because the inbox reads only a comment's label and @handles, never its body; the words "may merge" are not a merge ask. Asks **to** Arch1 (Gate B runs, deep-review asks): a PR or issue comment that @-mentions **@arch10x**, never a separate post to his Bifrost inbox. The collector turns that comment into his inbox line, which wakes him (his watcher runs inside Grok CLI on Blaze's machine), and he posts the receipt on the PR. Forge sends the packet to CoS. Arch1's inbox yes/no on an ask is the decision and must name the PR; a hold on one pull does not hold the next ask.
- Ask once. Implement goes to the cloud agent forge launches. Gates go to forge. PASS or FAIL goes to critic. Dev talk is Blaze and forge. The cos-forge 1:1 carries the printed `live-inbox` handoff line. A room post is not a handoff.
- **Hire gate (new employee / seat):** before any ship work — (1) CoS creates the agent with a clear role description + hire packet; (2) fasten suit at `/workspace/<seat>-suit` (mill+inspect) with inspect receipt on disk (`.xray/state/SUIT-RECEIPT.md` plus inspect `ok: true`, `suit: fastened`, costume false); (3) employee orientation + KB (`kb/EMPLOYEE-ORIENTATION.md`, scope, mem-grow, `kb/ROLE-CARD.md` when Dist announced the role); (4) seat reads KT and acks `KT read · suit fastened · quiet until carded`; (5) if Dist announced the role, board gets a standing **ROLE** card matching that announcement and CoS cards first work under it — seat does not freelance. A chat packet is not a suit. Profile alone is not a hire.
- **Auto-review.** The Always-allow ban on App PEM, token minting and App review is revoked (see "Room vs 1:1 writes", #291). PEM text and tokens are still never printed or stored.
- In chat, follow [Station boot](../grok-bot/OP-PROC.md#station-boot) for the prompt log. This file is the house-only layer.

- **Confer.** Confer and Calling stay **off** unless Blaze turns them on. An unreviewed result with no model in the loop must not pass.
- **Dist.** When Dist is armed: one idea per public post, no double-post, no thanks-only replies. Friend-test before send. Blaze's go is still required. Dist stays stopped until CoS posts Ship-it after the wear gate.

## 3. Nothing ships unproven

- **Review plate.** See [Forward-motion](../grok-bot/OP-PROC.md#forward-motion). A PASS ends it. A failed re-check of an original blocker is parked for Blaze. A new finding on that re-check is an issue, not a FAIL.
- The words must match the live thing. Do not say personalized, generated, or composed for one person when the asset is the same for everyone. Fix the catalog and the page.
- Open as a draft. Critic reviews by tier (Light, Normal, or Strict; see section 3). Merge only after the gate. Do not land unreviewed work on main.
- **Wrong-author supersede.** If the open head is not forge0x1 when forge0x1 is required, forge0x1 opens one replacement pull request and closes the old one with a pointer. A forge0x1 FAIL stays on that Review plate. Do not open a new pull request for every FAIL.
- A **Nit** does not block by itself. An unverified finding does not block. See [Forward-motion](../grok-bot/OP-PROC.md#forward-motion).
- A blocking FAIL is a live break: wrong ship, money, lost data, or a security hole. Name the file and the check that fails on the old code.
- A **Ship-gate FAIL** still blocks: the packed install was skipped or used the wrong package, a secret remains, stamp choruses are in the product, or an Arch1-gated tier merged without Arch1's yes.
- A blocking FAIL becomes an issue with the repro and the file to fix. A Nit is APPROVE plus a follow-up issue. An issue is a card. One pull request per issue, with `Fixes #N`. Merge closes the issue. A parked pull request leaves the issue open and labeled parked. A review FAIL stays on the pull request unless it is a new blocking break.
- A fix is the smallest change that solves the problem and passes its checks. Bigger work gets its own Card.
- **Docs follow code.** After every merged change, update the docs site in the same track. Every deploy or run issue becomes a generic Symptom / Cause / Fix entry in the troubleshooting FAQ.
- One seat holds one active ship. Forge may hold three cards that CoS can see. What a card is: see [Card](../grok-bot/OP-PROC.md#card).

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

**Fail:** wasted tokens · rabbit holes · boilerplate · a chat "LGTM" without Strict proof · the coordinator doing eng work · a cloud agent doing seat work · one cloud agent carrying work that meets the split threshold one job after another · OS docs that fail the friend test.

## 4. Lines only Blaze crosses

Ask first:

- Publishing a package, a release page, a listing, or a public post, except the wear-gate path in section 3.
- A production deploy, money, credentials, token changes, and deletes.
- A message to a person outside the fleet.
- A connector. Blaze clicks connect. A bot does not add one to get around a block.
- A merge that deploys. Name that repo in `house/`, one repo at a time.

Allowed without asking:

- Read a live site, repo, or dashboard that is in scope.
- Push a branch and open a pull request. Do not commit straight to main.
- Merge by tier, when section 3 allows it. Gates: A CI green, B **on Blaze's machine**: the packed tarball + per-env checklist (git and non-git folder, temp home, run and update `.cjs`/`.mjs` for Cursor, Grok CLI, Hermes, OpenCode, OpenClaw) runs LOCALLY only: forge via Blaze-approved local tool steps, or local Arch1 on Grok CLI (asked by a PR comment @-mentioning @arch10x, which the collector turns into his inbox line). Cloud Arch1 and cloud agents may do review, A and C, never B; whoever runs it posts the receipt; B is unverified until then, C the docs match the code (stamp + `npm run release:docs-check`), D published and proven live (fresh install and upgrade, annotated tag pushed, GitHub Release so Latest flips).
  - **Floor:** gate A (CI green) and gate C (stamp + `npm run release:docs-check`) on every merge. B and D are set per PR by scope in the packet `gates:` field (implementer sets; critic may raise, never lower; locked once review starts). Core questions: works across all TUI environments (Cursor, Grok CLI, Hermes, OpenCode, OpenClaw), docs updated throughout. Per-scope criteria: set per PR for now.
  - Fix and small PRs: critic0x Light PASS + gates A–C (D n/a, nothing published).
  - Releases: critic0x Strict PASS + gates A–D; D is checked after publish as the wear gate.
  - Major releases, new features, and OP-PROC gate changes: all of the above plus Arch1's deep review and yes on the PR before forge merges.
- The lead or operator makes necessary small changes and merges by tier (critic PASS + the gates for that tier; Arch1 yes where the tier needs it) without asking the human. The human sees only real decisions: money, credentials, deletes, publishing, production, and taste.
- A lab check that does not spend and does not publish.

Public words are friend-speak. Test them on a person before they go out.

## 5. Rules flow upstream

- A rule that belongs in the product goes upstream. Pull from upstream before starting work.
- Upstream, the fleet page and its system are called **Bifrost**, not "live". Nothing private goes upstream: no house data, no seat names, no internal URLs, no secrets.
- The generic board lives upstream. We build and triage; we own Bifrost and fold fixes in ourselves; Arch1's yes is the gate into main. Show the human anything before it posts upstream (PR, issue, or comment).
- **Organ gate**, **CAP**, **Lens**, and **Plate** stay defined in the Lexicon. Do not expand them here.
- Changes to this file are committed in git. Do not keep a second copy.

## Lexicon

- **Review plate.** One pass, one fix, one re-check, then stop. Wear-gate is not a Review plate.
- **Nit.** A review finding below a blocking FAIL. APPROVE plus a follow-up issue. See [Forward-motion](../grok-bot/OP-PROC.md#forward-motion).
- **Ship-gate FAIL.** A missed or wrong packed install, a secret left in, stamp choruses in the product, or an Arch1-gated tier without Arch1 yes. It still fails at publish.
- **CAP.** The plan when something fails the Organ gate. Plan, build, wear, validate.
- **Pipe down.** Write what is in hand, then stop. Routines pause.
- **In the dark.** A shared limit is hit. Name it. Do not route around it.
- **Lights on.** The limit has cleared. The normal Queue rule applies again.
- **Queue.** A non-empty live-inbox read is the queue, in order, this turn.
- **Packet.** Goal, constraints, path, acceptance, gates, evidence, next owner, escalate (the same eight fields as the pack).
- **Handoff = packet + wake.** See **Two loops** and the handoff rule in the pack OP-PROC (`grok-bot/OP-PROC.md`). House detail: until a seat has an inbox key, the fallback is a PR comment plus the room.
- **Card.** See [Card](../grok-bot/OP-PROC.md#card).
- **Role card.** Standing board ticket (+ `kb/ROLE-CARD.md`) that makes a Dist hire announcement operational for that seat.
- **Station.** A seat's short survival note on disk.
- **Ping-pong.** Seat to seat on a pull request or an issue: review, fix, check again, merge. Not a public post.
- **Beat.** A real event, not a timer.
- **Arch1.** The builder outside the fleet. Specs are friend-speak.
- **Organ gate.** Useful, fit for purpose, production grade, powers up the suit.
- **Lens.** The search door: one token, one skill, and the related Plates.
- **Plate.** The stamped drawing. The entry, exit, setup, and teardown template is not a Lens.

## Board

The board is useful and obvious: find a need, fill a need, don't make the human think. At a glance it shows who is working on what and what is stuck. Upstream and foreign repos show only the PRs and issues we opened. A seat's cloud agent activity counts as that seat being present.

When `LIVE_URL` is unset, open cards are hand-kept in `house/WAVEBOARD.md`. When `LIVE_URL` is set, the board is Bifrost (`GET /cards`). What needs Blaze lives in `ATTENTION_STATE.md`. Do not repeat that status in chat.

Watchers follow Beats on the repos named in `house/WATCHERS.md`. On new activity they create or bump a card (signal→ticket) with a Done·Verify·Next owner: a Bifrost card when `LIVE_URL` is set, and a card in local `house/WAVEBOARD.md` when `LIVE_URL` is unset. GitHub signals: issue, pull request, review, checks, merge. X signals: mention or reply, only when Dist policy allows that class. Watcher ≠ implementer ≠ Dist — queue only; seats execute; watchers do not ship Dist or merge. Quiet when nothing changed. CoS owns the board digest. Forge owns the engineering cadence. A wake hands off to the owner's chat. It does not launch or resume a cloud agent.

The logged command is [Station boot](../grok-bot/OP-PROC.md#station-boot). Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --turn end --tag "bc-<first8>"`. `--from owner` is required today.

Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`.

History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.

## Ship cadence

Not in effect. Arch1, 2026-10-21, on #531: do not run the 2026-10-13 cadence. Green CI does not mean merge. The release cycle in section 3 stands (#219).

## Hotfix

The rule is [Hotfix bypass](../grok-bot/OP-PROC.md#hotfix-bypass). The old P1 path (roll back first, then deploy `dev` before merge) is not in effect.

**Room vs 1:1 writes.** See [Room vs 1:1 writes](../grok-bot/OP-PROC.md#room-vs-1-1-writes). Never split, rename or rework a command to get past a check.

**Drill refinements.**
- Ack rules: see [Ack](../grok-bot/OP-PROC.md#ack).
- A wake change is tested against a real seat routine (2xx and the routine runs), not unit stubs alone. A wake test sends a well-formed inbox line; receipt = `200 added:1` + `wake: <seat> ok` + the seat confirms.
- Waveboard history lives on the `/data` volume; a redeploy keeps it. Confirm a diff does not touch `/data`.
- Our install is public (no password, no masking); other installs stay gated and masked unless they opt in.
- Seats ask Blaze yes/no questions in his 1:1. Webhook and key links go only in the owner's 1:1.
- One PR per lap: follow-ups and nits fold into the open PR, never a new one.
- A rebase with byte-identical files gets a re-stamp in seconds. Critic PASS still comes before merge. See [Packet-first](../grok-bot/OP-PROC.md#packet-first) and [Review](../grok-bot/OP-PROC.md#review).
- Blaze: land the changes first, then one final test pass after they're live.
- Critic owns validating the live board: the final pass checks the data each seat shows (step 6), not just the page title and `/healthz` (Blaze caught example names and every seat idle on 2026-10-13).
- Verify routing with a real GitHub-created event (an issue, a PR, a push), not only wakes we send ourselves: issue #281 (11:22 CT) routed to the kit's sample seat `triager`, an inbox nobody reads, while our test wakes passed.
- Closed in lap 2: `live-inbox` runs on its defaults (no hand-passed URL or folders; our box sets the folder variables, see `house/live/docs/inbox.md`), and `/cards` is readable without a key in public mode.

## Done when

A Card is done when its receipt is on the PR and its board card is closed.

This file is house/OP-PROC.md for our fleet. Pack stays generic; this file is the house layer.

## Pulsar

Initial: the find starts at `grok-bot/ops/arcade/RANGE.md`.
Selected: (none)
