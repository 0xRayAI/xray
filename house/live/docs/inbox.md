# Inbox

`POST /inbox` and `POST /inbox/builder` take `{lines, replace?}`. Each line is checked before anything is cleared. `replace: true` on the builder route clears that seat only after a line validates. A batch that stores nothing returns 400 and names the rejected refs (`id`, or `#` plus the index when the line has no id). A bad line in a mixed batch is skipped; the good lines are stored.

**Line fields** (`app/server.mjs` `INBOX_KEYS`; nothing else is accepted):

| Field | Rule |
|---|---|
| `id`, `t_ct`, `seat`, `type`, `reason` | non-empty string; `seat` must be a seat id |
| `repo`, `title`, `url` | string, may be empty |
| `number` | integer (required) |
| `sha` | string, optional |

Any field name containing `body`, `text`, or `message` is refused (so is any unknown field). Put the ask in `title`.

A read never acks. A non-empty read is the work: handle the line, post the receipt, then ack that id. Printing the title and going back to the chat is a miss. `GET /inbox/<seat>` returns open lines. The receipt is `POST /inbox/<seat>/ack` with `{id}`, `{upto}`, or `{all: true}`.

`tools/live-inbox <seat>` prints open lines and advances the local cursor to the newest line seen. It does not ack. `--peek` means the same as a plain read. `--ack <id|all>` and `--pop <id|all>` are the receipt. It runs on its defaults with no env: `LIVE_URL` = burst-live, keys in `~/.burst/seat-keys` (`SEAT_KEYS_DIR`), cursors in `~/.burst/cursors` (`LIVE_CURSORS`). Set those only to override.

## Seat wake URLs and webhooks

**Protocol rule.** A handoff is two things: a packet on the seat's inbox (the record) plus a wake. Every handoff is `POST /inbox` plus a one-line `SendToAgent` to that seat that points at the packet. Never one without the other. The webhook never replaces the inbox line; the line is the record, the wake only says "look now".

For a seat in `SEAT_WEBHOOKS`, the webhook is the wake: the server fires it on every stored line. The `SendToAgent` is the backup only, for a seat with no webhook or a wake that failed. You do not need both for a webhook seat.

### Grok Bot seats use webhooks

Grok Bot seats **do** use webhooks. This reverses the earlier reading of #265 (leave `SEAT_WEBHOOKS` empty), which left packets unread until someone opened the inbox.

- Each seat creates a webhook-triggered inbox wake routine. The routine reads the seat's inbox, handles open lines, and acks them (see [Ack route](#ack-route)).
- burst-live's `SEAT_WEBHOOKS` points at those routines, one entry per seat, and each key lives in its own variable: `WAKE_KEY_<SEAT>` (for example `WAKE_KEY_MILL`), or the variable named by `key_env`.
- When a bot creates its wake routine, it sends the owner the webhook URL, key and header links in the owner's 1:1 chat, so the owner can copy and paste them into the server config. Bots can't read those values themselves. The URL, key and header never go in a room (group chat), a repo, a PR or a log.
- Blinky's (CoS) scheduled sweep is only a backstop: it catches wakes that were dropped and packets the server writes on its own.

**Adding the missing seat webhooks (magnet, nibbler, sound, herald, arch1).** These five have no `SEAT_WEBHOOKS` entry yet, so they get no wake POST. For each:
1. The seat creates its webhook-triggered inbox wake routine (reads with `live-inbox <seat>`, acks with `live-inbox <seat> --ack <id>`).
2. The seat sends its owner the webhook URL, key and header links in the owner's 1:1 only.
3. The owner adds `"<seat>": {"url": "<webhook url>", "key_env": "WAKE_KEY_<SEAT>"}` (plus `header` if the routine needs one) to `SEAT_WEBHOOKS`, and puts the key in `WAKE_KEY_<SEAT>` on the service. Values never go in a room, repo, PR or log.
4. Restart burst-live (config is read at startup) and verify one real wake: `wake: <seat> ok` in the log and the seat confirms its routine ran.
Until then blinky's fallback line and sweep cover them (arch1 has no webhook by design today; see guardrail 1). The seated turn that reads those lines must drain them that turn.

D12 (seats never woken by an inbox packet) is closed under this path.

