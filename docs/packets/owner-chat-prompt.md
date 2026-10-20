# Owner chat prompts on the board

Packet only. No code in this change. The word for the human is **owner**.

The board already knows how to store a prompt (`kind: prompt` on `POST /activity`, drawn as `seat_prompt`) and how to store an ack (`acks` archive `{seat, line, t_ct}`). Both shipped writers are the seat. `grok-bot/skills/board-prompt/SKILL.md` and step 0 of `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` tell the seat to run `live-inbox <seat> --prompt`. Step 0 and step 3, and the Ack bullet in `grok-bot/OP-PROC.md`, tell the seat to run `live-inbox <seat> --ack <id>`. Seats skip both. An owner message in Grok Bot chat then never becomes a prompt line, and the ack for that message is never logged.

## Packet

- goal: Every owner chat message to a Grok Bot seat lands as a message-received line, an ack, and an owner-prompt on the Bifrost board, with no seat memory and no seat command.
- constraints: Server-side writer. One inbound event derives all three. Ids and the owner label only, never message text. A local watcher needs a named owner approval under the no-local-watchers rule. A turn line is not a prompt and is not an ack. This PR is the packet.
- path: Critic PASS on this packet, then one follow-up implements the files below. The one-day measurement starts after that follow-up is live and the pull URL is set.
- acceptance: Two owner messages to a seat that runs neither `--prompt` nor `--ack` each produce one message-received line (`kind: prompt`, `action: received`, `from` the owner, `to` that seat, `by: server`) and one acks-archive row whose `line` is that host id. That prompt line is the owner-prompt. A webhook wake adds a turn and no prompt and no ack. A second pull of the same ids adds nothing. A turn tagged `ack` is not the proof.
- gates: Critic packet PASS before any code. The follow-up carries A and C. B and D stay off. This docs PR carries C only.
- evidence: The writers below. The live count is the one-day note after the follow-up, not this file.
- next owner: critic, for packet PASS. The implementer takes the follow-up after that PASS.
- escalate: the owner, when the chat host cannot serve the per-seat cursor. That escalation does not start a local watcher.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/grokbot.md`, `docs-site/docs/plates/record-map.md`.

## What reaches the board today

An owner prompt is one activity line: `{t_ct, seat, kind: prompt, action: received|sent, from, to, room?, note?}`. `house/live/tools/live-inbox` posts it to `POST /activity` with the seat key. `from` comes from `name:` under `## Owner` in `house/HOUSE.md`. A missing line warns and uses `owner`. The seat on the stored row comes from the key. `house/live/app/server.mjs` `activityEvent` draws that row as `seat_prompt` and archives it under events. The owner-prompts tile and the `Prompt: <id>` card beat read those stored rows. They do not see a chat the seat never posted.

The writers below were checked.

**Seat command.** `board-prompt` runs on any inbound message only when the seat runs the skill. Owner messages post `--prompt`. Every message posts `--turn start --tag wake` and `--turn end --tag wake`. WAKE-ROUTINE step 0 repeats the prompt command for an owner message inside a webhook wake, and it tells the seat to ack a line with `live-inbox <seat> --ack <id>` only after `--repeat` exits 0. Step 3 tells the seat to ack each handled line the same way. `house/live/tools/inbox-watch.sh` posts turn start and turn end for inbox work and never passes `--prompt` or `--ack`. `flushWake` in `server.mjs` writes `{kind: turn, action: start, tag: wake, by: server}` when a webhook delivery returns 2xx. Those lines are seat status.

**Inbox ack.** `live-inbox <seat> --ack <id>` posts `POST /inbox/<seat>/ack`. `ackLines` in `server.mjs` appends `{seat, line, t_ct}` to the acks archive and to `acks.json`. When that count is non-zero, the route also calls `serverActivity(seat, 'turn', 'end', 'ack')`. That turn line clears working. It is seat status. The logged ack is the archive row. Prompt pulses never become inbox lines (`house/live/docs/inbox.md`, pulses never route), so an owner chat has no inbox id for `--ack` to receipt. A skipped command and a missing line are the same gap: the archive never gets the row.

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

