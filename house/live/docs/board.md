# Board

A card is one GitHub issue or pull request. A beat is a real event on it. A packet is the structured fields (goal, constraints, path, acceptance, evidence, next owner, escalate).

When `LIVE_URL` is set, the board seats see is the collector board (`GET /cards`). When `LIVE_URL` is unset, the board is hand-kept `house/WAVEBOARD.md`. `feed/live_mesh.py` runs `feed/live_collect.py` and `feed/live_board.py` every 45 seconds (`LIVE_WATCH_S`, default 45). An empty box board does not replace those cards.

## Event to card

| Collector event | On the card |
|---|---|
| `pr_open`, `pr_ready` | Beat `opened`. The card is live. |
| `pr_draft` | The card parks at once. |
| `review` `APPROVED`, or `critic_pass` | Beat `Reviewer PASS`. |
| `review` `CHANGES_REQUESTED`, or `critic_fail` | Beat `Reviewer FAIL`. Stage moves to fix. |
| `pr_commit`, `pr_force_push`, `pr_update` | Beat `pushed`. A head change emits `pr_commit`. The newest push stays on the card when later beats fill the window. A new head after a FAIL is a new review. A new head after red CI closes the `ci_fail` handoff. |
| `ci_pass`, `ci_fail` | CI stays on the card for that PR number. It is not board traffic. |
| `merged` | Beat `merged`. The card field `merged_by` is the merger, never the author. The author's seat gets an info line. |
| `pr_close` | The card closes. The author's seat gets an info line. The handoff obligation closes. |
| `pr_reopen`, `issue_reopen` | Clears closed and stop. The card is live again. |
| A fleet seat's comment | A comment beat. The author's seat is not the only one that counts. |
| No beat for 72 hours on an open PR | The card parks. |
| Handoff packet missing for `NUDGE_L1_S` | Flag `handoff missing`. The owing seat is nudged L1, then L2 after `NUDGE_L2_S`, then L3 after `NUDGE_L3_S`. CoS is not woken to reassign. A room post does not clear it. |

Stage order is `open` > `review` > `fix` > `merge` > `retest` > `done`. State is `live`, `parked`, or `closed`. PASS at the current head plus green CI moves the card to merge.

## Nudge ladder

`evalNudges` sends L1 to the next owner, or else the card owner, after `NUDGE_L1_S` (default 3600). L3 repeats to that seat after `NUDGE_L2_S` plus `NUDGE_L3_S` (defaults 1800 and 7200). CoS is not woken to reassign.

A missed handoff is a separate ladder. L1 goes to the owing seat. L2 goes to that same seat. L3 repeats to that seat. CoS is not woken to reassign.

An unacked inbox line uses `NUDGE_LINE_S` (default 900) between L1, L2, and L3, all to that seat. A line on a closed or merged item stays on a plain inbox read and is not nudged.

## Close

A merge, an issue close, or a pull request close sets the card to done and closed and clears its nudge. It does not stay live waiting for a retest tick. A failed retest after merge needs a new issue.

The owner's own comment that the work is resolved also closes the card. A comment from someone else does not.

Every PR comment, review comment and issue comment routes to the comment-watch seat and to the PR or issue author's seat, open, closed or merged. A comment on a merged or closed card is a beat (`comment after merge` / `comment after close`) and keeps the card on the board for 24 h from that comment. A PR or issue whose author is outside the fleet no longer drops its comments.

## Holds

A card is held when any of these is true:

- the owner posts a comment whose first line is `Held: <reason>`, with an optional `until:` line
- the issue or pull request has a label in `GITHUB_HOLD_LABEL` (default `on-hold`)
- a Jira item's status matches `JIRA_HOLD_STATUS` (default `On Hold`), compared without case

A held card stays visible, is not a stall, and gets no level 1, 2, or 3 nudge. If it stays held with no beat past `HELD_MAX_S` (default 72 hours), the owner gets one nudge.

A `Parked:` comment still parks the card and wins over a hold.

## Date on a card

A card may carry `start_after`, an ISO time with a numeric offset. The writer computes that offset from `America/Chicago` at the moment it writes (`-05:00` or `-06:00` for that instant), for example `2026-10-18T08:00-05:00`. A stamp already stored is not rewritten.

Set it in either of these ways:

- `live-inbox <seat> --card owner/repo#n --start-after 2026-10-18T08:00-05:00`
- a GitHub issue or pull request comment whose first line is `Start after: 2026-10-18T08:00-05:00`

A comment sets the date only when it is from the card owner or a fleet seat (`fleet_from`). A stranger's comment is ignored. A time more than 30 days after now is ignored. `POST /cards/start-after` uses that same rule: the seat key must be the card owner or a fleet seat, and the time must fall within 30 days.

