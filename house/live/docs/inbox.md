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

`tools/live-inbox <seat>` prints open lines and advances the local cursor to the newest line seen. It does not ack. `--peek` means the same as a plain read. `--ack <id|all>` and `--pop <id|all>` are the receipt. The cursor dir defaults to `/srv/live/run/fleet/cursors`, which is not writable on the box or a Mac; set `LIVE_CURSORS` to a writable dir (e.g. `~/.burst/cursors`).

## Seat wake URLs and webhooks

**Protocol rule.** A handoff is two things: a packet on the seat's inbox (the record) plus a wake through the fleet's own messaging. The webhook below is the wake only for seats that have no messaging of their own. It never replaces the inbox line; the line is the record, the wake only says "look now".

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
| `key_env` | name of an env var holding the key (`[A-Za-z_][A-Za-z0-9_]{0,80}`). The key itself is never in the JSON |
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
- 3 attempts per POST, backoff `WAKE_RETRY_MS` (default 400 ms) then double. After the third failure the batch is dropped (the lines stay in the inbox). The server logs `wake: <seat> ok|fail attempts=<n> [error]`; errors are `http_<status>`, `timeout`, a network code, or `no_key` (the `key_env` variable is empty or unset; no request is sent).
- The inbox write never waits on the webhook, and a wake failure never fails the write.

### No webhook set (fallback)

A seat not in `SEAT_WEBHOOKS` gets no POST. It learns of work by polling its inbox or by the fleet's own messaging.

### Reading the inbox after a wake

The wake carries no secrets and is not the record. On a wake, the seat reads its inbox with its own seat key and acks what it handled:

```sh
curl -s -H "Authorization: Bearer $SEAT_KEY" https://board.example.com/inbox/reviewer
curl -s -X POST -H "Authorization: Bearer $SEAT_KEY" -H 'Content-Type: application/json' \
  -d '{"upto":"<inbox_id>"}' https://board.example.com/inbox/reviewer/ack
```

(or `tools/live-inbox <seat>` / `--ack`).

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

Send the same shape to your receiver by hand:

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