The burst-live process already ticks (`governorRun`, `BIFROST_TICK_S`, default 60). On that tick it pulls a cursor per roster seat. One inbound host message is one event. The server derives three records from it and does not ask the seat to run `--prompt` or `--ack`. No seat process runs. No box process runs.

- **Message received.** One activity line `{kind: prompt, action: received, from: owner, to: seat, by: server, room?, tag: host id}`. This is the `received prompt` shape in `house/live/docs/activity-upload.md`, written on the internal path. No `note`. No message text.
- **Ack.** One acks-archive row `{seat, line: host id, t_ct}`, stored the way `ackLines` stores a receipt (`acks.json` and `appendArchive('acks', ...)`). The seat does not call `POST /inbox/<seat>/ack`. This path does not call `serverActivity` with `kind: turn`, `action: end`, `tag: ack`. That turn end is what the seat route writes after a handled GitHub line, and it clears working. An owner-chat ack must not clear the prompt's working mark.
- **Owner-prompt.** The message-received line is the owner-prompt. The tile and `Prompt: <id>` read that one row. The follow-up does not also write `action: sent` for the same id, so the tile moves by one.

The repo has no Grok Bot transcript API and no inbound chat webhook. The follow-up adds the puller and this contract, and it stays off until the owner sets the URL:

- `PROMPT_PULL_URL` is https. Unset means the puller logs `prompt-pull: off` once and writes no prompt and no ack.
- `PROMPT_PULL_SECRET` is sent as `Authorization: Bearer`, never logged, never put in argv. Same handling as `INGEST_SECRET`.
- Each tick: `GET` with `seat` and `since`. The body is `{cursor, messages:[{id, t, room?}]}`. `from` is the owner. `to` is the seat being pulled.
- A key whose name matches `body`, `text`, or `message` drops that message. The cursor does not advance past a dropped id. The stored line has no message text. `note` stays omitted.
- `from` is the configured owner label (`name:` / `LIVE_OWNER` / `house/live/app/owner-name.sh`). When that label is missing, `from` is the word `owner`.
- The internal writer sets `by: server` on the prompt line and writes the ack row beside it. It does not call `noteWake` and it does not post an inbox line. Prompt lines stay off the inbox, which already refuses to route them. The ack row uses the host id as `line` and does not hide any other inbox id.
- Dedupe key is the host message id, stored in `tag` on the prompt (40-character cap; a longer id is a short hash) and as `line` on the ack. A second pull of the same id appends no prompt and no ack.
- The first successful pull stores the cursor in `prompt-cursors.json` on the volume and appends no prompt and no ack. Later ticks append ids newer than that cursor, `t_ct` inside the existing 24-hour activity window.
- A tick stores at most 50 messages per seat and leaves the cursor on the last stored id.

This is the chosen option.

### 2. A Grok Bot platform hook

No such hook exists for owner chat.

UserPromptSubmit on a worn suit runs `session-start.js` and stops there. Grok Bot chat is not that host, so the hook does not fire for these messages. Wiring `live-act-append` into `session-start.js` would still miss Grok Bot chat, and it would log through the box uploader the inbox docs already retired.

`POST /cursor/webhook` records cloud-agent status. `SEAT_WEBHOOKS` are doorbells the server sends after an inbox line exists. Neither delivers an owner chat message.

Building a pretend hook inside the assistant is the path `GROK-HOOK-PROOF.md` already closes. This option stops here.

### 3. Derive the prompt from a turn-start line

A turn start is already written for webhook wakes (`flushWake`) and for any seat that runs the skill or `inbox-watch.sh`. `promptView` returns null for `seat_turn`. The owner-prompts tile counts prompt rows whose `from` is the owner. A synthesized prompt on every turn start would count inbox wakes as owner chats, and an owner message that never starts a turn would still be missing. The turn end a seat ack writes (`tag: ack`) is the same class of line. Acceptance asks for a prompt line and an acks-archive row. This option produces seat status.

### Local watcher