**Server routing.** After each collector pass the server runs `feed/inbox_pass.py` (the box pusher's rules, `feed/routing/inbox-roles.json`) on the collector's events, stores the new lines in the seat inboxes and fires the seat's webhook. Seen and sent ids live on the volume (`$MESH_DATA_DIR/route/`), so an event is routed once, also across restarts; the first pass on an empty volume seeds silently. `SERVER_ROUTING=off` turns it off. The box pusher is no longer needed for collector events; if it runs too, its lines carry the same ids and are not stored twice.

**Route table (our 9 seats).** Every route in `feed/routing/inbox-roles.json` lands on one of our 9 seats (`feed/fleet-roster.json`: blinky, critic, forge, mill, arch1, herald, magnet, nibbler, sound); `tests/test_routing_ours.py` fails on any other name.

| Event | Seat(s) | Rule |
|---|---|---|
| New issue (`issue_open`) | blinky | `extra_seats.blinky.kinds` |
| Issue / PR / review comment (open, closed or merged) | blinky; also the PR or issue author's seat (comments on outside-author PRs are kept) | `comment_watch` |
| New PR, new head (push to a PR) | critic (re-Light ask) and blinky (heads-up) | `pr_heads`, one line per head |
| Review requested; Light / Strict / re-Light ask | critic | `extra_seats.critic` |
| Deploy / deploy fail / Railway hold, CI failure (`ci_fail`), lab or Railway asks | forge | `seats.operator.seat` + `extra_seats.forge.kinds` |
| Merge to develop, main or bifrost/main; PR ready to merge | forge | `seats.tester.seat`, `extra_seats.forge`, `seats.builder.seat` |
| Implement / rebase / dev ask, `mill lap` (Eng Dev) | mill | `extra_seats.mill.needles` |
| needs-decision / lead label or ask | blinky | `seats.coord.seat` |
| `@seat` mention (`@forge`, `@critic`, `@mill`, `@blinky`, `@herald`, `@nibbler`, `@sound`, `@magnet`, `@arch1`) | that seat | `extra_seats.<seat>.needles` |
| Deep-review / Gate B ask | arch1, plus blinky (arch1 has no webhook) | `extra_seats.arch1` + fallback |
| Anything actionable routed to a seat outside our 9, or to no seat | blinky | `fallback` |

An order or yes in a comment must @-mention the next seat, because the inbox reads only a comment's label and @handles, never its body; the words "may merge" are not a merge ask.

`seats` holds the kit's role rules (reviewer / builder / tester / operator / coord, read by `routing/inbox.py`); each names one of our seats in `"seat"` (or `"off"`, as reviewer is, since `pr_heads` covers it) and `feed/inbox_pass.py` rewrites every line to that seat. The kit defaults stay in `inbox.py`; this file is our install's config. Sample seats (reviewer, tester, qa, coord, operator, triager, growth, qa-one, qa-two, seat-c, chatbot, seo-researcher, seo-writer, offsite-copier) are gone from the routes, the server's seat list and the seat key defaults. The server keeps the kit's `builder` / `builder-cloud` plumbing (installation-token auth, mirror), but nothing routes to it. Server nudges and silent-seat lines go to blinky (was coord), `/nudges` is forge's (was operator).

**Routing guardrails (#275).** Each has a test in `tests/test_fleet_seats.py` (`Guardrails275`):

1. **Coordinator fallback.** If an actionable event has no owner seat, only seats outside our 9 (unknown, sample, unkeyed; those lines are dropped), or only `arch1` (no webhook), blinky also gets a line. The seated turn that reads it drains it that turn. The seat and the list come from `fallback` in `inbox-roles.json`.
2. **Actionable kinds only.** The fallback covers new PRs and issues, reviews, review requests, comments, @-mentions, nudges and packets. An unowned push or CI status never creates a line. The existing `pr_heads` route still sends critic and blinky one line per new PR head, because that line is critic's re-Light ask.
3. **No self-wakes.** A seat's own action never lands in its own inbox. The actor is matched by board alias, by bot login in `feed/fleet-nodes.json`, or by `SEAT_BOTS` (env, `{"seat": "login"}` or `{"seat": ["login", ...]}`).
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

`/healthz` also has liveness ages in seconds, `null` if never: `box_age` (last box status push), `collector_age` (last collector feed write), `card_age` (last board card change), and `data_age` (newest GitHub event `t_ct`, not the collector write). `board` is `building` (no board yet), `empty` (a board with zero cards), or `live`. `origin` is the pinned public origin, or null. `ok` is false when a numeric `card_age` exceeds `CARD_STALE_S` (default 600) or a numeric `data_age` exceeds `DATA_STALE_S` (default 21600). The HTTP status stays 200. If `box_age` keeps growing, the box status reporter has stalled, so restart it.

### No webhook set (fallback)

A seat not in `SEAT_WEBHOOKS` gets no POST. It learns of work from the one-line `SendToAgent`, from blinky's sweep, or by reading its inbox (`GET /inbox/<seat>`, then ack). The seated turn must drain what it just read: a non-empty read is the work, not a reason to wait.

### Ack route

Reading never acks, but a non-empty read is the work. Seats read with `live-inbox <seat>`, handle each line, then ack with `live-inbox <seat> --ack <id|all>`, never a hand-built curl (a wake routine runs only that tool, so it raises no approval card). Under the hood it calls `GET /inbox/<seat>` and `POST /inbox/<seat>/ack` with `{"id":"<id>"}`, `{"upto":"<id>"}` or `{"all":true}`. An unacked line stays open and is read again on the next wake or sweep.

### Key folder on our box

`live-inbox` defaults to `~/.burst` (`~/.burst/seat-keys`, `~/.burst/cursors`) and the burst-live URL. On our box the seats keep their keys elsewhere and set the folder variables in their wake routine: `SEAT_KEYS_DIR` (key files, `<seat>.key`) and `LIVE_CURSORS` (read positions), both under `/home/box/burst-run`. `LIVE_URL` overrides the server. Never put a key's value in a routine, room or repo; the routine names the folder only.

**Tool path.** Run the committed tool from the seat's repo checkout, e.g. `/workspace/scratch/<clone>/house/live/tools/live-inbox`, never a copy under `/tmp` (it does not survive a restart). The routine sets `SEAT_KEYS_DIR`, `LIVE_CURSORS` and `LIVE_URL`. A wake only counts once the routine reads and acks with no approval card.

### Reading the inbox after a wake

The wake carries no secrets and is not the record. The wake routine runs the committed tool and nothing else: it never builds an inbox or ack request by hand with curl.

```sh
tools/live-inbox <seat>                 # read open lines (never acks)
tools/live-inbox <seat> --ack <id>      # receipt for one handled line
tools/live-inbox <seat> --ack all       # receipt for everything open
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

Arch1 runs in Grok CLI on Blaze's Mac. Grok CLI has no webhook receiver, so `SEAT_WEBHOOKS` has no URL for arch1 and the seat **polls** its inbox instead. Arch1 is a known inbox seat on the server (`SEAT_IDS` in `app/server.mjs`, `feed/seat_keys.sh` defaults, `feed/routing/inbox-roles.json`); actionable events owned only by arch1 also fall back to blinky (CoS), because nothing can push to it.

**Getting woken (host monitor, every ~60s).** The Mac has no public URL, so a webhook would need a tunnel; we use no tunnel and no webhook. Arch1 polls locally, and the Grok session hears a line only when the host's internal monitor is running the script. A launchd job is not that path.

Use the watcher script `bin/live-inbox-watch [seat] [interval]` (defaults `arch1`, `60`). It runs `live-inbox <seat>` in a loop, prints any open asks with a timestamp, and **never acks**. On a 401 it prints "key not registered" and backs off (5x the interval, doubling, up to an hour); it never reads or prints the key. Set `LIVE_WATCH_DELTA=1` under the host monitor so the same open set prints once, not on every poll. Arch1 also checks whenever Blaze tells it to. `live-inbox arch1` reads and never acks (`--peek` is the same), so repeated polls are harmless; ack only after the receipt (below). The script never acks and never starts the work. The Grok turn that sees the printed line does.

**Install on Blaze's Mac.**
1. `mkdir -p ~/.burst/{bin,seat-keys,cursors} && chmod 700 ~/.burst/seat-keys`
2. Copy `house/live/tools/live-inbox` and `house/live/bin/live-inbox-watch` from the repo into `~/.burst/bin/`, then `chmod +x ~/.burst/bin/live-inbox ~/.burst/bin/live-inbox-watch`.
3. Set the variables (or rely on the defaults): `export LIVE_URL=https://burst-live-production.up.railway.app SEAT_KEYS_DIR=~/.burst/seat-keys LIVE_CURSORS=~/.burst/cursors`.
4. Place `arch1.key` in `~/.burst/seat-keys/` (delivered only through Blaze's 1:1), then `chmod 600 ~/.burst/seat-keys/arch1.key`.
5. Check `python3 --version` (live-inbox needs Python 3).
6. Run it once by hand: `LIVE_WATCH_ONCE=1 ~/.burst/bin/live-inbox-watch arch1`. No output means an empty inbox; "key not registered" means the server's `SEAT_KEYS` has no arch1 entry yet.
7. Run `LIVE_WATCH_DELTA=1 ~/.burst/bin/live-inbox-watch arch1 60` as the host's internal monitor, not as a launchd job. Each stdout line is a session event. An empty inbox prints nothing. The plist `bin/com.burst.live-inbox-watch.plist` writes `~/.burst/live-inbox-watch.log` and nothing in the Grok session reads that file, so loading it does not open the chat. Tool-call hooks (the suit) are a separate install: [fleet-setup.md, Suit and hooks](fleet-setup.md#suit-and-hooks).

**Exception to the no-local-watchers rule.** This poll is an approved exception, approved by Blaze on 2026-10-13 at 11:52 CT. The approval covers Arch1's inbox poll on Blaze's Mac.

**Variables (names only; the defaults already match, so set them only to override).**
- `LIVE_URL=https://burst-live-production.up.railway.app`
- `SEAT_KEYS_DIR=~/.burst/seat-keys`
- `LIVE_CURSORS=~/.burst/cursors`

The key file is `arch1.key` in `SEAT_KEYS_DIR` (dir 700, file 600). Blaze delivers it only through his 1:1, never in a chat room, a repo or a routine. The server checks it against the `arch1` entry in the `SEAT_KEYS` Railway variable (sha256 of the key); if that entry is missing, every read returns 401 and the fix needs Blaze's GO for the variable change.

**Acking.** After Arch1 posts its receipt on the PR (envs, exit codes, tarball sha), run `live-inbox arch1 --ack <id>` for that line, or `live-inbox arch1 --ack all`.

**Round-trip test.**
1. forge sends a test wake for `seat: arch1` with `POST /inbox` (see [Sending a test wake](#sending-a-test-wake)); expect 200 with `added: 1`.
2. Arch1 runs `live-inbox arch1` and sees the test line.
3. Arch1 runs `live-inbox arch1 --ack <id>`.
4. The board shows arch1's inbox read and ack (and arch1 goes active for 15 minutes). A 401 at step 2 means the key isn't registered in `SEAT_KEYS`.

**Heartbeat gap.** Like box seats, Arch1's local work in Grok CLI doesn't reach the board; it shows active only on GitHub activity, a read or an ack. The lap 3 heartbeat (`live-inbox` reporting on every wake and task start) covers CLI seats too.

## Presence

`SEAT_PRESENCE` maps a seat whose activity also counts as another seat. A value is a seat name or an array of seat names. A top-level array of pairs is accepted. The default is `{"builder-cloud":"builder"}`. Blank JSON maps nothing. Invalid JSON keeps the default.

Fleet seat mapping (inbox-roles.json, kit defaults, Seat: credit): [fleet-setup.md](fleet-setup.md).

## Governor: tripwire + nudges

Both run on one server tick (`BIFROST_TICK_S`, default 60).

- **Tripwire (the trigger).** The governor loop runs inside the burst-live server (no local watcher; it replaces the old local `house/live-mesh/tripwire_push.py` loop from #227). When no seat has moved anything (events, acks) for `BIFROST_TRIPWIRE_MINUTES` (default 30) it trips on either condition: **stall** (open cards on the board) starts a timed run that wakes each seat with open work, each with its own deadline (`BIFROST_RUN_SEAT_MINUTES` apart, default 2); **empty** (no open cards) wakes the CoS seat (routing role `seats.coord`, not a name) with "board empty, pull next work". Seats answer by moving the work or posting their blocker in one line. The countdown shows on the board (`clock` in the header; the page's countdown line) until a seat moves something, which clears it. Each trigger fires at most once per window; it re-arms only after the board moves or another full window passes. The CoS starts the same run by hand with `POST /clock` (seat key; allowed seats `BIFROST_CLOCK_SEATS`, default the coord seat). The board snapshot is republished only on a real change (`/healthz` `governor_changes`).
- **Nudges (`evalNudges` in `app/server.mjs`, the one nudge path).** Bifrost's only nudge path is `evalNudges`. `src/monitoring/nudge-watchdog.ts` is a separate part of the main 0xray package (agent loop detection) and is not used by Bifrost. On the same tick, `evalNudges` handles:
  - **Cards.** A card that stops moving nudges its owner: L1 after `NUDGE_L1_S`, L2 to the CoS after `NUDGE_L2_S`, L3 repeats every `NUDGE_L3_S` (default 7200). Parked cards are skipped. This part is unchanged.
  - **Unacked lines.** An open inbox line (not acked, card not moved on) older than `NUDGE_LINE_S` (default 900) gets nudge L1 (kind `line`) and a re-wake of its seat with reason `nudge L1: …`. L2 and L3 follow one window apart, then it stops, so it never loops. An ack closes the nudges. `/healthz` `nudged_lines` counts the open ones.
  - **Unrouted seats.** At startup the server runs the same rules as `tools/bifrost-init --check` on `collector/routing/inbox-roles.json` against `collector/fleet-roster.json`. A seat with no route, or a rule routing to a seat outside the fleet, logs `ROUTING: FAIL …` and shows as `routing` in the board header and `/healthz`. Each unrouted seat also holds an open nudge (kind `unrouted`) to the CoS. Production keeps running. `BIFROST_ROUTING_DIR` and `BIFROST_ROSTER` override the paths.
  - **Quiet seats.** The board header `wakes` lists each seat with a webhook: `last_ok` (last successful wake POST) and `quiet` (no good wake within `BIFROST_WAKE_QUIET_MINUTES`, default 240, of now or server start), even with no open line. A quiet seat holds an open nudge (kind `quiet`) to the CoS until its next good wake.
