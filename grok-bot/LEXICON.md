# Fleet lexicon (plain)

Stamp products: `ops/dist/brand/STAMPS.md`. The pack [OP-PROC](OP-PROC.md) and [runbooks](runbooks/) use these words; if they disagree, this lexicon wins. This file = **words we use**, grouped so product ≠ workstream ≠ practice.

**One line:** beats clock the wave → cards on the board → seats in a suit on the mill → CoS steers from station → close with a receipt.

---

## 1. Products (the stack you ship)

Things with a stamp / npm / live URL. Dist talks about these.

| Term | Plain gloss |
|------|-------------|
| **⚡ 0xRay** | Power plant / OS for agents — factory layer |
| **🦾 suit** | Work kit an agent wears (hooks, mill plant, bounds) |
| **🏭 mill** | Build · test · deploy plant *inside* the suit |
| **↗ hangar** | Paid shop front beside the mill |
| **🧾 Clearing** | x402 USDC receipts on Base |
| **🪪 Groover** | Agent identity / DID |
| **〰 ZigZag** | Marketplace / discovery |
| **⚖ Dynamo** | Solar governance — PASS / REJECT |
| **📦 kit** | Setup pack (`@0xray/grok-bot`) |
| **pin** | Hangar shop (+ pay-to-list gate on the board) |
| **OWS** | Local wallet for hangar pay (USDC on Base) |
| **repertoire** | Optional **organ** — compact/memory heat on CLI/cloud suits. Not required for every seat. Heat ≠ fastened |

---

## 2. Workstream (how the fleet runs)

Ops nouns — clocks, tickets, roles, decks. Not products.

