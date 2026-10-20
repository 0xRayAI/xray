# Owner chat prompts on the board

Packet only. No code in this change. The word for the human is **owner**.

The board already knows how to store a prompt (`kind: prompt` on `POST /activity`, drawn as `seat_prompt`). The shipped writer is the seat. `grok-bot/skills/board-prompt/SKILL.md` and step 0 of `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` both tell the seat to run `live-inbox <seat> --prompt`. Seats skip that step. An owner message in Grok Bot chat then never becomes a prompt line.

## Packet

- goal: Every owner chat message to a Grok Bot seat lands as one prompt line on the Bifrost board, with no seat memory and no seat command.
- constraints: Server-side writer. Ids and the owner label only, never message text. A local watcher needs a named owner approval under the no-local-watchers rule. A turn line is not a prompt. This PR is the packet.
- path: Critic PASS on this packet, then one follow-up implements the files below. The one-day measurement starts after that follow-up is live and the pull URL is set.
- acceptance: Two owner messages to a seat that does not run `--prompt` each produce `kind: prompt`, `action: received`, `from` the owner, `to` that seat, `by: server`. A webhook wake in the same window produces `kind: turn` and no new prompt line. A second pull of the same host ids adds nothing.
- gates: Critic packet PASS before any code. The follow-up carries A and C. B and D stay off. This docs PR carries C only.
- evidence: The writers below. The live count is the one-day note after the follow-up, not this file.
- next owner: critic, for packet PASS. The implementer takes the follow-up after that PASS.
- escalate: the owner, when the chat host cannot serve the per-seat cursor. That escalation does not start a local watcher.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/grokbot.md`, `docs-site/docs/plates/record-map.md`.

## What reaches the board today

An owner prompt is one activity line: `{t_ct, seat, kind: prompt, action: received|sent, from, to, room?, note?}`. `house/live/tools/live-inbox` posts it to `POST /activity` with the seat key. `from` comes from `name:` under `## Owner` in `house/HOUSE.md`. A missing line warns and uses `owner`. The seat on the stored row comes from the key. `house/live/app/server.mjs` `activityEvent` draws that row as `seat_prompt` and archives it under events. The owner-prompts tile and the `Prompt: <id>` card beat read those stored rows. They do not see a chat the seat never posted.

Three writers were checked.

**Seat command.** `board-prompt` runs on any inbound message only when the seat runs the skill. Owner messages post `--prompt`. Every message posts `--turn start --tag wake` and `--turn end --tag wake`. WAKE-ROUTINE step 0 repeats the prompt command for an owner message inside a webhook wake. `house/live/tools/inbox-watch.sh` posts turn start and turn end for inbox work and never passes `--prompt`. `flushWake` in `server.mjs` writes `{kind: turn, action: start, tag: wake, by: server}` when a webhook delivery returns 2xx, and an ack writes turn end. Those lines are seat status.

**Suit hook.** On a seat suit, UserPromptSubmit runs `session-start.js` (`house/live/docs/fleet-setup.md` suit table). That file records a session boot and a suit activity-log line through `appendHookActivity`. It does not call `live-act-append` and it does not post `/activity`. Grok Bot chat does not load that plugin host (`grok-bot/ops/GROK-HOOK-PROOF.md`, the constitution line in `grok-bot/templates/house/HOUSE.md`, and WAKE-ROUTINE step 1). The example `house/live/tools/live-act-hook.example.sh` is the hook that would call `live_act received prompt`. Nothing in the Grok Bot chat path installs it.

**Box uploader.** `house/live/tools/push_activity.sh` uploads lines already in `ACTIVITY_FILE`. The writer beside it is `live-act-append.sh`. The only checked-in caller of that writer for a prompt is the example hook above. Inbox docs already retire `house/live/feed/push_to_host.sh` for seat activity.

## Box feed watcher

Operating facts supplied with this packet: the old box feed watcher (`fetch_feed` / `push.log`) last pushed to the board on Oct 15 02:21 CT. File mtimes of Oct 18 11:43 CT are a box restore, not a later push.

The repo's watcher does not read Grok Bot chat.

`house/live-mesh/fetch_feed.py` builds the feed the pusher uploads. Its `KINDS` are GitHub ping-pong (`pr_open`, comments, reviews, merges, issues), site (`deploy`, `health_ok`, `health_fail`), X ledger events, and `feed_push`. There is no prompt kind. `house/live/feed/push_to_host.sh` logs each `POST /ingest` of that file to `push.log` and pulls `/activity/pull` into `fleet/remote-activity.jsonl`. The pull copies lines the server already stored.

`house/live/feed/live_fleet.py` can emit `prompt_message` in two cases, both replays:

