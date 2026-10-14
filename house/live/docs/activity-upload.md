# Box activity upload (human and seat messages to the board)

The chain, end to end:

1. **Write** (hook or routine): `tools/live-act-append.sh <seat> <action> <kind> <arg>` appends one JSON line to
   `$ACTIVITY_FILE`. A human's message to a seat is `live-act-append.sh <seat> received prompt <Human>`; a seat's
   message to another is `sent prompt <to seat>`; turns, subagents, watchers and cloud agents use the `#281` kinds.
   Ids and seat names only, never message text. Wire it into an agent hook like `tools/live-act-hook.example.sh`.
2. **Upload**: `tools/push_activity.sh` sends new lines in batches to `POST /activity/ingest` with the
   `X-Live-Ingest` header (the ingest secret). It keeps a cursor (`$ACTIVITY_FILE.cursor`: inode + byte offset)
   and moves it only after HTTP 200, so a line is sent once. It never deletes, truncates or rotates the source.
3. **Ingest** (server): `/activity/ingest` checks each line like `/activity` (same fields, kinds, time window,
   60/min per seat) and also requires a fleet seat; bad lines come back in `rejected` and are skipped.
4. **Display**: stored lines are the same activity the board already shows (seat active / working, prompt
   sender, cloud agents) and `/activity/pull` returns them.

## Config (env only)

| Var | Meaning |
|---|---|
| `LIVE_URL` | board base URL |
| `LIVE_INGEST_SECRET` | the board's `INGEST_SECRET` (sent via a curl stdin config, never argv or logs) |
| `ACTIVITY_FILE` | the local JSONL (writer and uploader) |
| `ACTIVITY_CURSOR`, `PUSH_LOG`, `INTERVAL` (5), `RETRY` (30), `BATCH_LINES` (200) | optional |
| `ONCE=1` / `DRY_RUN=1` | drain and exit (cron) / print the next batch, send nothing |

## Running it

Supervisor loop (the script is its own loop; flock keeps one instance):

    LIVE_URL=... LIVE_INGEST_SECRET=... ACTIVITY_FILE=... nohup tools/push_activity.sh &

Or cron / a systemd timer, every minute: `ONCE=1 tools/push_activity.sh` with the same env (from an env file
that is `chmod 600`). Needs bash and curl only.

## Uploader or per-seat keys?

- Seats that have their **own key** (off-box seats, cloud agents, anything not on the box) post to
  `POST /activity` directly with `Authorization: Bearer <seat key>`. The server pins the seat to the key, so a
  seat can only speak as itself. Prefer this whenever a seat can hold a key.
- Use the **uploader** when several seats and a human share one trusted box, seats can't hold keys, or the box
  must keep working offline: hooks write locally, and one process holding the ingest secret uploads for any fleet
  seat. The ingest secret can write for every seat, so keep it on that box only.

## Server identity (env)

`LIVE_SEAT_IDS` (comma list; replaces the default seat ids, builder plumbing kept) decides which seats `/activity/ingest` accepts. `HUMAN_ALIASES` (`alias=Label,...`, default empty) credits events from a human's node names to one label. `LIVE_WINDOW_MIN` (default 15) is how long a seat stays active after its last line.