| Term | Plain gloss |
|------|-------------|
| **beat** | One real event on a card: pull request opened or pushed, review verdict, merge, merge-queue tick, owner message, blocker, or a finished deploy (deploy, deploy_fail). CI stays on the card and is not board traffic. A watcher run whose start and end fall in the same second is not a beat |
| **wave** | Stretch of beats toward one outcome (ship, dist week, proof) |
| **board** | `house/WAVEBOARD.md` when `LIVE_URL` is unset. Bifrost (https://bifrost.0xray.dev) when `LIVE_URL` is set. GitHub cards grouped by stage, plus one cloud-agent row per `bcId` (owning seat, linked card, state `running` / `finished` / `failed`, last update). burst-live is the Bifrost board, never a node on it |
| **card** | One GitHub issue or pull request (`repo#number`): title, url, owner seat, stage (`open` > `review` > `fix` > `merge` > `retest` > `done`), state (`live`, `held`, `parked`, or `closed`). A packet post creates it, a cloud agent does not run without its id, the cloud agent pushes, the seat App opens the pull request, and the server attaches both |
| **seat** | Named bot role (CoS, forge, critic, herald, magnet…) |
| **station boot** | Light on an owner message: `live-inbox <seat> --prompt`, then `.xray/state/STATION.md`. Full after a summary, a wake, or a gate also reads the `OP-PROC:` file, the newest two NOTES entries, TRACKS, open cards, and `Skills:` |
| **station** | "The station card is the one-line ticket at .xray/state/STATION.md." "The station module writes this card." Intent (≤240 chars) and the next cut; heat stamps `Cascade:` and `Sleeve:`. Never hand-edited; read after a compact, and on every wake. "The long body belongs in notes." No secrets, only env var names. (plates: `docs-site/docs/plates/station-card.md`, guide `docs-site/docs/guides/station-vs-repertoire.md`) |
| **notes** | "Notes are the body the station card cannot hold." `.xray/state/NOTES.md` is the working page: the seat writes the body after every beat, with evidence; there is no pre-compact signal. A compaction is a wake: read station, then notes. Where a PreCompact hook exists, `stampNotesPickup` "updates only that line and leaves the body alone." "Do not commit this file." No secrets, only env var names. (plate: `docs-site/docs/plates/notes-page.md`) |
| **receipt** | Proof a card closed (critic PASS, `npm view`, Dist URL). Chat LGTM ≠ receipt |
| **cloud** | Deep-work agent (`bc-…`) shown on the board: owning seat, linked card or PR, state `running`, `finished`, or `failed`, and last update. Fed by the Cursor webhook and seat activity `kind: cloud_agent`. One per card, resumed; wears the suit first. Seats never build, test or deploy from their own computer, hotfixes included. All code and tests run in a cloud agent; the seat only merges and posts verdicts |
| **dist** | public distribution **lane** (@0xRayAI) — a workstream, not a product SKU |
| **group / room** | Shared chat bus (ops / eng / dist). Not Station, not memory |
| **capital** | Blaze-only gate: spend, credentials, destructive |

---

## 3. Practices (verbs / bars)

How we act — not a product, not a ticket type.

| Term | Plain gloss |
|------|-------------|
| **plant** | Fasten a suit / hangar / shops **onto** a project (verb). Also “the plant” = mill floor (noun) |
| **foundry / gate** | Ship check before tag / publish (`foundry gate`) |
| **friend-test** | Plain-English bar before Dist or public docs ship |
| **dogfood** | Cold-prove on ourselves before we claim it |
| **organ** | Optional module inside the suit/plant (mill, inspect, repertoire…). Not the whole 0xRay OS. Fasten to use; don’t call it live from heat alone |
| **wear** | Run with a suit fastened (verb). “Wear check” = `foundry inspect`. Costume ≠ wear |

---

## Don’t confuse

| Pair | Diff |
|------|------|
| suit ≠ 0xRay | kit ≠ whole power plant |
| mill ≠ plant (verb) | mill = product organ; plant = fasten act (or colloquial floor) |
| dist ≠ product | lane/workstream for announcing products |
| beat ≠ card | a real event on a card ≠ the card |
| station ≠ board | CoS deck ≠ the Bifrost board |
| card ≠ receipt | assign ≠ proof |
| group ≠ Station | chat bus ≠ durable deck |
| pin (shop) ≠ pin (verb on-chain) | shop name vs Groover pin step — say which |
| organ ≠ product SKU | repertoire is an organ of 0xRay; Clearing is a product |
| heat ≠ fastened | Station “Repertoire: on” ≠ live `node_modules` organ |
| wear ≠ plant (verb) | wear = run suited; plant = fasten the suit/organs onto a project |
| wear ≠ costume | files on disk without live hooks/inspect = theater |
| chime ≠ reflexive ack | needed interrupt / soft override — not Cadence HARD refuse-all |
| packet ≠ ack | seven fields on a card ≠ a reflexive chime |
| EXECUTE ≠ draft | armed ship ≠ proposed copy |
| EXECUTE ≠ packet | armed Dist/action ≠ the handoff object |

Locked 2026-09-14 with Blaze — categorized.

## Workstream adds (2026-09-14)
| Term | Bucket | Plain |
|------|--------|-------|
| **op proc** | Workstream | Operating procedures — how the fleet runs (docs in `grok-bot/ops/`) |
| **Lane H** | Practices | Human/public plain English + friend-test |
| **Lane B** | Practices | Bot-internal compressed synaptical (token-save) |
| **synaptical** | Practices | Meaningful Compression house style — dense Done/Verify/Next beats |

## Lexicon add (2026-09-15)
| Term | Bucket | Plain |
|------|--------|-------|
| **organ** | Practices | Optional module in the suit/plant |
| **repertoire** | Products (organ) | Optional compact/memory organ — fasten to claim |
| **wear** | Practices | Run with a fastened suit; inspect = wear check |

## Lexicon add (2026-10-05 — chime)
| Term | Bucket | Plain |
|------|--------|-------|
| **chime** | Practices | Needed interrupt that **supersedes** a gentle redirect (soft override). Use when the soft redirect isn't enough. Not a reflexive ack / ping — those stay refused under Cadence HARD. |

## Lexicon add (2026-10-05 — inter-bot)
| Term | Bucket | Plain |
|------|--------|-------|
| **packet** | Workstream | A card's seven fields: goal, constraints, path, acceptance, evidence, next owner, escalate. From a `## Packet` block or one line. Missing acceptance or next owner makes the card amber (`no packet`). Evidence fills from the latest beat. |
| **EXECUTE** | Practices | Armed Dist/action order with exact copy + gates; herald/seat ships only on EXECUTE (not draft/FYI). Distinct from a packet (the packet may *carry* an EXECUTE). |
| **handoff** | Workstream | The channel or file that *carries* a packet (`ops/handoffs/…` or a seat message). The packet is the content; the handoff is the pipe. |

## Lexicon add (2026-10-14 — work track)

| Term | Bucket | Plain |
|------|--------|-------|
| **working** | Workstream | A seat is working while one of three writers says so: an open turn or a prompt pulse (`applyStoredActivity`; a turn expires after `LIVE_TURN_OPEN_MIN`; a prompt pulse lasts 10 minutes), a woken unacked packet or a running agent (`applyTrackWorking`, chip `working_on`), or a GitHub comment, review, PR open/push, or issue event whose actor maps to that seat (`applyGithubWorking`, same expiry, `working_on` is `repo#number`). A turn `end` or an ack clears the turn. A prompt pulse still inside its 10 minutes survives a turn end. The turn end still clears after `TURN_OPEN_MS`. The drop clears a mark at or before the end. A mark newer than the end stays only while it is inside `TURN_OPEN_MS` (20 minutes, `LIVE_TURN_OPEN_MIN`), then it expires. Newer GitHub marks expire at 20 minutes. A running cloud agent stays. A mark with no time stays. A close or a merge of that item clears `working_on` on the seat and in `fleet.working`. The seat can stay working. The card clock ignores CI and `pr_commit` on both sides it compares. A card-worthy event on a closed card is not a stall. A `pr_open` the board has not carded still is. |
| **packet phase** | Workstream | `sent`, then `delivered`, then `woken`, then `acked`. Unacked past `NUDGE_L1_S` is `overdue`. Only kinds `dispatch`, `ready`, `packet`, `critic_fail`, `needs_human`, or a human-lane blocker, are packets. |
| **seat mismatch** | Workstream | `POST /activity` with another seat's name. `403` `{"error":"seat mismatch"}`. The key in `SEAT_KEYS` is the seat. |

## Lexicon add (2026-10-05 — watchers)
| Term | Bucket | Plain |
|------|--------|-------|
| **watcher** | Workstream | Signal→ticket queue: watches git/X activity and opens or bumps a board card. Does not ship or merge. |
| **workstream** | Workstream | Card/seat lane on the board (how work runs). ≠ product SKU. ≠ planes. |

Don't confuse: watcher ≠ Dist; workstream ≠ product; workstream ≠ planes.

## Lexicon add (2026-10-09 — waveboard)
| Term | Bucket | Plain |
|------|--------|-------|
| **card** | Workstream | One GitHub issue or pull request (`repo#number`). Title, url, owner seat, stage (`open` > `review` > `fix` > `merge` > `retest` > `done`), state (`live`, `held`, `parked`, or `closed`). |
| **packet** | Workstream | That card's seven fields. Cap 200 characters. Allowlisted links. Amber `no packet` badge when acceptance or next owner is missing. |
| **beat** | Workstream | One real event: opened or pushed, review verdict, merge, merge-queue tick, owner message, blocker, or a finished deploy (deploy, deploy_fail). CI stays on the card and is not board traffic. A watcher whose start and end fall in the same second is never a beat. |
| **deploy stages** | Workstream | The board's phases for one Railway deploy: BUILDING, DEPLOYING, then a terminal status. Stamps are in order (BUILDING <= DEPLOYING <= terminal). Only SUCCESS backfills missed phases; FAILED, SKIPPED and CRASHED show only what was seen. |

## Lexicon add (2026-10-14 — bifrost)
| Term | Bucket | Plain |
|------|--------|-------|
| **Bifrost** | Workstream | The fleet's live board and router (burst-live). burst-live is the board, never a node on it. Turns every issue, PR and comment into a card and an inbox line, then wakes the seat. |
| **tripwire** | Workstream | Fires when nothing has moved for a window: a stalled board wakes each seat that has open work, with a deadline. An empty board wakes blinky (`seats.coord`) to pull the next issue, unless weekly burn is at or above 75% (`BIFROST_WEEKLY_BURN` of `0.75` or `75`), which keeps that empty-board wake quiet and wakes no seat. Below 75% the empty board still wakes blinky. `POST /clock` stays on that seat. At most once per window. A due plan card does not replace that stall wake. A closed real wave raises one plan next wave card for the coordinator; the tripwire flags that card when nothing is carded in the Chicago cron window. Weekly burn at 75% keeps that plan card quiet. |
| **nudge** | Workstream | A live card with no beat: L1 goes to the next owner, or else the card owner. L3 repeats to that seat. CoS is not woken to reassign. An unacked inbox line steps L1, L2, and L3 on that same seat. A missing handoff stays on the owing seat through L3. A stranger's `Start after:` comment is ignored. A time more than 30 days out is ignored. `merged_by` is the merger, never the author. |
| **routing** | Workstream | Which seat gets which line. The routing map lists each seat once with its real GitHub login and nicknames; served read-only at `/routing`. Look a login up there before any @-mention. |
| **two loops** | Workstream | Outer loop: GitHub issues, PRs and @-comments (the record). Inner loop: seat DMs, each pointing at one of them (the wake). |
| **volley** | Workstream | Packet ping-pong between seats inside a wave: ask, answer, fix, re-check. |
| **tandem** | Workstream | The governor: seats moving together across both loops. Without it Bifrost stalls. |

## Lexicon add (2026-10-14 — OP-PROC terms)
Every bolded term in the pack OP-PROC and runbooks is defined here (`bifrost check --only lexicon`).
| Term | Bucket | Plain |
|------|--------|-------|
| **ack** | Workstream | The receipt a seat sends after it handles an inbox line (`live-inbox <seat> --ack <id>`). `--ack stale` lists lines with a close or merge event, or a closed or done card, and does not ack until `--apply`. A missing card stays, and so does an old handoff on a live card. `--upto <id>` acks the stored prefix through that id, including live lines. `--ack all` acks every open line. Plain seat-key call, never an approval card. |
| **coordinator** | Workstream | The CoS role (blinky): plans the next wave at each close, paces burn, friend-tests Lane H and writes Dist packets, and onboards seats. Bifrost keeps the board. |
| **coordinator never** | Workstream | What the coordinator never does: deploy, publish, change production, launch cloud agents, post in public, spend, merge. |
| **done** | Workstream | A live receipt (URL, registry view, Release URL, or reviewer PASS). Green CI alone is not done. |
| **handoff = packet + wake** | Workstream | The seat that owes the handoff runs `live-inbox <seat> --handoff <to> --pr <owner/repo#n> --kind <ready|critic_fail|live_pass|merge|ci_fail> --sha <head>`. `--sha` is required (7 to 64 hex digits). That posts the inbox packet. The seat sends the printed line as a 1:1 to the next seat. The cos-forge 1:1 carries that line for CoS↔forge. Handoff kinds are `ready`, `critic_fail`, `live_pass`, `merge`, and `ci_fail`. A room post does not count. If the packet is missing for `NUDGE_L1_S`, the card is flagged `handoff missing` and the owing seat is nudged L1 through L3. |
| **room post** | Workstream | A message in a group room. Seats may not ack there (they might or might not), so the receipt cannot be relied on. A room post is never a handoff and never a wake, even when it names the next seat, and even from the CoS role. |
| **implementer** | Workstream | The cloud agent forge launches. It writes the code and pushes the branch. Forge opens the PR through its App and merges. |
| **publisher** | Workstream | The ship seat: keeps continuity and gates, merges and deploys after review (ours: forge). |
| **reviewer** | Workstream | Writes PASS or FAIL, never merges; runs `bifrost check` after deploy (ours: critic). |
| **review** | Workstream | The reviewer's pass tier: Light / Normal / Strict, chosen by scope. |
| **specialists** | Workstream | Optional seats for public posts, listings and audio. |
| **human owner** | Workstream | The person who owns money, credentials, deletes, publishing and taste. |
| **owner** | Workstream | In `house/`: who the human owner is. On a card: the seat that fixes it. |
| **roles** | Workstream | The seat field is a role (implementer, publisher, reviewer, coordinator, specialists), not a personal name. |
| **seat** | Workstream | Named bot role on the board; `house/` lists the fleet's seats. |
| **new seat before any ship work** | Workstream | The hire gate: role description, fastened suit with inspect receipt, orientation, ack, then the first card. |
| **runbooks** | Workstream | Each seat's how-to in the pack (`grok-bot/runbooks/`), not in a seat's memory. |
| **names** | Workstream | Docs and plates carry current seat, login and tool names; `bifrost check` greps for stale ones. |
| **floor** | Workstream | Gates A and C on every merge. A docs-only change does not wait on CI. B and D are set per PR by scope. |
| **gate b runs on the owner's machine** | Workstream | Gate B (packed tarball + per-environment checklist) runs locally on the human owner's machine, never in the cloud. |
| **disk, not chat** | Workstream | After a compact, and on every wake, read the station, then the board, then memory, and resume the same role. |
| **you first** | Workstream | The human's direct message beats bot pings; an open inbox line is the job, not a ping. |
| **public voice** | Workstream | The fleet's public account, spacing and reply style, set in `house/`. |
| **quiet** | Workstream | Say nothing when someone only repeats CLOSED, MERGED or LIVE. |
| **money and ship** | Workstream | Ask first before publish, production change, pay, secrets or delete, unless `house/` names an exception. |
| **house** | Workstream | The team's own rules folder (`house/`): owner, seats, public voice, allowed, ask first, board. |
| **allowed** | Workstream | In `house/`: actions a seat may take without asking. |
| **ask first** | Workstream | In `house/`: actions that need the human owner's yes first. |
| **all three** | Workstream | New cloud agent only when every one of the three conditions holds: the context agent has 2+ jobs queued, the job touches different files, and it can be briefed from docs alone. |
| **hotfix**, **hotfix bypass** | Workstream | The hotfix bypass. A broken production change ships right away on its own PR with a regression test that fails without the fix and passes with it. Forge writes the fix and tests in a cloud agent, merges, and the cloud agent deploys once: no CI wait, no critic review before merge, no rollback. Then critic does one live pass on production. If that pass fails, the next fix is another hotfix. The usual review process follows afterward. [Steps](runbooks/SHIP.md#hotfix). |
| **two hats** | Workstream | Every seat does the work and makes it repeatable: it writes the rule into the lexicon, OP-PROC or a runbook. A rule that only exists in chat counts as missing. |
| **boil-up** | Workstream | A periodic correlate-and-sync pass over OP-PROC (a rules engine for bots): similar, compounding rules merge into one broader rule. CoS triggers it every few waves or past 70 of 75 lines. |
| **activity key** | Workstream | The per-seat `SEAT_KEYS` hash on `POST /activity`. The seat posts only as itself. A cross-seat `seat` is `403` seat mismatch. |
| **button up** | Practices | When weekly burn hits the hold line, every seat stops new work, runs no local builds, tests, or deploys on its own computer, pauses its Bifrost inbox wake until the reset, leaves only cloud agents for anything essential, and reports and acks in the room. |

## Lexicon add (2026-10-19 — wave schedule)
| Term | Bucket | Plain |
|------|--------|-------|
| **plan next wave** | Workstream | The card Bifrost raises for the coordinator when a real wave's last card is closed or merged. It names the next open wave. The window is a Chicago cron. The due time stays on the card. Weekly burn at 75% keeps that plan card quiet, and the same burn keeps an empty-board wake quiet. A plan card older than 7 days closes as expired and is not raised again for that same wave. The tripwire flags it `nothing carded` when the window passes and no new card was added. |

## Lexicon add (2026-10-18 — seek)
| Term | Bucket | Plain |
|------|--------|-------|
| **seek** | Workstream | A cheap-first choice. A branch, then a table, then a score. The skills seek reads the ranked list on the held card, then plate recall, and declines when both miss. It does not call a model. Confer on the result is only a feat or a refactor, and the quorum stays off. |

## Lexicon add (2026-10-19 — cloud routing)
| Term | Bucket | Plain |
|------|--------|-------|
| **green sign-off** | Workstream | The cloud agent's bar before it reports or hands off. Tests written, the suite run, the head pushed, and every required GitHub check green on that head. A docs-only push does not wait on CI. The required job is `npm run test:comprehensive`. A full suite may ignore only the seven #397 names: `postinstall-config-e2e` (two), `infrastructure`, `agent-capabilities-routing`, `governance-service`, `install-bridges-config`, `lookup-cache`. Any other new failure blocks. The report is the head sha, the test results, and the CI list. It does not replace **done**. |
| **forward-motion** | Workstream | Critic FAILs only for wrong live behavior, for security, spend, or on-chain risk, or for a plate or OP-PROC line that would send a seat the wrong way. Anything else is APPROVE plus a linked follow-up issue for the author. A bug fix ships when it fixes the bug and breaks nothing. A feature's rule is written before merge. After round 2, only an original blocker can FAIL. A docs-only PR does not wait on CI. |
| **packet-first** | Workstream | A new PR starts as a short packet in the issue or PR body: scope, files, plates and docs touched, tests, and out of scope. Critic PASS on that packet comes before any code. The cloud agent codes against it. Code review checks the diff against it. |
| **batch** | Workstream | One inbox string for a PR head. Critic review, CI, and handoffs for that head collapse into it. Bifrost writes it on `run_end` or `ci_pass`. The ask stays in `title`. |
| **cloud batch** | Workstream | One worker cloud per PR, then that PR's critic cloud, never two live at once. Wake runs do not launch or resume a cloud. Events for a live run buffer per PR and collapse on PR plus head sha. Bifrost flushes one `batch` line on `run_end` or `ci_pass` only. A green head queues critic on `run_end` when the checks are already green, and on `ci_pass` when the run has already ended. A green event seen before `run_end` is not replayed. A red head on `run_end` goes back to the worker. A pending check waits. A buffered PR counts as in-beat, so nudge L1 does not fire. A flush waits when the day is over pace or weekly burn is at 75% or more, except a hotfix. A second critic FAIL goes to Blaze. On close, record the rounds and why. |

## Lexicon add (2026-10-19 — pulsar)

| **pulsar** | Workstream | The one-wave board hold. The first seat to hit holds the open cards for the wave the board has up. The hold ends when the board closes that wave. It does not post, deploy, publish, or spend. |
