# Inbox

## Who fixes stopped work

- **Bifrost owns the board.** `seats.coord` stays blinky. blinky plans the next wave. Bifrost routes the inbox and keeps wave timing.
- **Nudge.** One path: `evalNudges` in `app/server.mjs`. A live card with no beat sends L1 to the next owner, or else the card owner. L3 repeats to that seat. CoS is not woken to reassign. An unacked inbox line steps L1, L2, and L3 on that same seat. A line the seat already acked, or whose handled key is already in the [cursor folder](../../../grok-bot/OP-PROC.md#cursor-folder), gets no L1, L2, or L3. A missed handoff is a separate ladder: the card is flagged `handoff missing`, and the owing seat is nudged L1, then L2, then L3. A room post does not clear it.
- **Tripwire (the whole board stops moving).** On a stalled board, the timed run wakes every seat with open work, each with a deadline. On an empty board, it wakes blinky (`seats.coord`) to pull the next work, unless weekly burn is at or above 75% (`BIFROST_WEEKLY_BURN` of `0.75` or `75`): that empty-board wake stays quiet and no seat is woken. Below 75% the empty board still wakes blinky. `POST /clock` stays on that seat. Once per window.

`POST /inbox` and `POST /inbox/builder` take `{lines, replace?}`. Each line is checked before anything is cleared. `replace: true` on the builder route clears that seat only after a line validates. A batch that stores nothing returns 400 and names the rejected refs (`id`, or `#` plus the index when the line has no id). A bad line in a mixed batch is skipped; the good lines are stored.

**Line fields** (`app/server.mjs` `INBOX_KEYS`; nothing else is accepted):

| Field | Rule |
|---|---|
| `id`, `t_ct`, `seat`, `type`, `reason` | non-empty string; `seat` must be a seat id |
| `repo`, `title`, `url` | string, may be empty |
| `number` | integer (required) |
| `sha` | string, optional |
| `from` | optional seat id (alias or display name accepted). The sender |
| `to` | optional seat id, or `WORK_HUMAN_TO` (default `human`) |
| `kind`, `flag` | optional short token (`[a-z0-9_-]{1,40}`). `run_end` is a `kind` value, not a field |
| `batch` | optional string. The collapsed critic review, CI, and handoff for one PR head. The ask stays in `title` |

Any field name containing `body`, `text`, or `message` is refused (so is any unknown field). Put the ask in `title`. A `kind` of `run_end` is the line the owner's chat posts when a cloud run ends. Bifrost then flushes one `batch` line. `ci_pass` is the other flush. A green head queues critic on `run_end` when the checks are already green, and on `ci_pass` when the run has already ended. A collector ci row carries `head_sha` when it has no `sha`. A green event seen before `run_end` is not replayed. A required-check failure on `run_end` goes back to the worker. A pending check waits.

A line is a tracked packet only when `type` or `kind` is `dispatch`, `ready`, `packet`, `critic_fail`, or `needs_human`, or it is a blocker (`needs_human`, or `to` = `WORK_HUMAN_TO`). Handoff kinds on a `type` `packet` line are `ready`, `critic_fail`, `live_pass`, `merge`, and `ci_fail`. A line that merely names `from` is not a packet. Phases: `sent` (the line exists), `delivered` (it is in the inbox), `woken` (the wake returned 2xx), `acked` (the seat acked it). Unacked past `NUDGE_L1_S` is `overdue`. The last wake per seat is restored from `wakes.jsonl` on boot (`loadPersistedWakes`), not kept only in memory. A merge or a close also stores an `info` line for the author's seat (`your PR merged` / `your PR closed`), including when that seat did the action.

`POST /activity` is per seat. Every seat except Builder sends `Authorization: Bearer <its key>`. The server checks the sha256 against that seat's `SEAT_KEYS` entry and stores the line as that seat. Posting with another seat's name in `seat` returns `403` `{"error":"seat mismatch"}`. An unknown key is `401`. `POST /activity/ingest` is the box-uploader exception: `X-Live-Ingest` may write for every fleet seat, and those lines use the same store. See [work-tracking.md](work-tracking.md) and [activity-upload.md](activity-upload.md).

A read never acks. A non-empty read is the work: handle the line, post the receipt, then ack that id. Printing the title and going back to the chat is a miss. `GET /inbox/<seat>` returns open lines. The receipt is `POST /inbox/<seat>/ack` with `{id}`, `{upto}`, `{stale: true}`, or `{all: true}`. `{stale: true}` acks up to 1000 open lines that have a close or merge event, or a closed or done card. A missing card is not in that set. A second apply takes the rest. A plain `GET /inbox/<seat>` still returns a merged or closed card until that line is acked.

A card date is `live-inbox <seat> --card <owner/repo#n> --start-after <ISO>`. The ISO time carries a numeric offset (`-05:00` or `-06:00` for Chicago). The same date is a GitHub comment whose first line is `Start after: <ISO>`, and that comment counts only from the card owner or a fleet seat. A stranger's comment is ignored. A time more than 30 days out is ignored, on the comment and on `POST /cards/start-after`. The command wins while it is stored. Until that time the card stays parked (no nudge, no tripwire, no empty-board pull). At that time the server wakes the owning seat through the normal inbox wake. The date is on disk, so a restart still honors it.

`tools/live-inbox <seat>` prints open lines. A read does not write the cursor and does not ack. `--peek` means the same as a plain read. `--ack <id>` is the receipt for one handled line. `--ack stale` lists lines with a close or merge event, or a closed or done card, and does not ack until `--apply`, which posts each listed id. A missing card stays, and so does an old handoff whose card is still live. `--upto <id>` acks the stored prefix through that id, including live lines. `--ack all` acks every open line. `--pop <id|all>` is the same receipt as `--ack` for one id or all. A handoff is `live-inbox <seat> --handoff <to> --pr <owner/repo#n> --kind <ready|critic_fail|live_pass|merge|ci_fail> --sha <head>`. It posts one inbox packet and prints the 1:1 line. `--sha` is required and is a head of 7 to 64 hex digits. A plain `GET /inbox/<seat>` returns every unacked line, including a line whose card is closed or merged. An ack hides it. `?all=1` is the history. `LIVE_URL` and `SEAT_KEYS_DIR` are required. `LIVE_CURSORS` is not required. A missing `LIVE_URL` or `SEAT_KEYS_DIR` exits 2 and names it. The cursor folder rule is [Cursor folder](../../../grok-bot/OP-PROC.md#cursor-folder). Run `$XRAY_MAIN/house/live/tools/live-inbox`. The export line in `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` sets `LIVE_URL` and `SEAT_KEYS_DIR`. Another board sets its own first.

## Seat wake URLs and webhooks

**Protocol rule.** Seats do the handoff. The rule is [Handoff = packet + wake](../../../grok-bot/OP-PROC.md) and the lexicon rows **handoff = packet + wake** and **room post**. The command is `live-inbox <seat> --handoff <to> --pr <owner/repo#n> --kind <ready|critic_fail|live_pass|merge|ci_fail> --sha <head>`. It posts the inbox packet and prints the 1:1 line the seat sends. A room post does not discharge the handoff. If that packet is not in the routed seat's inbox within `NUDGE_L1_S`, Bifrost flags the card `handoff missing` and nudges the owing seat L1, then L2, then L3. CoS is not woken to reassign. The server does not post the packet. The cos-forge 1:1 carries the printed `live-inbox` handoff line. A room post is not a handoff.

A webhook on a stored line is the doorbell after the packet exists. It is not a substitute for the 1:1, and it is not the handoff by itself.

### Grok Bot seats use webhooks

Grok Bot seats **do** use webhooks. This reverses the earlier reading of #265 (leave `SEAT_WEBHOOKS` empty), which left packets unread until someone opened the inbox.

- Each seat creates a webhook-triggered inbox wake routine from the pack template [`grok-bot/templates/house/fleet/WAKE-ROUTINE.md`](../../../grok-bot/templates/house/fleet/WAKE-ROUTINE.md). The routine reads the seat's inbox, handles open lines, and acks them (see [Ack route](#ack-route)).
- Standard wake, every seat: [`WAKE-ROUTINE.md`](../../../grok-bot/templates/house/fleet/WAKE-ROUTINE.md) — on an owner message, `--prompt` is checked before an empty inbox stops the turn, then turn start. Before any ack the wake reads the station, then `live-inbox <seat> --repeat --pr <owner/repo#n> --sha <head> --kind <kind>`. That cheap read checks the per-seat cursor key `repo#number|sha|kind`. A new head is not a repeat. `--remember` writes the key after the line is handled. A still-waiting line is acked and does not stop a newer line. A still-waiting stop runs `live-inbox <seat> --release`, and the shell trap runs that release on any exit, not only turn end. An early return runs turn end. A second run posts no turn start and no turn end. Only that claim's owner token may release it or post its turn end. A webhook wake never launches or resumes a cloud agent. It quick-checks the inbox and exits on a duplicate or a still-waiting delivery, records the event, and hands off to the owner's chat (forge for builds, critic for reviews) with a seat message pointing at the card. Only the owner's persistent chat launches or resumes a cloud agent. The card stores `critic_bc` for that PR. On a new head the critic chat resumes `critic_bc` and launches a new agent only when the card has no `critic_bc` or that resume is refused.
- Seat activity does not use the box pusher. `house/live/feed/push_to_host.sh` and its watchdog are retired for seat activity: `live-inbox --prompt`, `live-inbox --turn`, and `live-inbox --cloud` post to `/activity` with the seat's own key. The board does not need the box to be live, and a silent box is not an error.
- burst-live's `SEAT_WEBHOOKS` points at those routines, one entry per seat, and each key lives in its own variable: `WAKE_KEY_<SEAT>` (for example `WAKE_KEY_MILL`), or the variable named by `key_env`.
- When a bot creates its wake routine, it sends the owner the webhook URL, key and header links in the owner's 1:1 chat, so the owner can copy and paste them into the server config. Bots can't read those values themselves. The URL, key and header never go in a room (group chat), a repo, a PR or a log.
- Blinky's (CoS) scheduled sweep is only a backstop: it catches wakes that were dropped and packets the server writes on its own.

**Adding the missing seat webhooks (magnet, nibbler, sound, herald, arch1).** These five have no `SEAT_WEBHOOKS` entry yet, so they get no wake POST. For each:
1. The seat creates its webhook-triggered inbox wake routine (reads with `live-inbox <seat>`, acks one handled line with `live-inbox <seat> --ack <id>`; settled lines, a prefix, and every open line are under [Ack route](#ack-route)).
2. The seat sends its owner the webhook URL, key and header links in the owner's 1:1 only.
3. The owner adds `"<seat>": {"url": "<webhook url>", "key_env": "WAKE_KEY_<SEAT>"}` (plus `header` if the routine needs one) to `SEAT_WEBHOOKS`, and puts the key in `WAKE_KEY_<SEAT>` on the service. Values never go in a room, repo, PR or log.
4. Restart burst-live (config is read at startup) and verify one real wake: `wake: <seat> ok` in the log and the seat confirms its routine ran.
Until then blinky's fallback line and sweep cover them (arch1 has no webhook by design today; see guardrail 1). The seated turn that reads those lines must drain them that turn.

D12 (seats never woken by an inbox packet) is closed under this path.

**Server routing.** After each collector pass the server runs `feed/inbox_pass.py` (the box pusher's rules, `feed/routing/inbox-roles.json`) on the collector's events, stores the new lines in the seat inboxes and fires the seat's webhook. Seen and sent ids live on the volume (`$MESH_DATA_DIR/route/`), so an event is routed once, also across restarts. The first pass on an empty volume marks history seen and delivers only events inside the seed grace (10 minutes before that pass). Older history is not delivered. `SERVER_ROUTING=off` turns it off. The box pusher is no longer needed for collector events; if it runs too, its lines carry the same ids and are not stored twice.

**Route table (our 8 seats).** Every route in `feed/routing/inbox-roles.json` lands on one of our 8 seats (`feed/fleet-roster.json`: blinky, critic, forge, arch1, herald, magnet, nibbler, sound); `tests/test_routing_ours.py` fails on any other name. The mill seat is gone. `@mill`, an implement ask, a rebase ask, a dev ask, and `mill wave` land on forge.

| Event | Seat(s) | Rule |
|---|---|---|
| New issue (`issue_open`) with no owner | blinky stores the fallback line; the wake goes to forge | `fallback`, wake gate |
| Issue / PR / review comment (open, closed or merged) | blinky; also the PR or issue author's seat (comments on outside-author PRs are kept) | `comment_watch` |
| New PR, new head (push to a PR) | critic (re-Light ask) and blinky (heads-up) | `pr_heads`, one line per head |
| Review requested; Light / Strict / re-Light ask | critic | `extra_seats.critic` |
| Deploy / deploy fail / Railway hold, CI failure (`ci_fail`), lab or Railway asks | forge | `seats.operator.seat` + `extra_seats.forge.kinds` |
| Merge to develop, main or bifrost/main; PR ready to merge | forge | `seats.tester.seat`, `extra_seats.forge`, `seats.builder.seat` |
| Implement / rebase / dev ask, `mill wave`, `@mill` | forge | `extra_seats.forge.needles` |
| needs-decision / lead label or ask | blinky | `seats.coord.seat` |
| `@seat` mention (`@forge`, `@critic`, `@blinky`, `@herald`, `@nibbler`, `@sound`, `@magnet`) | that seat | `extra_seats.<seat>.needles` |
| `@arch10x` (the only handle; `@arch1` is a different GitHub user and never routes): Arch1 is outside the fleet, reached only by this explicit mention; bare deep-review / Gate B words never route to him and nothing is copied to blinky | arch1 | `extra_seats.arch1.needles` |
| Anything actionable routed to a seat outside our 8, or to no seat | blinky | `fallback` |

An order or yes in a comment must @-mention the next seat, because the inbox reads only a comment's label and @handles, never its body; the words "may merge" are not a merge ask.

`seats` holds the kit's role rules (reviewer / builder / tester / operator / coord, read by `routing/inbox.py`); each names one of our seats in `"seat"` (or `"off"`, as reviewer is, since `pr_heads` covers it) and `feed/inbox_pass.py` rewrites every line to that seat. The kit defaults stay in `inbox.py`; this file is our install's config. Sample seats (reviewer, tester, qa, coord, operator, triager, growth, qa-one, qa-two, seat-c, chatbot, seo-researcher, seo-writer, offsite-copier) are gone from the routes, the server's seat list and the seat key defaults. The server keeps the kit's `builder` / `builder-cloud` plumbing (installation-token auth, mirror), but nothing routes to it. An unacked-line nudge stays on that seat. A silent seat's nudge stays on that seat. `/nudges` is forge's (was operator).

**Routing guardrails (#275).** Each has a test in `tests/test_fleet_seats.py` (`Guardrails275`):

1. **Coordinator fallback.** If an actionable event has no owner seat, only seats outside our 8 (unknown, sample, unkeyed; those lines are dropped), or only `arch1` (no webhook), blinky also gets a line. The seated turn that reads it drains it that turn. The seat and the list come from `fallback` in `inbox-roles.json`. Blinky does not assign the dev work.
2. **Actionable kinds only.** The fallback covers new PRs and issues, reviews, review requests, comments, @-mentions, nudges and packets. An unowned push or CI status never creates a line. The existing `pr_heads` route still sends critic and blinky one line per new PR head, because that line is critic's re-Light ask.
3. **No self-wakes.** A seat's own action never lands in its own inbox. The actor is matched by board alias, by bot login in `feed/fleet-nodes.json`, or by `SEAT_BOTS` (env, `{"seat": "login"}` or `{"seat": ["login", ...]}`). The exception is the merge and close info line: that line is still stored for the author's seat when that seat did the merge or the close.
4. **No double wakes.** `SEAT_WATCHERS` (env, `{"seat": {"repos": ["owner/repo" | "*"], "kinds": ["pr_comment" | "*"]}}`) lists the repos and kinds a seat already watches itself. The server skips those for that seat.
5. **Idempotent.** Each event id is routed once, also across restarts (see above).
6. **Pulses never route.** Prompt pulses (owner to seat, seat to seat) and turn, task (`subagent`), watcher and cloud-agent lines never become inbox lines or wakes. They show on the board only. The watcher log is not a wake either, so a seat cannot wait for one.

### Configure

`SEAT_WEBHOOKS` (server env, `app/server.mjs` `loadSeatWebhooks`) is a JSON object keyed by seat id:

```json
{"critic": {"url": "https://wake.example.com/hook", "key_env": "CRITIC_WAKE_KEY"},
 "qa":       {"url": "https://example.com/qa-wake", "key_env": "QA_WAKE_KEY", "header": "X-Wake-Key"}}
```

| Field | Rule |
|---|---|
| seat (key) | lowercased; must be a known seat id, otherwise skipped |
| `url` | `http:` or `https:` URL |
| `key_env` | optional: name of an env var holding the key (`[A-Za-z_][A-Za-z0-9_]{0,80}`). If it's unset or empty, the server uses `WAKE_KEY_<SEAT>` (seat upper-cased, `-` becomes `_`), so `{"mill": {"url": "..."}}` plus `WAKE_KEY_MILL` is enough. The key itself is never in the JSON |
| `header` | optional, `[A-Za-z0-9-]{1,64}`; default `Authorization` |

Invalid JSON logs `wake: SEAT_WEBHOOKS is not json` and disables all wakes. A bad entry logs `wake: skip bad config for <seat>` and only that seat is skipped. The config is read once at startup, so restart the server after changing it.

### When a wake fires

Every inbox line newly stored for a configured seat queues a wake: lines from `POST /inbox` / `POST /inbox/builder` (duplicates by `id` are not new), the server-side mirror of Builder lines into `builder-cloud`, and nudges copied to `builder-cloud`. Acks and reads never fire one.

### Request

- `POST <url>`, `Content-Type: application/json`, `User-Agent: bifrost-live`.
- Auth: with the default header, `Authorization: Bearer <key>`; with a custom `header`, that header carries the raw key (no `Bearer`). There is no body signature (no HMAC); the receiver should compare the key in constant time.
- Redirects are refused; each attempt times out after 8 s.
- Body (string fields truncated server-side; values come from the newest line in the batch, `ids` lists every line in it):

```json
{"seat": "critic", "inbox_id": "<newest line id>", "ids": ["<id>", "<id>"],
 "type": "<line type>", "repo": "owner/repo", "number": 12, "title": "...", "url": "https://example.com/...", "reason": "..."}
```

Any 2xx is success. The response body is ignored.

### Batching, debounce, retry

- A quiet seat sends after `WAKE_COALESCE_MS` (default 50 ms), so a burst is one POST.
- After a send, further lines wait until `WAKE_DEBOUNCE_S` (default 60 s) since the last send, then go out together in one POST.
- Seats due at the same moment (a redeploy, one event routed to several seats) go out `WAKE_STAGGER_MS` apart (default 1500 ms), never all at once: the seats' automations share one Cursor account.
- 3 attempts per POST, backoff `WAKE_RETRY_MS` (default 400 ms) then double. After the third failure the batch is dropped (the lines stay in the inbox). The server logs `wake: <seat> ok|fail attempts=<n> [error] [body="…"]`; on a non-2xx, `body` is the receiver's response (one line, 160 chars, the key and the webhook URL / automation id replaced by `[redacted]`). Errors are `http_<status>`, `timeout`, a network code, or `no_key` (neither the `key_env` variable nor `WAKE_KEY_<SEAT>` is set; no request is sent).
- A stuck `http_400` with `Automation run rate limit exceeded` in `body` clears when the seat pauses and resumes its existing wake routine. Do not recreate the routine (the webhook URL and key stay the same).
- The inbox write never waits on the webhook, and a wake failure never fails the write.

### Verify on /healthz

`GET /healthz` (no auth) has `wakes`: `{seat: "ok" | "fail" | "no_key" | "idle"}` for each configured seat. `idle` means a key is set but nothing has been sent since the server started. It shows no URL or key. To verify, POST one ack-only packet per seat, check that each seat shows `ok`, and check that each ack comes back.

`/healthz` also has liveness ages in seconds, `null` if never: `box_age` (last box status push), `collector_age` (collector feed file mtime), `card_age` (last board card change), and `data_age` (newest GitHub event `t_ct`, not the collector write). `board` is `building` (no board yet), `empty` (a board with zero cards), or `live`. `origin` is the pinned public origin, or null. `ok` is false when `feed_quiet` is true (the collector feed file is older than `COLLECTOR_STALE_S`, default 180, and the collector is watched) or when `cards_behind` is true (a card-worthy event, never CI or `pr_commit`, is newer than the board or the card clock by more than `CARD_BEHIND_S`, default 180). `data_age` and `box_age` are reported (`box_informational: true`) and do not change `ok`. HTTP is 503 when `ok` is false, otherwise 200. A quiet night with old GitHub events stays up. `arch1_launch.enabled` is false unless `ARCH1_LAUNCH_ENABLED=1`.

### No webhook set (fallback)

A seat not in `SEAT_WEBHOOKS` gets no POST. It learns of work from the one-line `SendToAgent`, from blinky's sweep, or by reading its inbox (`GET /inbox/<seat>`, then ack). The seated turn must drain what it just read: a non-empty read is the work, not a reason to wait.

### Ack route

Reading never acks, but a non-empty read is the work. Seats read with `live-inbox <seat>`, handle each line, then ack with `live-inbox <seat> --ack <id>`, never a hand-built curl (a wake routine runs only that tool, so it raises no approval card). `--ack stale` lists lines with a close or merge event, or a closed or done card, and does not ack until `--apply`, which posts `{"id"}` for each listed line. A missing card stays, and so does an old handoff on a live card. `--upto <id>` acks the stored prefix through that id, including live lines. `--ack all` acks every open line. Under the hood a one-id ack is `{"id"}`, a prefix is `{"upto"}`, and every open line is `{"all":true}`. The server also accepts `{"stale":true}`, which acks up to 1000 of that set. The tool does not send `{"stale":true}`. An unacked line stays open and is read again on the next wake or sweep.

### Key folder on our box

`LIVE_URL` and `SEAT_KEYS_DIR` are required. A missing or empty one exits 2 and names it. `LIVE_CURSORS` is not required. The cursor folder rule is [Cursor folder](../../../grok-bot/OP-PROC.md#cursor-folder). Run the export line in `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` first. Another board may export its own `LIVE_URL` and `SEAT_KEYS_DIR` on the line before the block. Never put a key's value in a routine, room or repo.

**Tool path.** Run `$XRAY_MAIN/house/live/tools/live-inbox` from the main checkout. Do not run a copied binary. A wake only counts once the routine reads and acks with no approval card.

### Reading the inbox after a wake

The wake carries no secrets and is not the record. The wake routine runs the committed tool and nothing else: it never builds an inbox or ack request by hand with curl.

```sh
tools/live-inbox <seat>                      # read open lines (never acks)
tools/live-inbox <seat> --ack <id>           # receipt for one handled line
tools/live-inbox <seat> --ack stale          # list close/merge or closed/done; does not ack
tools/live-inbox <seat> --ack stale --apply  # ack the ids just listed
tools/live-inbox <seat> --upto <id>          # stored prefix through that id, including live lines
tools/live-inbox <seat> --ack all            # every open line
```

`live-inbox` reads the seat key from its own key file and calls `GET /inbox/<seat>` and `POST /inbox/<seat>/ack`; the raw routes above are for reference only.

### Minimal receiver (Node)

```js
import http from 'node:http';
import crypto from 'node:crypto';
const KEY = process.env.CRITIC_WAKE_KEY;
const ok = h => { const a = Buffer.from(h || ''), b = Buffer.from('Bearer ' + KEY); return a.length === b.length && crypto.timingSafeEqual(a, b); };
http.createServer((req, res) => {
  if (req.method !== 'POST' || !ok(req.headers.authorization)) { res.writeHead(401); return res.end(); }
  let raw = ''; req.on('data', c => { raw += c; }).on('end', () => {
    res.writeHead(204); res.end();                        // answer fast; do the work after
    const w = JSON.parse(raw);
    console.log('wake', w.seat, w.ids.length, 'line(s); read the inbox now');
  });
}).listen(8080);
```

### Test with curl

For your own receiver only (never a seat's Cursor webhook, and never from a wake routine). Send the same shape to your receiver by hand:

```sh
curl -i -X POST https://wake.example.com/hook \
  -H "Authorization: Bearer $CRITIC_WAKE_KEY" -H 'Content-Type: application/json' -H 'User-Agent: bifrost-live' \
  -d '{"seat":"critic","inbox_id":"test-1","ids":["test-1"],"type":"test","repo":"owner/repo","number":0,"title":"wake test","url":"","reason":"manual"}'
```

End to end: post a line for the seat with `POST /inbox` (ingest secret) and watch the server log for `wake: <seat> ok`.

### Sending a test wake

A test wake is one properly formed inbox line, sent with `POST /inbox` and the `X-Live-Ingest` header (the ingest secret). Body: `{"lines": [ {...} ]}` where each line has `id` (unique, e.g. `test:<seat>:<time>`), `seat`, `t_ct` (ISO time with offset), `type` (`test`), `repo` (`owner/name`), `number` (0 if none), `title`, `url` (may be empty) and `reason` (name the sender, e.g. `test wake from forge`). No `body`, `text` or `message`. A malformed line returns 400 and proves nothing about the wake (forge's 10:22 test on 2026-10-13).

Receipt: `200` with `added: 1`, then `wake: <seat> ok` in the server log, then the seat confirms its routine ran and acks with `live-inbox <seat> --ack <id>`.

**Who can send one.** Today only forge can: it holds the ingest secret (`INGEST_SECRET`) on the box, and seat keys can only read and ack their own inbox. For another seat (or critic's final pass) to send test wakes, Blaze has to approve either sharing the ingest secret with that seat in its owner's 1:1, or a new per-seat send key with a `/inbox` route that accepts `type: test` lines only (not built yet).

### Unclear in the code

- Wake status (last result per seat) is kept in memory but no route exposes it; the server log is the only signal.
- Pending wakes live in memory only; a restart drops them (the inbox lines persist).
- Once the 3 attempts fail, the batch is not retried later. A newer line starts a fresh batch.

## Arch1 / CLI seats (Grok CLI)

Arch1 runs in Grok CLI on Blaze's Mac. Grok CLI has no webhook receiver, so `SEAT_WEBHOOKS` has no URL for arch1 and the seat **polls** its inbox instead. Arch1 is a known inbox seat on the server (`SEAT_IDS` in `app/server.mjs`, `feed/seat_keys.sh` defaults, `feed/routing/inbox-roles.json`). Arch1 is outside the fleet: only an explicit @arch10x (or @arch1) mention routes to him, and his lines are never copied to blinky.

**Getting woken (host monitor, every ~60s).** The Mac has no public URL, so a webhook would need a tunnel; we use no tunnel and no webhook. Arch1 polls locally, and the Grok session hears a line only when the host's internal monitor is running the script. A launchd job is not that path.

Arch1's watcher is `tools/inbox-watch.sh` (default seat `arch1`, every 60 seconds). It runs `live-inbox <seat>` from the main checkout. A failed poll prints `FAIL` once per distinct error, with `LIVE_URL` and the expected value `https://bifrost.0xray.dev`. A failed poll backs off up to 180 seconds and keeps polling. A successful poll writes `pid`, `started`, `last_ok`, and `live_url` to `~/.burst/inbox-watch.state` and the pid to `~/.burst/inbox-watch.pid`. `inbox-watch-ensure.sh` starts one copy when that pid is gone or `last_ok` is older than three polls. `inbox-watch-station.sh` writes the `Watcher:` line on the station page. A JSON line whose GitHub item is closed or merged is acked, and the watch prints `auto-ack` plus that line id. A held line (a hold label, or a card whose state is held) is listed once as `held: N` until that set changes. The hold label is `GITHUB_HOLD_LABEL`, default `on-hold`. A poll with an open line which is not held prints `ACTION_REQUIRED`, then `unfinished:N` (N = open count), then `open N:` with a count per type and one short line per record, newest first, then acks each delivered JSON id and prints `pop` plus that id. The server hides an acked id, so the next poll is quiet until a new event is a new line. A raw line with no id still reprints. A held line is not popped. It does not print the JSON and it never uses `--ack all`. A failed read is tried once more before `FAIL`. `LIVE_INBOX_TIMEOUT` defaults to 60 seconds. A cut display still shows handoffs, PR comments, and reviews. The first time that printed work appears it posts `live-inbox <seat> --turn start --tag wake`. When a later poll is empty it posts `live-inbox <seat> --turn end` once. A failed gh lookup still delivers the line, then pops it. A failed ack does not print `pop` or `auto-ack`, and the line stays open for the next poll. It never prints the key. `live-inbox arch1` reads and never acks (`--peek` is the same). The watcher acks after it prints. The script never starts the work. The Grok turn that sees the printed line does. Defaults, set only to override: `LIVE_URL` = `https://bifrost.0xray.dev`, `SEAT_KEYS_DIR` = `~/.burst/seat-keys`. `LIVE_CURSORS` is not required. The cursor folder rule is [Cursor folder](../../../grok-bot/OP-PROC.md#cursor-folder).

Run it from the main checkout. Set `XRAY_MAIN` to that checkout:

```
"$XRAY_MAIN/house/live/tools/inbox-watch.sh" arch1
```

**Install on Blaze's Mac.**
1. `mkdir -p ~/.burst/seat-keys && chmod 700 ~/.burst/seat-keys`, and keep a checkout of main.
2. Set `XRAY_MAIN` to that checkout. The watcher is `$XRAY_MAIN/house/live/tools/inbox-watch.sh`. It runs `$XRAY_MAIN/house/live/tools/live-inbox`. Do not copy either file into `~/.burst/bin`.
3. Set `LIVE_URL` and `SEAT_KEYS_DIR` (required; `live-inbox` exits 2 and names a missing one): run the export line in `grok-bot/templates/house/fleet/WAKE-ROUTINE.md`.
4. Place `arch1.key` in `~/.burst/seat-keys/` (delivered only through Blaze's 1:1), then `chmod 600 ~/.burst/seat-keys/arch1.key`.
5. Check `python3 --version` (live-inbox needs Python 3).
6. Run it once by hand: `INBOX_WATCH_ONCE=1 "$XRAY_MAIN/house/live/tools/inbox-watch.sh" arch1`. No output means an empty inbox (or only a held set already listed). A delivered open line prints `ACTION_REQUIRED` + `unfinished:N` once, then `pop <id>`. A second run with no new line prints nothing. `FAIL` means the poll failed (a missing `SEAT_KEYS` entry returns 401).
7. Run `"$XRAY_MAIN/house/live/tools/inbox-watch.sh" arch1` as the host's internal monitor, not as a launchd job. Each stdout line is a session event. An empty inbox prints nothing. Tool-call hooks (the suit) are a separate install: [fleet-setup.md, Suit and hooks](fleet-setup.md#suit-and-hooks).

**Exception to the no-local-watchers rule.** This poll is an approved exception, approved by Blaze on 2026-10-13 at 11:52 CT. The approval covers Arch1's inbox poll on Blaze's Mac.

**Variables (names only).** `LIVE_URL` and `SEAT_KEYS_DIR` are required and are set by the WAKE-ROUTINE export line. `LIVE_CURSORS` is not required. The cursor folder rule is [Cursor folder](../../../grok-bot/OP-PROC.md#cursor-folder).
- `LIVE_URL=https://bifrost.0xray.dev`
- `SEAT_KEYS_DIR=~/.burst/seat-keys`
- `XRAY_MAIN` is the main checkout. The watcher runs `house/live/tools` from there.

The key file is `arch1.key` in `SEAT_KEYS_DIR` (dir 700, file 600). Blaze delivers it only through his 1:1, never in a chat room, a repo or a routine. The server checks it against the `arch1` entry in the `SEAT_KEYS` Railway variable (sha256 of the key); if that entry is missing, every read returns 401 and the fix needs Blaze's GO for the variable change.

**Acking.** After Arch1 posts its receipt on the PR (envs, exit codes, tarball sha), run `live-inbox arch1 --ack <id>` for that line. `--ack stale` lists lines with a close or merge event, or a closed or done card, and does not ack until `--apply`. A missing card stays, and so does an old handoff on a live card. `--upto <id>` acks the stored prefix through that id, including live lines. `--ack all` acks every open line.

**Round-trip test.**
1. forge sends a test wake for `seat: arch1` with `POST /inbox` (see [Sending a test wake](#sending-a-test-wake)); expect 200 with `added: 1`.
2. Arch1 runs `live-inbox arch1` and sees the test line.
3. Arch1 runs `live-inbox arch1 --ack <id>`.
4. The board shows arch1's inbox read and ack (and arch1 goes active for 15 minutes). A 401 at step 2 means the key isn't registered in `SEAT_KEYS`.

**Heartbeat gap.** Like box seats, Arch1's local work in Grok CLI doesn't reach the board; it shows active only on GitHub activity, a read or an ack. The wave 3 heartbeat (`live-inbox` reporting on every wake and task start) covers CLI seats too.

## Presence

`SEAT_PRESENCE` maps a seat whose activity also counts as another seat. A value is a seat name or an array of seat names. A top-level array of pairs is accepted. The default is `{"builder-cloud":"builder"}`. Blank JSON maps nothing. Invalid JSON keeps the default.

Fleet seat mapping (inbox-roles.json, kit defaults, Seat: credit): [fleet-setup.md](fleet-setup.md).

## Governor: tripwire + nudges

Both run on one server tick (`BIFROST_TICK_S`, default 60).

- **Tripwire (the trigger).** The governor loop runs inside the burst-live server (no local watcher; it replaces the old local `house/live-mesh/tripwire_push.py` loop from #227). When no seat has moved anything (events, acks) for `BIFROST_TRIPWIRE_MINUTES` (default 30) it trips on either condition: **stall** (open cards on the board) starts a timed run that wakes each seat with open work, each with its own deadline (`BIFROST_RUN_SEAT_MINUTES` apart, default 2); **empty** (no open cards) wakes blinky (routing role `seats.coord`) with "board empty, pull next work", unless weekly burn is at or above 75% (`BIFROST_WEEKLY_BURN` of `0.75` or `75`): that wake stays quiet and no seat is woken. Below 75% the empty board still wakes blinky. Seats answer by moving the work or posting their blocker in one line. The countdown shows on the board (`clock` in the header; the page's countdown line) until a seat moves something, which clears it. Each trigger fires at most once per window; it re-arms only after the board moves or another full window passes. blinky starts the same run by hand with `POST /clock` (seat key; allowed seats `BIFROST_CLOCK_SEATS`, default the coord seat). The board snapshot is republished only on a real change (`/healthz` `governor_changes`).
- **Nudges (`evalNudges` in `app/server.mjs`, the one nudge path).** Bifrost's only nudge path is `evalNudges`. `src/monitoring/nudge-monitor.ts` is a separate part of the main 0xray package (agent loop detection) and is not used by Bifrost. On the same tick, `evalNudges` handles:
  - **Cards.** A card that stops moving nudges its owner: L1 after `NUDGE_L1_S`. L3 repeats to that seat after the L2 window plus `NUDGE_L3_S` (default 7200). CoS is not woken to reassign. Parked cards are skipped.
  - **Unacked lines.** An open inbox line (not acked, card not moved on) older than `NUDGE_LINE_S` (default 900) gets nudge L1 (kind `line`) and a re-wake of its seat with reason `nudge L1: …`. L2 and L3 follow one window apart, then it stops, so it never loops. An ack closes the nudges. `/healthz` `nudged_lines` counts the open ones.
  - **Unrouted seats.** At startup the server runs the same rules as `tools/bifrost-init --check` on `collector/routing/inbox-roles.json` against `collector/fleet-roster.json`. A seat with no route, or a rule routing to a seat outside the fleet, logs `ROUTING: FAIL …` and shows as `routing` in the board header and `/healthz`. Each unrouted seat also holds an open nudge (kind `unrouted`) on that seat. Production keeps running. `BIFROST_ROUTING_DIR` and `BIFROST_ROSTER` override the paths.
  - **Quiet seats.** The board header `wakes` lists each seat with a webhook: `last_ok` (last successful wake POST) and `quiet` (no good wake within `BIFROST_WAKE_QUIET_MINUTES`, default 240, of now or server start), even with no open line. A quiet seat holds an open nudge (kind `quiet`) on that seat until its next good wake.