A tail of chat logs on the seat computer, or a revival of `prompts.jsonl` / `push_to_host.sh`, is a local watcher. The repo calls that the no-local-watchers rule (`house/live/docs/inbox.md`, `house/live/docs/fleet-setup.md`). OP-PROC keeps deep work off the seat computer. The Arch1 inbox poll is a named owner exception, and that script posts turns. It never passes `--prompt` or `--ack`. A new local watcher waits for the same kind of named approval. It is not this follow-up.

## Scope

The follow-up adds the puller and the docs below. It leaves the turn posts, the owner-prompts tile, and the `Prompt: <id>` card beat as they are. The skill may still post `--prompt`, and a seat may still post `--ack` for a host id it already saw. Those posts have no shared host id with the puller until the template stops requiring them, so a seat that still runs either command can add a second prompt line or a second ack until then. Acceptance seats run neither.

A GitHub inbox line, a handoff, `--ack stale`, `--upto`, and `--ack all` stay a seat receipt after the seat handles that line. The puller does not ack those ids. Marking them acked would hide work the seat has not done.

The puller does not open cards, launch clouds, post a wake, or copy message text into `note`.

## Files

The follow-up edits these:

- `house/live/app/prompt-pull.mjs` — the cursor pull, the seed, the cap, the dedupe, and the three derived records.
- `house/live/app/server.mjs` — call it from the governor tick; write the prompt through the internal activity path with `by: server`; write the ack through the acks archive. Do not call the turn-end ack from this path.
- `house/live/tests/prompt-pull.test.mjs` — the acceptance cases below.
- `house/live/tests/run_tests.sh` — register that file on the node list.
- `grok-bot/skills/board-prompt/SKILL.md` — the server records the owner prompt and its ack. The skill still posts the turn. `--prompt` and `--ack` for that chat are a backstop, not the writer.
- `grok-bot/templates/house/BOARD-PROMPT.md` — same split.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — step 0 names the board as the writer of the owner-chat prompt and its ack. Turn start, turn end, and the EXIT trap stay. Step 3 still acks a handled GitHub line with `live-inbox <seat> --ack <id>`.
- `grok-bot/templates/house/HOUSE.md` — the cadence bullet matches that split. `name:` stays the owner label.
- `grok-bot/OP-PROC.md` — the inbound-message bullet and the Ack bullet match that split. The word is owner.
- `house/live/docs/work-tracking.md` — a writer row for the puller, the ack row beside it, and the migration section.
- `house/live/docs/inbox.md` — owner-chat prompt and ack are server-written. A handled GitHub line still uses the ack route. The box pusher stays retired.
- `house/live/docs/activity-upload.md` — `push_activity.sh` is not this path.
- `docs-site/docs/plates/bifrost.md` — seat activity includes the server prompt pull.
- `docs-site/docs/guides/house.md` — the migration paragraph.
- `CHANGELOG.md` and `grok-bot/CHANGELOG.md` — one Unreleased bullet on the follow-up. This packet PR does not add a shipped behavior line.

`house/live/tests/test_wake_template.py` today requires step 0 to contain `live-inbox <seat> --prompt`. The follow-up changes that assertion so step 0 names the board as the prompt and ack writer, still requires turn start and turn end, and still requires `live-inbox <seat> --ack <id>` for a handled GitHub line.

## Docs

OP-PROC, WAKE-ROUTINE, the house template (`HOUSE.md`, `BOARD-PROMPT.md`), the board-prompt skill, the live docs (`work-tracking.md`, `inbox.md`, `activity-upload.md`), the Bifrost plate, the house guide, and both changelogs, as listed above.

Migration, written in `house/live/docs/work-tracking.md` and `docs-site/docs/guides/house.md`:

- Seats that still run `--prompt` or `--ack` for a chat keep posting. The puller dedupes its own host ids. A double prompt or a double ack is possible only while a seat still posts the backstop.
- The first live tick seeds the cursor and writes no prompt and no ack. Messages before that tick stay in history.
- `PROMPT_PULL_URL` unset leaves the board as it is today. That state fails the one-day measurement.
- `push_to_host.sh`, `prompts.jsonl`, and `push_activity.sh` stay retired for this path. Do not point the pull URL at the box.
- A local watcher is not part of the migration. It needs a named owner approval.

`docs-site/docs/guides/consumer-migration.md` stays the npm wear guide. This change is fleet board behavior.

