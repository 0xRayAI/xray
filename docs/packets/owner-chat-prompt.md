# Owner chat prompts on the board

Packet only. No code in this change. The word for the human is **owner**.

Nothing in this repo emits an owner-chat event. No reader loads `PROMPT_PULL_URL`. There is no Grok Bot transcript API and no inbound chat webhook. Suit `UserPromptSubmit` runs on the CLI host, not on Grok Bot chat. An acceptance that needs a seat running neither `--prompt` nor `--ack` to grow a `by: server` prompt has no event to fire on.

This packet scopes to the writer that exists. The seat posts `live-inbox <seat> --prompt --from owner`. A real owner-chat source is future work.

## Packet

- goal: An owner message is a seat-posted prompt, `live-inbox <seat> --prompt --from owner`, plus an ack and a cloud turn tag. A server chat source is future work.
- constraints: The seat posts it. The gist is not the message text. No local watcher. A turn line is not a prompt and is not an ack. No `PROMPT_PULL_URL` reader in this packet.
- path: Critic PASS on this packet. The seat files use one wording. A transcript API, an inbound chat webhook, or a `PROMPT_PULL_URL` reader is future work, not this follow-up.
- acceptance: Seat files lock `live-inbox <seat> --prompt --from owner --note "<gist>"`, ack with `--ack <id>` or `--ack all`, and the cloud tags `bc-<first8>`. No seat command means no owner-chat line.
- gates: Critic packet PASS. This docs PR carries C only. B and D stay off.
- evidence: The shared line, locked by `src/__tests__/unit/owner-prompt-interim.test.ts`.
- next owner: critic, for packet PASS.
- escalate: the owner, when a real owner-chat source is required. That does not start a local watcher.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/grokbot.md`, `docs-site/docs/plates/record-map.md`.

## What reaches the board today

An owner prompt is one activity line: `{t_ct, seat, kind: prompt, action: received|sent, from, to, room?, note?}`. `house/live/tools/live-inbox` posts it to `POST /activity` with the seat key. When `--from` is omitted, `from` comes from `name:` under `## Owner` in `house/HOUSE.md`, and a missing line warns and uses `owner`. This packet's command passes `--from owner`. The seat on the stored row comes from the key. `house/live/app/server.mjs` `activityEvent` draws that row as `seat_prompt` and archives it under events. The owner-prompts tile and the `Prompt: <id>` card beat read those stored rows. They do not see a chat the seat never posted.

The writers below were checked.

**Seat command.** `board-prompt` runs on any inbound message only when the seat runs the skill. An owner message posts `live-inbox <seat> --prompt --from owner --note "<gist>"`. A handled inbox line is acked with `live-inbox <seat> --ack <id>` or `--ack all`. A cloud launch or resume posts `live-inbox <seat> --turn start --tag "bc-<first8> <track>"`, and a finish or cancel posts `live-inbox <seat> --turn end --tag "bc-<first8>"`. A webhook wake posts its own turn tagged `wake` and does not run this skill. WAKE-ROUTINE step 0 names that same owner command, then this wake's `live-inbox <seat> --turn start --tag wake`, and it tells the seat to ack a line with `live-inbox <seat> --ack <id>` only after `--repeat` exits 0. Step 3 tells the seat to ack each handled line the same way. `house/live/tools/inbox-watch.sh` posts turn start and turn end for inbox work and never passes `--prompt` or `--ack`. `flushWake` in `server.mjs` writes `{kind: turn, action: start, tag: wake, by: server}` when a webhook delivery returns 2xx. Those lines are seat status.

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

Future work. The burst-live process already ticks (`governorRun`, `BIFROST_TICK_S`, default 60). On that tick it pulls a cursor per roster seat. One inbound host message is one event. The server derives three records from it and does not ask the seat to run `--prompt` or `--ack`. No seat process runs. No box process runs.

- **Message received.** One activity line `{kind: prompt, action: received, from: owner, to: seat, by: server, room?, tag: host id}`. This is the `received prompt` shape in `house/live/docs/activity-upload.md`, written on the internal path. No `note`. No message text.
- **Ack.** One acks-archive row `{seat, line: host id, t_ct}`, stored the way `ackLines` stores a receipt (`acks.json` and `appendArchive('acks', ...)`). The seat does not call `POST /inbox/<seat>/ack`. This path does not call `serverActivity` with `kind: turn`, `action: end`, `tag: ack`. That turn end is what the seat route writes after a handled GitHub line, and it clears working. An owner-chat ack must not clear the prompt's working mark.
- **Owner-prompt.** The message-received line is the owner-prompt. The tile and `Prompt: <id>` read that one row. That puller does not also write `action: sent` for the same id, so the tile moves by one.

The repo has no Grok Bot transcript API and no inbound chat webhook, and nothing reads `PROMPT_PULL_URL`. A later source may add the puller and this contract, and it stays off until the owner sets the URL. That source is not this packet:

- `PROMPT_PULL_URL` is https. Unset means the puller logs `prompt-pull: off` once and writes no prompt and no ack.
- `PROMPT_PULL_SECRET` is sent as `Authorization: Bearer`, never logged, never put in argv. Same handling as `INGEST_SECRET`.
- Each tick: `GET` with `seat` and `since`. The body is `{cursor, messages:[{id, t, room?}]}`. `from` is the owner. `to` is the seat being pulled.
- A key whose name matches `body`, `text`, or `message` drops that message. The cursor does not advance past a dropped id. The stored line has no message text. `note` stays omitted.
- `from` is the configured owner label (`name:` / `LIVE_OWNER` / `house/live/app/owner-name.sh`). When that label is missing, `from` is the word `owner`.
- The internal writer sets `by: server` on the prompt line and writes the ack row beside it. It does not call `noteWake` and it does not post an inbox line. Prompt lines stay off the inbox, which already refuses to route them. The ack row uses the host id as `line` and does not hide any other inbox id.
- Dedupe key is the host message id, stored in `tag` on the prompt (40-character cap; a longer id is a short hash) and as `line` on the ack. A second pull of the same id appends no prompt and no ack.
- The first successful pull stores the cursor in `prompt-cursors.json` on the volume and appends no prompt and no ack. Later ticks append ids newer than that cursor, `t_ct` inside the existing 24-hour activity window.
- A tick stores at most 50 messages per seat and leaves the cursor on the last stored id.

Future work. Not this packet. Nothing emits the per-message event this option needs: no `PROMPT_PULL_URL` reader, no transcript API, and no inbound chat webhook.

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

This packet is the seat-posted prompt. The seat runs `live-inbox <seat> --prompt --from owner --note "<gist>"`. It acks a handled inbox line with `live-inbox <seat> --ack <id>` or `--ack all`. A cloud launch or resume posts `live-inbox <seat> --turn start --tag "bc-<first8> <track>"`. A finish or a cancel posts `live-inbox <seat> --turn end --tag "bc-<first8>"`. A webhook wake still posts its own turn tagged `wake` and never launches or resumes a cloud.

A real owner-chat source is future work. That source would emit one event per owner message. Option 1 is that design. It is not this follow-up, and a seat that runs neither command still produces no owner-chat line.

A GitHub inbox line, a handoff, `--ack stale`, and `--upto` stay a seat receipt after the seat handles that line.

## Files

This change edits the seat line only:

- `docs/packets/owner-chat-prompt.md` — this packet.
- `grok-bot/OP-PROC.md`, `house/OP-PROC.md`, and `grok-bot/templates/house/HOUSE.md` — the inbound bullet and the shared line.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — the shared line and step 0.
- `grok-bot/skills/station/SKILL.md` — step 1.
- `grok-bot/skills/board-prompt/SKILL.md` — the same commands.
- `src/__tests__/unit/owner-prompt-interim.test.ts` — the docs check for that wording.

Option 1 names the puller files. They are future work. This packet does not add them.

## Docs

The shared line is the same string in the seat files above. The gist is not the message text. `docs-site/docs/guides/consumer-migration.md` stays the npm wear guide.

## Tests

`src/__tests__/unit/owner-prompt-interim.test.ts` asserts `live-inbox <seat> --prompt --from owner --note "<gist>"`, ack with `--ack <id>` or `--ack all`, and `--turn start --tag "bc-<first8> <track>"` / `--turn end --tag "bc-<first8>"` in the shared line, in WAKE-ROUTINE step 0, in the inbound bullet, in the station skill, and in the board-prompt skill.

Option 1's puller cases are future work. They are not this packet's proof.

## One-day measurement

There is no one-day count on this packet. A seat that does not run the prompt command produces no owner-chat line. Option 1's measurement starts only after a real owner-chat source exists. It is not a gate here, and it does not start a local watcher.

## Interim

A real owner-chat source is future work. This is the line, in `grok-bot/OP-PROC.md`, `house/OP-PROC.md`, the house template cadence in `grok-bot/templates/house/HOUSE.md`, `grok-bot/templates/house/fleet/WAKE-ROUTINE.md`, and step 1 of `grok-bot/skills/station/SKILL.md`:

On every owner message, first run `live-inbox <seat> --prompt --from owner --note "<gist>"`; after handling any inbox line (in chat or on a wake), ack it right away with `live-inbox <seat> --ack <id>` (or `--ack all` once everything open is handled); when you launch or resume a cloud agent run `live-inbox <seat> --turn start --tag "bc-<first8> <track>"`; when it finishes or is cancelled run `live-inbox <seat> --turn end --tag "bc-<first8>"`. No exceptions for short turns.

`live-inbox` has no `--act` flag. The gist is a short summary, not the message text.

## Out of scope

The #474 turn posts, the EXIT trap, the owner-prompts tile, and the `Prompt: <id>` beat stay. A handled GitHub line, a handoff, and `--ack stale` / `--upto` / `--ack all` stay a seat receipt. This packet does not add a `PROMPT_PULL_URL` reader, does not edit `session-start.js` to call the box uploader, does not revive `push_to_host.sh`, does not treat a turn as a prompt, and does not treat a turn tagged `ack` as the logged ack. A real owner-chat source is future work.