The command is stored on the server and wins over the comment while that store exists. The board shows the date on the card. Until that time the card stays parked: no nudge, no tripwire, and it does not count as an empty board. At that time the server wakes the owning seat through the normal inbox wake (a webhook for mill, critic, forge, and blinky; an inbox line for a polled seat). No seat routine is required. The date and the wake mark are in `start-after.json`, so a restart still honors them and does not send the wake twice.

## No nudge

`NO_NUDGE_REPOS` is a comma list of `owner/name` or `owner/*`. Those cards stay on the board and get no stall line and no nudge, including the past-max hold nudge. Unset means no repo is excluded.

## Layout

The page groups cards that a seat is working on, then pinned cards, then one group per seat. Issues whose title names a pull request in the same repo fold under that pull request. A run of more than three loose issues collapses to one line.

## Ghost cards

Each feed pass asks GitHub which issue and pull request numbers are still open. A card that is not closed and not pinned, whose repo answered, and whose number is absent, is closed. A repo whose query fails is left alone.

## Seat activity (#275)

Turns and owner messages are posted by the seat, with its own key, to `POST /activity` (`live-inbox <seat> --turn` and `live-inbox <seat> --prompt`). The box pusher (`house/live/feed/push_to_host.sh`) and the watchdog that starts it are retired for seat activity. Box liveness is not required. A silent box drops box-only signals and is not a board error. The server never reads chats.

| What | Where | Line |
|---|---|---|
| Turn start / end, background task start / end (desktop runs too), watcher start / stop | `POST /activity` | `{"t_ct","seat","kind":"turn"\|"subagent"\|"watcher","action":"start"\|"end","tag"?}` |
| Owner → seat message, a 1:1 or a room (a pulse) | `POST /activity` via `live-inbox <seat> --prompt --from blaze` (add `--room <name>` in a room, `--note "<line>"` for the words) | `{"t_ct","seat","kind":"prompt","action":"sent","from","to","room"?,"note"?}`. `note` is one line, at most 240 characters. Keys named body, text, or message are refused. The board label is `Blaze → <seat>: <note>`. The seat stays working for 10 minutes. `from: blaze` credits **Blaze** |
| Cloud agent launch / finish | `fleet/cloud-agents.jsonl` | `{"t_ct","by","action":"launch"\|"reply"\|"finished"\|"cancel","agent","pr"}` |

Seats post those turn and prompt lines with their seat key. A seat counts as active and working while a prompt pulse from the last 10 minutes is open, while it has an open turn or task, or while one of its cloud agents is still running. Pulses never become inbox lines or wakes (see [inbox.md](inbox.md), routing guardrails).