- `scan_prompts` tails `fleet/prompts.jsonl`. The house template for that file is empty. No Grok Bot path writes it. The comment on the function says seats post with `live-inbox --prompt` and this collector still reads `t_ct`, `from`, and `to`.
- `scan_activity` re-emits prompt rows from `remote-activity.jsonl`, and only when `seat` is in `ACT_SEATS` (`Builder`, `Builder-cloud`). Those rows were already on the board. Fleet seats that post `/activity` do not pass that filter.

On `LIVE_MODE=github` the collector reads `LIVE_ACTIVITY` so a prompt beat can keep the row's time and note (`live_mesh.py` passes `live_fleet.activity_prompts`). That list is activity already stored. It is not a chat cursor.

The watcher emitted fleet status. A `prompt_message` in its feed is a replay of `prompts.jsonl` or of activity already posted. It is not an owner chat the seat forgot to log.

## Options

### 1. The board pulls a per-seat host cursor

The burst-live process already ticks (`governorRun`, `BIFROST_TICK_S`, default 60). On that tick it pulls a cursor per roster seat and writes the prompt itself, the same way `serverActivity` writes a wake turn. No seat process runs. No box process runs.

The repo has no Grok Bot transcript API and no inbound chat webhook. The follow-up adds the puller and this contract, and it stays off until the owner sets the URL:

- `PROMPT_PULL_URL` is https. Unset means the puller logs `prompt-pull: off` once and writes nothing.
- `PROMPT_PULL_SECRET` is sent as `Authorization: Bearer`, never logged, never put in argv. Same handling as `INGEST_SECRET`.
- Each tick: `GET` with `seat` and `since`. The body is `{cursor, messages:[{id, t, room?}]}`. `from` is the owner. `to` is the seat being pulled.
- A key whose name matches `body`, `text`, or `message` drops that message. The cursor does not advance past a dropped id. The stored line has no message text. `note` stays omitted.
- `from` is the configured owner label (`name:` / `LIVE_OWNER` / `house/live/app/owner-name.sh`). When that label is missing, `from` is the word `owner`.
- The internal writer sets `by: server`, `kind: prompt`, `action: received`, optional `room`. It does not call `noteWake`. Prompt lines stay off the inbox, which already refuses to route them.
- Dedupe key is the host message id, stored in `tag` (40-character cap; a longer id is a short hash). A second pull of the same id appends nothing.
- The first successful pull stores the cursor in `prompt-cursors.json` on the volume and appends nothing. Later ticks append ids newer than that cursor, `t_ct` inside the existing 24-hour activity window.
- A tick stores at most 50 messages per seat and leaves the cursor on the last stored id.

This is the chosen option.

### 2. A Grok Bot platform hook

No such hook exists for owner chat.

UserPromptSubmit on a worn suit runs `session-start.js` and stops there. Grok Bot chat is not that host, so the hook does not fire for these messages. Wiring `live-act-append` into `session-start.js` would still miss Grok Bot chat, and it would log through the box uploader the inbox docs already retired.

`POST /cursor/webhook` records cloud-agent status. `SEAT_WEBHOOKS` are doorbells the server sends after an inbox line exists. Neither delivers an owner chat message.

Building a pretend hook inside the assistant is the path `GROK-HOOK-PROOF.md` already closes. This option stops here.

### 3. Derive the prompt from a turn-start line

A turn start is already written for webhook wakes (`flushWake`) and for any seat that runs the skill or `inbox-watch.sh`. `promptView` returns null for `seat_turn`. The owner-prompts tile counts prompt rows whose `from` is the owner. A synthesized prompt on every turn start would count inbox wakes as owner chats, and an owner message that never starts a turn would still be missing. Acceptance asks for a prompt line. This option produces seat status.

### Local watcher

A tail of chat logs on the seat computer, or a revival of `prompts.jsonl` / `push_to_host.sh`, is a local watcher. The repo calls that the no-local-watchers rule (`house/live/docs/inbox.md`, `house/live/docs/fleet-setup.md`). OP-PROC keeps deep work off the seat computer. The Arch1 inbox poll is a named owner exception, and that script posts turns, not prompts. A new local watcher waits for the same kind of named approval. It is not this follow-up.

## Scope

The follow-up adds the puller and the docs below. It leaves the turn posts, the owner-prompts tile, and the `Prompt: <id>` card beat as they are. The skill may still post `--prompt`. Those lines have no host id, so a seat that still runs the skill can add a second line for one message until the template stops requiring the command. Acceptance seats do not run it.

The puller does not open cards, launch clouds, or copy message text into `note`.

## Files

The follow-up edits these:

