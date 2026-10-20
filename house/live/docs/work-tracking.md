# Work tracking (packets, activity, Cursor webhooks)

The chain, end to end:

1. **Activity.** A seat posts one JSON line to `POST /activity` with `Authorization: Bearer <its key>`. The server checks the sha256 against that seat's `SEAT_KEYS` entry and stores the line as that seat. A body `seat` that is not the key's seat, an alias of it, or its `SEAT_DISPLAY_NAMES` label is `403` `{"error":"seat mismatch"}`. Builder still uses its GitHub App installation token.
2. **Box upload.** Seats that share one box write locally and one process posts `POST /activity/ingest` with `X-Live-Ingest`. That secret may write for every fleet seat. It is the exception to the per-seat pin. Same checks, same `activity.jsonl`. Chain: [`activity-upload.md`](activity-upload.md).
3. **Packets.** An inbox line is a tracked packet when `type` or `kind` is `dispatch`, `ready`, `packet`, `critic_fail`, or `needs_human`, or it is a blocker (`needs_human`, or `to` = `WORK_HUMAN_TO`). A line that only names `from` is not a packet. Phases: `sent`, `delivered`, `woken`, `acked`. Unacked past `NUDGE_L1_S` is `overdue`. A blocker sits on the `WORK_HUMAN_LANE` lane.
4. **Cursor webhook.** Cursor posts agent status to `POST /cursor/webhook`. The server checks `X-Webhook-Signature` (`sha256=` plus HMAC-SHA256 of the raw body, key `CURSOR_WEBHOOK_SECRET`) with the existing Arch1 verifier. Status 200 appends one row to `agents.jsonl`. The seat comes from the payload, the launch file, or `SEAT_AGENT_MAP` (exact id or `id*` prefix).
5. **GitHub actor.** A PR or issue comment, a review, a PR opened or pushed, or an issue event does not name a seat. The actor login maps to one, and that seat shows working on `repo#number` for the same window as an open turn. A close or a merge of that item clears `working_on` on the seat and in `fleet.working`. The seat can stay working.
6. **Display.** `applyStoredActivity`, `applyTrackWorking`, and `applyGithubWorking` set `fleet.working`. A later writer fills `working_on` only when it is still empty. The page Work panel reads `header.track`. The chip reads `fleet.seat_display` (`SEAT_DISPLAY_NAMES`), not a hardcoded label.

## Config (env only)

| Var | Meaning |
|---|---|
| `SEAT_KEYS` | JSON `{seat: sha256hex}`. `POST /activity` for every seat except Builder |
| `SEAT_DISPLAY_NAMES` | JSON seat id to label. Lanes and the working chip |
| `WORK_HUMAN_TO` | inbox `to` that parks a blocker on the human lane |
| `WORK_HUMAN_LANE` | that lane's label |
| `SEAT_AGENT_MAP` | JSON agent id or `id*` prefix to seat. Webhooks and `bc-` ids |
| `LIVE_TURN_OPEN_MIN` | minutes an open turn, and a mapped GitHub comment, review, PR, or issue, stay working. Default 20 |
| `CURSOR_WEBHOOK_SECRET` | HMAC key for `POST /cursor/webhook`. Unset, or shorter than 32 characters, and the launch does not register a webhook (`arch1 launch: webhook not registered`). A request still needs a matching signature; a missing secret is `401` |
| `CURSOR_WEBHOOK_BASE` | optional public base used when the launch registers the webhook URL. Fallback is the Railway public domain |
| `HUMAN_ALIASES` | `alias=Label` comma list. Default empty, so a sender that is not a roster seat credits `github`. burst-live sets `htafolla=Blaze,lead=Blaze` |
| `LIVE_SEAT_IDS` | comma list that replaces the default seat ids. `builder` and `builder-cloud` stay |
| `LIVE_WINDOW_MIN` | minutes a seat stays active after its last line. Default 15, clamped 1 to 1440 |

## Cursor webhook

Register only when `CURSOR_WEBHOOK_SECRET` is at least 32 characters. The launch sends that secret to Cursor with the webhook URL (`<base>/cursor/webhook`). Cursor signs each delivery. The server rejects a bad or missing `X-Webhook-Signature` with `401` before it writes. A verified delivery that is a new agent status appends `agents.jsonl` and republishes the header. The running agent shows on its own card. It does not mark the launching seat working.

`SEAT_AGENT_MAP` example: `{"bc-forge0001":"forge","bc-nib*":"nibbler"}`.

## GitHub actor to seat

First match wins, login lowercased:

1. `feed/routing/inbox-roles.json` `routing.<seat>.login`
2. `feed/fleet-nodes.json`, then `LIVE_NODE_MAP` for logins the file does not name
3. `LIVE_GH_SEATS` `bot` login
4. `git:<seat>` from `SEAT_GIT_NAMES` (a commit with no GitHub user). A bare login that equals a seat name is not a seat

`critic0x[bot]` is critic. `forge0x1[bot]` is forge. If the actor does not map, a `bc-` id in the actor, label, branch, ref, head, or title maps through `SEAT_AGENT_MAP`. The actor seat wins when both are present. The mark expires after `LIVE_TURN_OPEN_MIN` minutes. `working_on` is `repo#number`. A close or a merge of that item clears the chip on the seat and in `fleet.working`. The seat can stay working.

## What makes a seat working

| Writer | Reads | Sets working when |
|---|---|---|
| `applyStoredActivity` | `activity.jsonl` (`POST /activity`, `POST /activity/ingest`, wake/ack) | an open seat turn, subagent, or watcher. A turn whose tag starts with `bc-` marks that agent, not the seat and not any other seat. A turn `end` or ack clears `fleet.working` for that seat's own turn. A tick does not reopen it. An open seat turn expires after `LIVE_TURN_OPEN_MIN` (default 20 minutes) |
| `applyTrackWorking` | inboxes, `acks.json`, `wakes.jsonl`, `agents.jsonl` | a packet is woken and not acked. A running cloud agent stays on its own card. Chip: `working on <title>` |
| `applyGithubWorking` | feed events whose actor maps to a seat | a PR or issue comment, review, PR opened or pushed, or issue event inside the same window. Chip: `repo#number` |

`POST /activity/ingest` does not set `fleet.working` itself. It appends the same activity lines writer 1 already reads.