Activity details (#281): a prompt line keeps its sender as `actor` (off-box seats send `from` on `prompt received`). A cloud agent credits the seat that launched it. That seat stays active while the agent's latest line is `launch` or `reply` and that line is newer than six hours. `finished` / `cancel` ends it at once. A line with no update for more than six hours is `stale` and the seat goes idle. A GitHub event that names the `bc-…` id refreshes the clock. It does not idle the seat while the agent is still inside that six-hour window. `live-inbox <seat> --turn start` posts that launch when `CURSOR_AGENT=1` and `CURSOR_CONVERSATION_ID` is the `bc-` id. `live_act` in `paste-block.sh` and `builder-cloud-setup.sh` emits turns, prompts and cloud agents; `tools/live-act-hook.example.sh` wires turn start/end and prompts into an agent hook. Rate limits are the platform's job. Full spec: [`house/burst/ACTIVITY.md`](../../burst/ACTIVITY.md) and [`activity.schema.json`](../../burst/activity.schema.json).

## Cloud agents on the board

A cloud agent is its own row on the board, in the `cloud agents` group, not only a working chip. The header field is `cloud_agents` (also copied onto `board.cloud_agents` when a card board is present). Each row has:

| Field | Meaning |
|---|---|
| `bcId` | Agent id (`bc-…` or the same id the webhook stored) |
| `seat` | Owning seat. The Cursor webhook seat, else the activity key's seat, else the ARCH1 launch seat |
| `card` | Linked card `owner/repo#number`, from a GitHub PR url, an activity `tag` of that shape, or the ARCH1 launch card |
| `pr` | `https://github.com/…/pull/n` when the webhook or a cloud-agent activity line sent one |
| `state` | `running`, `finished`, `failed`, or `stale` |
| `updated_ct` | Last update time |

`running` is a launch, a reply, or a webhook status of created, running, or PR opened, and the last update is inside six hours. `stale` is that same open line once `updated_ct` is more than six hours old. A stale row does not light its seat and does not sit in the open cloud group. `finished` is a finish. `failed` is a cancel or a webhook status of ERROR, FAILED, TIMED_OUT, or CANCELLED. The newest line sets the state. An earlier seat, card, or PR stays when a later line omits it.

Two feeds, the same ones seats already write:

1. `POST /cursor/webhook` appends `agents.jsonl` after the signature check.
2. `POST /activity` with `kind` `cloud_agent` or `agent` and `action` `launch`, `reply`, `finished`, or `cancel`. `tag` may be `owner/repo#number`. `pr` may be the pull URL. This is the same line a `fleet/cloud-agents.jsonl` row carries (`t_ct`, `by`, `action`, `agent`, `tag`, `pr`).

An ARCH1 launch file row with an `agentId` fills the seat and card when the log has not named them yet. A running row shows a spinner. Open the row for the six fields. A `pr` url is a GitHub link.

Vocabulary: **cards** are the work items (one per PR or issue). **Beats** are real events on a card, and they reset its idle clock. **Pulses** are liveness signals only. **Packets** are tracked asks in an inbox, and **acks** close them. **Nudges** are packets the server creates after 60 min with no beat. **Wakes** are content-free webhook doorbells that follow packets. **Seat status** is the working or idle light.

## Page behaviour (wave)

- The header "N of M bots active" counts the strip's seats with the same seat state the chips show (working > live > active > idle), so the two always agree. Server-side, a wake that lands, an inbox read or an ack also makes a seat active.
- Board grouping: each card sits under its seat (next owner, else owner). A card in review also shows as waiting under the review seat (`L.REVIEW_SEAT`; ours is critic), so the reviewer's group shows its queue, not only its done cards.
- Rewound or replaying, the Board shows the cards as of the timeline point (cards whose first beat is at or before it, beats up to it). Cards carry their last few beats only, so very old points are approximate.
- Packets fly for 2.6 s with a halo and a fading path, so each hop is visible seat to seat. The status pill says REPLAY during a replay pass. The Spectrum pill is the playback chip.
- Spectrum is on by default while a replay runs (manual playback, the opening burst, and the replay loop). The title row shows a 14-bar hue meter and a Spectrum pill. Replayed packets stay on the curved lane and draw a 12-stop rainbow trail with a white core on a dark plate. A light plate uses a dark core and a higher trail alpha so the trail stays readable. `app/public/live-config.js` sets `LiveMesh.SPECTRUM` (default true). A set falsy `LiveMesh.SPECTRUM` (`0`, `''`, `null`, `false`) turns the stream off, and a missing flag leaves it on. `?spectrum=0` turns the meter, the pill, and the rainbow trail off. `?replay=0` still turns only the replay loop off. The mesh canvas is letterboxed with one scale, so a host rule such as `#mesh { height: 300px }` does not stretch the bitmap. Reduced motion turns the meter and the trail animation off. Plates read: none (no spectrum plate).
- Lens labels are kept inside the canvas. The kit maps no avatars (it ships none); a fleet overlay maps the images it ships, the rest use the drawn badge.

## Seat credit

Each event's `credit` is set by the collector (`feed/live_collect.py` `credit_of`), never blank, first match wins:

1. a `Seat: <seat>` trailer in the commit message (a line on its own, e.g. `Seat: critic`);
2. the event's actor / sender login (`actor`, `author`, `sender`, `triggering_actor`, `merged_by`, `user`);
3. the PR's author (events with a PR number);
4. the commit author's login for that sha (checks, workflow runs, deploys);
5. that commit's `Seat:` trailer;
6. `github` (CI, unmapped `[bot]` logins, Railway / rails with no seat).

A login maps to a seat through the committed `feed/fleet-nodes.json` (shipped to `collector/` by `app/deploy.sh`). It wins over the `LIVE_NODE_MAP` service variable, which can only add logins the file doesn't name. An unmapped person credits `other`. `htafolla` credits **Blaze** on that map. Events from other sources (box, Jira, health, emitter) are credited by the server from their sender node: a roster seat, then `HUMAN_ALIASES` (`alias=Label`, default empty), else `github`. Empty `HUMAN_ALIASES` sends the lead's events to `github`. burst-live sets `HUMAN_ALIASES=htafolla=Blaze,lead=Blaze` (`htafolla` is the human's GitHub login; `lead` is the box sender node). `blaze0x1` is not a GitHub user and is not in that list.

## Avatars

Our pictures live in `house/live/site/public/avatars/` (copied over the kit page by `app/deploy.sh`) and are mapped in `site/public/site-config.js` (`L.setAvatars`):

| Node | File | Source |
|---|---|---|
| blinky, critic, forge, herald | `<seat>.png` | the repo's `docs-site/static/live/bots/` |
| arch1 | `arch1.png` | `docs-site/static/live/bots/minime0x.png` (image reused; the `minime0x[bot]` login runs workflows and credits `github`, not arch1) |
| Blaze | `blaze.png` | his X profile picture (@Blaze0x1) |

Every other seat (magnet, nibbler, sound) shows the drawn letter badge; there is no 404. To add one: commit a square PNG as `site/public/avatars/<seat>.png`, add `<seat>: '<seat>'` to `L.setAvatars` in `site/public/site-config.js`, and deploy. The kit maps no avatars.

## What makes a seat working

Three writers set `fleet.working` and the seat's working light. They stack. A later writer fills `working_on` only when it is still empty. The full chain, including `CURSOR_WEBHOOK_SECRET`, is [work-tracking.md](work-tracking.md).

1. `applyStoredActivity` reads `activity.jsonl`. Lines arrive from `POST /activity` (the seat's own key: `live-inbox --turn` and `live-inbox --prompt`) and from the server's own wake/ack lines. An open turn, subagent, or watcher is working. A prompt pulse (`kind: prompt`) keeps that seat working for 10 minutes, and the board credits the sender (`from: blaze` is **Blaze**). A turn expires after `LIVE_TURN_OPEN_MIN` (default 20 minutes, `TURN_OPEN_MS`) when the ack never arrives. An `end` or an ack closes the turn at once. A prompt still inside its 10 minutes stays. The turn end still clears after `TURN_OPEN_MS`. The drop clears a mark at or before the end. A mark newer than the end stays only while it is inside `TURN_OPEN_MS`, then it expires. A mark with no time stays. A running cloud agent the seat launched stays active after the turn ends. Newer GitHub marks expire at 20 minutes. A later tick does not open the turn again. An open turn older than that window drops the seat, and still spares a running cloud agent and a fresh prompt pulse.
2. `applyTrackWorking` reads the work track. A packet that is woken and not yet acked, or a cloud agent that is still running, sets the seat working. The chip text is `working_on` (`working on <title>` for a packet). A Cursor status webhook appends `agents.jsonl` only after `CURSOR_WEBHOOK_SECRET` verifies `POST /cursor/webhook`.
3. `applyGithubWorking` reads GitHub events already in the feed. A PR or issue comment, a review, a PR opened or pushed, or an issue event whose actor login maps to a seat marks that seat working for the same `TURN_OPEN_MS` window. `working_on` is `repo#number`. Logins come from `feed/routing/inbox-roles.json` (`routing.<seat>.login`), `feed/fleet-nodes.json` and `LIVE_NODE_MAP`, `LIVE_GH_SEATS` (the App's `bot` login), and `SEAT_GIT_NAMES` only as `git:<seat>` (a commit with no GitHub user). A cloud agent with no seat login maps through `SEAT_AGENT_MAP` (exact id or `id*` prefix) or a `bc-` id in the branch, ref, or comment. `critic0x[bot]` is critic. `forge0x1[bot]` is forge. A close or a merge of the PR or issue named in `working_on` clears that chip on the seat and in `fleet.working`. The seat can stay working. `fleet.cloud.active` is true only while `open_agents` is non-empty; a recent GitHub cloud clock alone does not keep it active.

The board page has a Work panel (`header.track`) grouped by lane. Packet phases are `sent`, `delivered`, `woken`, `acked`. Past `NUDGE_L1_S` with no ack, the packet is `overdue`. A blocker (`type` / `kind` / `flag` `needs_human`, or `to` = `WORK_HUMAN_TO`) sits in the `WORK_HUMAN_LANE` lane until it is acked or the card closes. `SEAT_DISPLAY_NAMES` (JSON seat id to label) renames lanes and the chip lookup. The page reads that map from `fleet.seat_display`. It does not hardcode a seat's display name.

`POST /activity` takes each seat's own `SEAT_KEYS` hash (Builder still uses its GitHub App token). The stored seat is the key's seat. A body `seat` that is not that seat, an alias of it, or its display name is `403` `{"error":"seat mismatch"}`.

`POST /activity/ingest` remains for a box uploader that holds the ingest secret. Seats do not use it. Seat activity is the seat's own key on `POST /activity`. The chain for the uploader, which seats no longer need, is [activity-upload.md](activity-upload.md).

## What makes a seat active

A seat shows ACTIVE when, within the fleet window (`LIVE_WINDOW_MIN`, default 15), one of these happened:

- a GitHub event by one of its logins (via the credit map above);
- an owned box file changed or an activity line (turn, task, watcher) was logged (see Seat activity above);
- a cloud agent it launched is still running (`launch` or `reply`, no later `finished` or `cancel`, last update inside six hours);
- a wake to its webhook landed (2xx);
- it read its inbox (`live-inbox <seat>`);
- it acked a line (`live-inbox <seat> --ack <id>`, `--ack stale --apply`, `--upto <id>`, or `--ack all`).

The last good wake lives in `wake-ok.json` on the volume. An ack is an append-only archive row (`acks.jsonl`, with `t_ct`). Startup reads those rows and `foldSeatTouch` applies them, so a restart keeps the last ack.

**Known gap.** Work a seat does on its own computer (a desktop turn with no wake, read or ack) does not report yet, so the seat can look idle while busy. Wave fix: `live-inbox` sends a heartbeat on every wake and every task start.

## Deploy stages

The Railway poll runs every `RAILWAY_POLL_S` seconds (default 15). A deploy emits BUILDING, DEPLOYING and its terminal status. A poll that first sees SUCCESS backfills the BUILDING and DEPLOYING it missed. Any other terminal status (FAILED, SKIPPED, CRASHED) never gets invented phases: it emits only the phases actually observed plus the terminal line. Stamps are in order: BUILDING <= DEPLOYING <= the terminal status. A backfilled or late-seen phase is raised to the latest phase time already stored for that deploy, including after a collector restart, so DEPLOYING never sits before BUILDING.

## Freshness

The light at the top uses two times from the feed `freshness` object. Served `_ct` clocks (`fleet.as_of`, seat and cloud `last_ct`, `working` `since_ct`, and freshness `github_latest_ct`, `github_card_latest_ct`, and `cards_at`) are America/Chicago with the offset and milliseconds, and do not end in `Z`. `github_latest_ct` is the newest GitHub event of any kind. `github_card_latest_ct` is the newest non-CI event that moves an open card, or a merge. A merge still advances the clock after that card has closed. CI (`check_run`, `check_suite`, `workflow_run`, `ci_pass`, `ci_fail`) and `pr_commit` do not move the light, including a check that runs after a merge. A comment, a check that is still running, or an ordinary label does not turn the light. `/healthz` `data_age` is seconds since `github_latest_ct` and does not gate `ok`. `cards_behind` is true when the board clock lags the newest card-worthy event by more than `CARD_BEHIND_S` (default 180). A newer CI check is not that event, because CI does not make a card. `pr_commit` is not that event either. The card-clock gate compares `github_card_latest_ct` with events that pass the same predicate: a card-worthy event on an open card, or a merge. CI and `pr_commit` sit on neither side, so a gap past 180s on those kinds does not set `cards_behind`. A card-worthy event on a closed card does not either. A `pr_open` the board has not carded still does.

Until the first card write the light says "Cards still building".

## Wake gate

A webhook fires for the seat that has to act. The line's `seat` wins, then a handoff `to`, then the card owner. An unassigned `issue_open`, or an issue whose `labels` include `P1` or `p1`, wakes forge. Blinky's routed copy is stored and skipped (`fanout`). A `pr_labeled` P1 is not that rule. A `pr_comment` stored for blinky and the author wakes the author (the reason matching "comment on your", otherwise the one seat that is not blinky). Blinky is the extra copy. Another real target on that same comment, such as an @mention, still wakes. A missing or empty `sha` is never a shared sha, so a later issue is not a `repeat_sha`. The same kind to the same seat and `repo#n` inside 900s, with no new sha, is a `cooldown` skip. A new sha inside that window or the rolling 60-minute cap (6 sent wakes) is queued and sent when the window rolls. `flag: hotfix` skips the cap and the per-kind cooldown. Clock wakes (timed run, empty board, plan, nudge L1–L3) still post, including with an empty `lines` array, and they wait out an open turn the same way an inbox line does. `BIFROST_WAKES` of `off`, `0`, `false`, or `no` stores the line and sends nothing. `header.wake_stats` and `/healthz` are counts only. `GET /wake-stats` uses the same key gate as `GET /cards` and adds the last 50 skips plus the queued count.

## History and the queue

`GET /history` lists archive days. `GET /history?date=YYYY-MM-DD` returns that day's events. `GET /history/cards` returns the latest version of each card. Card versions are append-only (`key` + stage + state + the card's own update time). A row with no key is not stored. The open queue is a view of unacked inbox lines. Filtering it does not delete the inbox file. Lines older than the live window stay in the daily archive.