- `house/live/app/prompt-pull.mjs` — the cursor pull, the seed, the cap, the dedupe.
- `house/live/app/server.mjs` — call it from the governor tick; write through the internal activity path with `by: server`.
- `house/live/tests/prompt-pull.test.mjs` — the acceptance cases below.
- `house/live/tests/run_tests.sh` — register that file on the node list.
- `grok-bot/skills/board-prompt/SKILL.md` — the server records the owner prompt. The skill still posts the turn. `--prompt` is a backstop, not the writer.
- `grok-bot/templates/house/BOARD-PROMPT.md` — same split.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — step 0 names the board as the prompt writer. Turn start, turn end, and the EXIT trap stay.
- `grok-bot/templates/house/HOUSE.md` — the cadence bullet matches that split. `name:` stays the owner label.
- `grok-bot/OP-PROC.md` — the inbound-message bullet matches that split. The word is owner.
- `house/live/docs/work-tracking.md` — a writer row for the puller, and the migration section.
- `house/live/docs/inbox.md` — prompt lines are server-written. The box pusher stays retired.
- `house/live/docs/activity-upload.md` — `push_activity.sh` is not this path.
- `docs-site/docs/plates/bifrost.md` — seat activity includes the server prompt pull.
- `docs-site/docs/guides/house.md` — the migration paragraph.
- `CHANGELOG.md` and `grok-bot/CHANGELOG.md` — one Unreleased bullet on the follow-up. This packet PR does not add a shipped behavior line.

`house/live/tests/test_wake_template.py` today requires step 0 to contain `live-inbox <seat> --prompt`. The follow-up changes that assertion so step 0 names the board writer and still requires turn start and turn end.

## Docs

OP-PROC, WAKE-ROUTINE, the house template (`HOUSE.md`, `BOARD-PROMPT.md`), the board-prompt skill, the live docs (`work-tracking.md`, `inbox.md`, `activity-upload.md`), the Bifrost plate, the house guide, and both changelogs, as listed above.

Migration, written in `house/live/docs/work-tracking.md` and `docs-site/docs/guides/house.md`:

- Seats that still run `--prompt` keep posting. The puller dedupes its own host ids. A double line is possible only while a seat still posts the backstop.
- The first live tick seeds the cursor and writes nothing. Messages before that tick stay in history.
- `PROMPT_PULL_URL` unset leaves the board as it is today. That state fails the one-day measurement.
- `push_to_host.sh`, `prompts.jsonl`, and `push_activity.sh` stay retired for this path. Do not point the pull URL at the box.
- A local watcher is not part of the migration. It needs a named owner approval.

`docs-site/docs/guides/consumer-migration.md` stays the npm wear guide. This change is fleet board behavior.

## Tests

Run with `house/live/tests/run_tests.sh`.

- A fixture cursor returns two messages for one seat. The server appends two lines, `kind: prompt`, `action: received`, `from` the owner, `to` that seat, `by: server`, `room` set only on the room message. The events archive has `seat_prompt` for each. A third pull of the same ids adds zero.
- A message that carries `body`, `text`, or `message` is dropped. The cursor stays on the previous id. The activity file has no text from that message.
- The first pull stores the cursor and appends nothing.
- `flushWake` still writes one `kind: turn`, `action: start`, `tag: wake`, `by: server`, and writes no prompt. The owner-prompts count does not move.
- `session-start.js` still has no `live-act-append` and no `/activity` post. A small unit test locks that source.
- `inbox-watch.sh` still never passes `--prompt`.
- `fetch_feed.KINDS` still has no prompt kind. `scan_prompts` on an empty `prompts.jsonl` emits no `prompt_message`.

## One-day measurement

The clock starts the tick after deploy, once `PROMPT_PULL_URL` is set and the seed tick has stored a cursor.

Within that day:

1. The owner sends one 1:1 and one room message to a seat that does not run `live-inbox --prompt` and whose webhook wake is not running. Before the next governor tick ends, `activity.jsonl` has two `kind: prompt` lines for that seat, `action: received`, `from` the owner, `by: server`, and `room` only on the room line. The events archive shows `seat_prompt` for both. The owner-prompts tile counts them.
2. A webhook wake in the same window adds one `kind: turn` start tagged `wake` and does not add a prompt line. The tile does not move for that wake.
3. Another pull of those same host ids leaves the prompt count unchanged.
4. A seat that only shows active or working, or only a turn line, fails the day. The working chip may follow the prompt line. The proof is the prompt line.
5. An unset pull URL fails the day. The measurement does not start a local watcher to fill the gap.

The note on the card is the prompt count, the tile's byte total, and whether steps 1–3 matched. That note is the evidence. It is not a gate on this packet PR.

## Out of scope

The #474 turn posts, the EXIT trap, the owner-prompts tile, and the `Prompt: <id>` beat stay. This follow-up does not edit `session-start.js` to call the box uploader, does not revive `push_to_host.sh`, and does not treat a turn as a prompt.