## Tests

Run with `house/live/tests/run_tests.sh`.

- A fixture cursor returns two messages for one seat. The server appends two lines, `kind: prompt`, `action: received`, `from` the owner, `to` that seat, `by: server`, `room` set only on the room message. Each line is the message-received record and the owner-prompt. The events archive has `seat_prompt` for each. The acks archive has one row per host id, `{seat, line: host id}`, and `acks.json` holds those ids. The puller writes no `kind: turn` line. A third pull of the same ids adds zero prompts and zero acks.
- A message that carries `body`, `text`, or `message` is dropped. The cursor stays on the previous id. The activity file and the acks archive have nothing from that message.
- The first pull stores the cursor and appends no prompt and no ack.
- `flushWake` still writes one `kind: turn`, `action: start`, `tag: wake`, `by: server`, and writes no prompt and no ack. The owner-prompts count does not move.
- `POST /inbox/<seat>/ack` for a stored GitHub line still appends that line's ack and still writes `kind: turn`, `action: end`, `tag: ack`. The puller does not call that route and does not add that line's id to `acks.json`.
- `session-start.js` still has no `live-act-append` and no `/activity` post. A small unit test locks that source.
- `inbox-watch.sh` still never passes `--prompt` or `--ack`.
- `fetch_feed.KINDS` still has no prompt kind. `scan_prompts` on an empty `prompts.jsonl` emits no `prompt_message`.

## One-day measurement

The clock starts the tick after deploy, once `PROMPT_PULL_URL` is set and the seed tick has stored a cursor.

Within that day:

1. The owner sends one 1:1 and one room message to a seat that runs neither `live-inbox --prompt` nor `live-inbox --ack`, and whose webhook wake is not running. Before the next governor tick ends, `activity.jsonl` has two `kind: prompt` lines for that seat, `action: received`, `from` the owner, `by: server`, and `room` only on the room line. The events archive shows `seat_prompt` for both. The owner-prompts tile counts them. The acks archive has two rows for that seat whose `line` values are those host ids. The seat's open GitHub inbox lines are unchanged.
2. A webhook wake in the same window adds one `kind: turn` start tagged `wake` and does not add a prompt line or an ack row. The tile does not move for that wake.
3. Another pull of those same host ids leaves the prompt count and the ack count unchanged.
4. A seat that only shows active or working, or only a turn line, fails the day. A turn tagged `ack` with no acks-archive row for the host id fails the day. The working chip may follow the prompt line. The proof is the prompt line and the ack row.
5. An unset pull URL fails the day. The measurement does not start a local watcher to fill the gap.

The note on the card is the prompt count, the ack count, the tile's byte total, and whether steps 1–3 matched. That note is the evidence. It is not a gate on this packet PR.

## Interim

Until that puller is live, each seat follows one line. It is in `grok-bot/OP-PROC.md`, `house/OP-PROC.md`, the house template cadence in `grok-bot/templates/house/HOUSE.md`, `grok-bot/templates/house/fleet/WAKE-ROUTINE.md`, and step 1 of `grok-bot/skills/station/SKILL.md`:

On every owner message, first run `live-inbox <seat> --prompt --note "<gist>"`; after handling any inbox line (in chat or on a wake), ack it right away with `live-inbox <seat> --ack <id>` (or `--ack all` once everything open is handled); when you launch or resume a cloud agent run `live-inbox <seat> --turn start --tag "bc-<first8> <track>"`; when it finishes or is cancelled run `live-inbox <seat> --turn end --tag "bc-<first8>"`. No exceptions for short turns.

`live-inbox` has no `--act` flag. The gist is a short summary, not the message text. The one-day measurement still starts only after the puller is live, on a seat that is not running this line.

## Out of scope

The #474 turn posts, the EXIT trap, the owner-prompts tile, and the `Prompt: <id>` beat stay. A handled GitHub line, a handoff, and `--ack stale` / `--upto` / `--ack all` stay a seat receipt. This follow-up does not edit `session-start.js` to call the box uploader, does not revive `push_to_host.sh`, does not treat a turn as a prompt, and does not treat a turn tagged `ack` as the logged ack.
