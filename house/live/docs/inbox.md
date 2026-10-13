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

A read never acks. `GET /inbox/<seat>` returns open lines. The receipt is `POST /inbox/<seat>/ack` with `{id}`, `{upto}`, or `{all: true}`.

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

D12 (seats never woken by an inbox packet) is closed under this path.

**Server routing.** After each collector pass the server runs `feed/inbox_pass.py` (the box pusher's rules, `feed/routing/inbox-roles.json`) on the collector's events, stores the new lines in the seat inboxes and fires the seat's webhook. Seen and sent ids live on the volume (`$MESH_DATA_DIR/route/`), so an event is routed once, also across restarts; the first pass on an empty volume seeds silently. `SERVER_ROUTING=off` turns it off. The box pusher is no longer needed for collector events; if it runs too, its lines carry the same ids and are not stored twice.

**Routing guardrails (#275).** Each has a test in `tests/test_fleet_seats.py` (`Guardrails275`):

1. **Coordinator fallback.** If an actionable event has no owner seat, or only `arch1` / `arch1-cloud` own it (they have no webhook), blinky also gets a line. The seat and the list come from `fallback` in `inbox-roles.json`.
2. **Actionable kinds only.** The fallback covers new PRs and issues, reviews, review requests, comments, @-mentions, nudges and packets. An unowned push or CI status never creates a line. The existing `pr_heads` route still sends critic and blinky one line per new PR head, because that line is critic's re-Light ask.
3. **No self-wakes.** A seat's own action never lands in its own inbox. The actor is matched by board alias, by bot login in `feed/fleet-nodes.json`, or by `SEAT_BOTS` (env, `{"seat": "login"}` or `{"seat": ["login", ...]}`).
4. **No double wakes.** `SEAT_WATCHERS` (env, `{"seat": {"repos": ["owner/repo" | "*"], "kinds": ["pr_comment" | "*"]}}`) lists the repos and kinds a seat already watches itself. The server skips those for that seat.
5. **Idempotent.** Each event id is routed once, also across restarts (see above).
6. **Pulses never route.** Prompt pulses (owner to seat, seat to seat) and turn, task (`subagent`), watcher and cloud-agent lines never become inbox lines or wakes. They show on the board only.

### Configure

`SEAT_WEBHOOKS` (server env, `app/server.mjs` `loadSeatWebhooks`) is a JSON object keyed by seat id:

```json
{"reviewer": {"url": "https://wake.example.com/hook", "key_env": "REVIEWER_WAKE_KEY"},
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
{"seat": "reviewer", "inbox_id": "<newest line id>", "ids": ["<id>", "<id>"],
 "type": "<line type>", "repo": "owner/repo", "number": 12, "title": "...", "url": "https://example.com/...", "reason": "..."}
```

Any 2xx is success. The response body is ignored.

### Batching, debounce, retry

- A quiet seat sends after `WAKE_COALESCE_MS` (default 50 ms), so a burst is one POST.
- After a send, further lines wait until `WAKE_DEBOUNCE_S` (default 60 s) since the last send, then go out together in one POST.
- Seats due at the same moment (a redeploy, one event routed to several seats) go out `WAKE_STAGGER_MS` apart (default 1500 ms), never all at once: the seats' automations share one Cursor account.
- 3 attempts per POST, backoff `WAKE_RETRY_MS` (default 400 ms) then double. After the third failure the batch is dropped (the lines stay in the inbox). The server logs `wake: <seat> ok|fail attempts=<n> [error] [body="…"]`; on a non-2xx, `body` is the receiver's response (one line, 160 chars, the key and the webhook URL / automation id replaced by `[redacted]`). Errors are `http_<status>`, `timeout`, a network code, or `no_key` (neither the `key_env` variable nor `WAKE_KEY_<SEAT>` is set; no request is sent).
- The inbox write never waits on the webhook, and a wake failure never fails the write.

### Verify on /healthz

`GET /healthz` (no auth) has `wakes`: `{seat: "ok" | "fail" | "no_key" | "idle"}` for each configured seat. `idle` means a key is set but nothing has been sent since the server started. It shows no URL or key. To verify, POST one ack-only packet per seat, check that each seat shows `ok`, and check that each ack comes back.

`/healthz` also has liveness ages in seconds, `null` if never: `box_age` (last box status push), `collector_age` (last collector feed write) and `card_age` (last board card change). If `box_age` keeps growing, the box status reporter has stalled, so restart it.

### No webhook set (fallback)

A seat not in `SEAT_WEBHOOKS` gets no POST. It learns of work from the one-line `SendToAgent`, from blinky's sweep, or by reading its inbox (`GET /inbox/<seat>`, then ack).

### Ack route

Reading never acks. Seats read with `live-inbox <seat>`, handle each line, then ack with `live-inbox <seat> --ack <id|all>`, never a hand-built curl (a wake routine runs only that tool, so it raises no approval card). Under the hood it calls `GET /inbox/<seat>` and `POST /inbox/<seat>/ack` with `{"id":"<id>"}`, `{"upto":"<id>"}` or `{"all":true}`. An unacked line stays open and is read again on the next wake or sweep.

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
const KEY = process.env.REVIEWER_WAKE_KEY;
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
  -H "Authorization: Bearer $REVIEWER_WAKE_KEY" -H 'Content-Type: application/json' -H 'User-Agent: bifrost-live' \
  -d '{"seat":"reviewer","inbox_id":"test-1","ids":["test-1"],"type":"test","repo":"owner/repo","number":0,"title":"wake test","url":"","reason":"manual"}'
```

End to end: post a line for the seat with `POST /inbox` (ingest secret) and watch the server log for `wake: <seat> ok`.

### Unclear in the code

- Wake status (last result per seat) is kept in memory but no route exposes it; the server log is the only signal.
- Pending wakes live in memory only; a restart drops them (the inbox lines persist).
- Once the 3 attempts fail, the batch is not retried later. A newer line starts a fresh batch.

## Presence

`SEAT_PRESENCE` maps a seat whose activity also counts as another seat. A value is a seat name or an array of seat names. A top-level array of pairs is accepted. The default is `{"builder-cloud":"builder"}`. Blank JSON maps nothing. Invalid JSON keeps the default.
