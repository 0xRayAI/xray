# Deploy: the live board on Railway

## Quickstart

Follow these in order. Hostnames and seat names below are examples. Put real URLs and keys only in environment variables.

### 1. What runs where

The server process owns the board. Start `/app/docker-entrypoint.sh` from the assembled `house/live/app` directory (Node 20, plus Python 3 on the same machine for the collector child). It serves the page, `/healthz`, cards, inboxes, and acks.

When `GITHUB_READ_TOKEN` is set and `COLLECTOR` is not `off`, the server starts `live_mesh.py` as a child. The child writes `$MESH_DATA_DIR/feed/github-events.json`. The server reads that file, keeps the cards and packets, routes new lines into seat inboxes, and fires seat webhooks. That is the whole loop. A box is not required.

The box is optional. Use it for signals that exist only on another machine. It pushes those with `POST /ingest`. GitHub cards are the collector file. An empty box board does not replace them. `house/live/feed/push_to_host.sh` is retired for that board and for seat activity. Set `COLLECTOR=off` only when you want the server to run with no child at all.

### 2. Environment

Required to boot (gated mode):

| Name | Value |
|---|---|
| `MESH_PASSWORD` | page login. Omit only when the site is public (`LIVE_PUBLIC=1` or `site.json` `"public": true`) |
| `SESSION_SECRET` | 32 characters or more |
| `INGEST_SECRET` | 32 characters or more. Required even when no box runs |

Required before the board is alive:

| Name | Value |
|---|---|
| `GITHUB_READ_TOKEN` | fine-grained read-only token. Without it the server still boots and `/healthz` `board` stays `building` |
| `SEAT_KEYS` | JSON `{seat: sha256hex}`. Without it a seat cannot read its inbox or ack |
| `APP_PUBLIC_ORIGIN` | https origin. Required when `NODE_ENV=production`. `http://127.0.0.1` is allowed for a local run |

Optional, leave unset on a first boot:

| Name | Effect when unset |
|---|---|
| `MESH_DATA_DIR` | `/data` |
| `COLLECTOR` | child starts when the read token is set |
| `COLLECTOR_REPOS` | the example repo list in the collector |
| `COLLECTOR_STALE_S` | 180. Older collector file sets `feed_quiet` |
| `CARD_BEHIND_S` | 180. Open-card data ahead of the cards by more than this sets `cards_behind` |
| `SEAT_WEBHOOKS` | no wake POST. Seats still read and ack their inboxes |
| `RAILWAY_TOKEN` | no deploy poll |
| `ARCH1_LAUNCH_ENABLED` | off. Set to `1` to launch a cloud agent for a real arch1 packet |
| `ARCHIVE_KEY` | `GET /archive` answers 401 |

The full name list is in section 4.

### 3. Volume

Mount one volume at `MESH_DATA_DIR` (`/data`). A few gigabytes is enough to start. Do not delete these directories across deploys:

| Path | What |
|---|---|
| `feed/` | collector output and its store |
| `live/` | inboxes, acks, cards, nudges, and append-only `activity.jsonl` |
| `archive/` | append-only daily history. Never prune it |
| `route/` | ids already routed, so a line is delivered once |
| `home/` | the collector child's home directory |

### 4. Seat keys and webhooks

1. Run `house/live/tools/bifrost-init` once so every seat has a route. `python3 house/live/tools/bifrost-init --check` fails when a seat has none. CI runs that check.
2. Mint seat keys with `house/live/feed/seat_keys.sh mint`. Publish only the hashes: `seat_keys.sh publish` sets `SEAT_KEYS`. The key files stay off the host (mode 0600). A seat sends `Authorization: Bearer <its key>` to `GET /inbox/<seat>`, `POST /inbox/<seat>/ack`, and `GET /cards?seat=<seat>`.
3. For each seat that should be woken, add one entry to `SEAT_WEBHOOKS`: `{"<seat>": {"url": "<wake url>", "key_env": "WAKE_KEY_<SEAT>"}}`. Put the wake secret in `WAKE_KEY_<SEAT>` (or in the variable named by `key_env`). The JSON holds the env name, not the secret.
4. A seat with no webhook still works. It polls `GET /inbox/<seat>` and acks with `POST /inbox/<seat>/ack` and `{"id": "<line id>"}`.
5. `POST /activity` uses the same `SEAT_KEYS` hash. The seat posts only as itself. `SEAT_DISPLAY_NAMES`, `WORK_HUMAN_TO`, `WORK_HUMAN_LANE`, and `SEAT_AGENT_MAP` are optional and hold no secrets. See `house/live/env.example`. Packet phases are sent, delivered, woken, acked, and overdue. GitHub comments, reviews, PR open/push, and issue events mark the mapped actor working on `repo#number` for `LIVE_TURN_OPEN_MIN` minutes. `working` is written by `applyStoredActivity`, `applyTrackWorking`, and `applyGithubWorking`.
6. `CURSOR_WEBHOOK_SECRET` (32 characters or more) signs `POST /cursor/webhook`. Shorter, or unset, the launch does not register a webhook. The chain is `house/live/docs/work-tracking.md`, the same shape as `house/live/docs/activity-upload.md`.
7. `HUMAN_ALIASES`, `LIVE_SEAT_IDS`, and `LIVE_WINDOW_MIN` are optional. Empty `HUMAN_ALIASES` credits a non-roster sender to `github`. burst-live sets `HUMAN_ALIASES=htafolla=Blaze,lead=Blaze`.

### 5. What green means

`GET /healthz` needs no auth.

Green is HTTP 200 and `"ok": true`. That requires both `feed_quiet: false` and `cards_behind: false`.

| Field | Green |
|---|---|
| `ok` | `true` |
| `feed_quiet` | `false`. The collector file is newer than `COLLECTOR_STALE_S`, or the collector is not watched |
| `cards_behind` | `false`. The board file is caught up, and the card clock is within `CARD_BEHIND_S` of ingest. Completed CI counts for the board-file lag only when its number or head matches an open card |
| `board` | `live` once cards exist. `empty` means a board was built with zero cards. `building` means no board has been read yet |
| `wakes.<seat>` | `ok` after a wake returned 2xx. `idle` means the key is set and nothing has been sent yet. `no_key` means that seat has no wake secret. `fail` means the last wake did not return 2xx |
| `collector_age` | small once a feed file has been read. `null` before the first file |
| `data_age`, `box_age`, `card_age` | reported only. They do not change `ok`. `box_informational` is `true` |

HTTP 503 and `"ok": false` means fix `feed_quiet` or `cards_behind`. A quiet night with old GitHub events stays up. `status: "warming"` means the collector is watched and has not written a file yet; that response is still HTTP 200.

`arch1_launch.enabled` is `false` unless `ARCH1_LAUNCH_ENABLED=1`.

### 6. One command on this machine

From the repo root, with Node 20 and Python 3:

```bash
bash house/live/tools/local-smoke.sh
```

That boots the server on a free port, writes one collector feed, and checks four things: a card is on `GET /cards`, the card carries its packet, a new comment wakes the seat, and `POST /inbox/<seat>/ack` clears that line. It uses no token, no network, and no host. The same check is `house/live/tests/flow-smoke.test.mjs`, which `house/live/tests/run_tests.sh` runs.

## Routing is required

Every seat needs a route: a seat no rule routes to gets no inbox lines, so its wake never fires. Before the first deploy, run `house/live/tools/bifrost-init` once. It asks for the seats and their wake URLs, writes `house/live/feed/routing/inbox-roles.json` and `feed/routing/seat-webhooks.json` (placeholders and env names only, never real URLs or keys), and fails if a seat has no route. Put the real URLs in the `SEAT_WEBHOOKS` host variable and each key in `WAKE_KEY_<SEAT>`. `bifrost-init --check` re-validates after hand edits; CI runs it via `house/live/tests/run_tests.sh`.

This answers the hosting questions on #248 from the setup running today. Hostnames, project names, seat names
and repos are examples. No values are secret here; set real values as Railway variables.

Code: [house/live/](../live/) (server in `house/live/app/`, feed pass in `house/live/feed/`).

## 1. Second process: file and start command

There is no separate page/store service. It is one Node process, `house/live/app/server.mjs`
(Node 20, zero npm dependencies), started with `/app/docker-entrypoint.sh`. It serves:

| Route | Auth | What |
|---|---|---|
| `GET /` and static page | none in public mode; else `MESH_PASSWORD` login, cookie `mesh_session` (HMAC with `SESSION_SECRET`, 7 days) | `house/live/app/public/` |
| `GET /live-events.json[?since=<cursor>]` | session cookie | full feed, or delta; `304` unchanged, `409`/reset means refetch full |
| `POST /ingest`, `POST /ingest/delta` | `Authorization: Bearer $INGEST_SECRET` | box-side feed (gzip ok, 25 MB cap) |
| `GET /ingest/events`, `GET /activity/pull` | ingest secret | box signals |
| `POST /inbox` | ingest secret, or that seat's key | ingest posts lines. A seat key posts only its own handoff packet (`type` `packet`, id `handoff:<repo>#<n>:<kind>:<sha>`). A non-packet line is 403 |
| `POST /activity` | that seat's `SEAT_KEYS` entry (Builder: its GitHub App installation token) | activity lines. A cross-seat `seat` is `403` `seat mismatch` |
| `GET /inbox/<seat>[?since=<id>]`, `POST /inbox/<seat>/ack` | that seat's key | seat inbox, ack by id, upto or all |
| `GET /cards?seat=<seat>` | that seat's key (operator: every seat) | cards with packets and beats |
| `GET /nudges?since=<id>` | operator key | nudges for delivery |
| `POST /emit` | emitter key, write-only | external emitter events (tool calls); unknown fields get 422 |
| `GET /healthz` | none | JSON `{ok, feed_quiet, cards_behind, data_age, card_age, box_age, collector_age, board, origin, collector, repos}`. `ok` is false on `feed_quiet` or `cards_behind`. `data_age` and `box_age` are informational. HTTP 503 when `ok` is false. Unreadable repos are listed |
| `GET /archive?date=YYYY-MM-DD&kind=` | `Authorization: Bearer $ARCHIVE_KEY` | one UTC day of append-only JSONL (`events`, `cards`, `inbox`, `nudges`, `acks`, `activity`). Missing or wrong key is 401. Bad date or kind is 400 |

The GitHub collector (`house/live/feed/live_mesh.py`, which imports `house/live-mesh/fetch_feed.py`) is the
second process. `server.mjs` spawns it as a child: `python3 -B -u collector/live_mesh.py --out /data/feed/github-events.json --watch 45 --repos <org/repo ...>`.
`house/burst/ingest.py` is not used on the host.

## 2. Topology

- One Railway service, one container, one volume. No Procfile, no `supervise.py`, no shell `&`.
- `server.mjs` is the supervisor. It starts the collector child at boot. If the child exits, it restarts it with
  backoff (15 s doubling to 300 s), and kills it on shutdown. Set `COLLECTOR=off` or leave `GITHUB_READ_TOKEN` unset to run without it.
- How the feed JSON reaches the server: the child writes `/data/feed/github-events.json` on the same volume, and the
  server reads it on change. Box-side signals (activity, prompts, fleet state) come in through `POST /ingest[/delta]`
  from the box pusher (`house/live/feed/push_to_host.sh`). The server merges both sources by event id, and the
  GitHub copy wins on a tie.
- Inboxes, ack state, cards and nudges are persisted on the volume under `/data/live/`.

## 3. Start commands, builder and runtime

- Builder: Dockerfile (`house/live/app/Dockerfile`): `node:24.22.1-bookworm-slim` plus Debian `python3` (3.11),
  `tzdata`, `ca-certificates`. Stdlib Python only.
- Start: `/app/docker-entrypoint.sh` (from `house/live/app/railway.json`, and from `house/live/app/.railway/railway.ts`). Setting the start command to `node server.mjs` replaces ENTRYPOINT, skips the volume chown, and leaves the server running as root. The child start is shown in section 1.
- Repo-root `railway.json` (`node mcp-server.mjs`) belongs to the xray MCP server, not to this. Do not deploy the
  live board from the repo root. Deploy with `house/live/app/deploy.sh`: it assembles a deploy dir (app files plus
  `collector/` = the `feed/live_*.py` modules and `house/live-mesh/fetch_feed.py`) and runs
  `railway up --service <service> --detach` from that dir. Deploy only via `deploy.sh`: a build from GitHub (a root
  directory) has no assembled `collector/`, and the Dockerfile stops with "collector/ is not assembled" (#292).
- `deploy.sh` names: `LIVE_RAILWAY_PROJECT` (default `burst-live`), `LIVE_RAILWAY_SERVICE` (default `burst-live`), `LIVE_RAILWAY_ENVIRONMENT` (default `production`), `MESH_APP_DEPLOY_DIR` (default `/srv/live/deploy`; created and `railway link`ed on first run if missing, which needs a logged-in railway CLI). A merge to main does not deploy; run `deploy.sh` once after merging. These are the project, the service, and the railway-linked directory. They are not Railway variables on the service.
- `house/live/site/public/` (committed, ours) is copied over the kit `public/` first: our seats, Lens nodes, `avatars/` (blinky, critic, forge, herald from the repo; arch1 from minime0x; Blaze from his X profile @Blaze0x1; others drawn, see [board.md](../live/docs/board.md#avatars)) and `favicon.png` (served at `/favicon.ico`, open in public mode). Another install deletes `house/live/site/`.
- `LIVE_PUBLIC_OVERLAY` is a directory on the machine that runs `deploy.sh`. After the kit `public/` is copied, that directory is copied on top, so a fleet's `live-config.js` and `avatars/` survive the next deploy. Unset means the kit page only.
- `railway.json` (Config as Code) is still read until **2026-12-01**. The replacement is `house/live/app/.railway/railway.ts`: `start` `/app/docker-entrypoint.sh`, `healthcheck` `/healthz`, one replica. `deploy.sh` copies that directory into the deploy dir. Do not `railway config apply` while `railway.json` is still the service config. Before the cutoff, from the deploy dir: `railway config plan`, then `railway config apply`. Rename `service()` and `project()` in that file to match `LIVE_RAILWAY_SERVICE` and `LIVE_RAILWAY_PROJECT`. Put no secrets in the file.

## 4. Env var names (names only)

Railway service (`server.mjs`):

| Name | Need | Notes |
|---|---|---|
| `PORT` | set by Railway | default 8080 |
| `MESH_PASSWORD` | required in gated mode | page login; not needed in public mode (`feed/site.json` `"public": true`, or `LIVE_PUBLIC=1`) |
| `SESSION_SECRET` | required, 32+ chars | cookie HMAC |
| `INGEST_SECRET` | required, 32+ chars | box pusher |
| `APP_PUBLIC_ORIGIN` | required when `NODE_ENV=production` | https origin pinned on `/healthz` (`LIVE_URL` is the fallback). http is only for localhost or 127.0.0.1. An invalid value refuses to start |
| `ARCHIVE_KEY` | optional | bearer for `GET /archive`. Unset still boots; the route answers 401 |
| `COLLECTOR_STALE_S` | optional | default 180. Collector feed file older than this sets `feed_quiet` and `ok` false (HTTP 503) |
| `CARD_BEHIND_S` | optional | default 180. `cards_behind` (and `ok` false) when the board file lags card-moving data by more than this, or when the card clock lags ingest by more than this |
| `LIVE_RAILWAY_TARGETS` | set on deploy | JSON `[[project_name, project_id, service, [envs]]]`. Project burst-live, service burst-live, environment production: `[["burst-live","<Railway project id for burst-live>","burst-live",["production"]]]`. Use the Railway project id |
| `HUMAN_ALIASES` | set on deploy | `htafolla`. Comma or space separated human GitHub logins. Each maps to Blaze |
| `UPSTREAM_REPO` | leave for Blaze | one public repo for the upstream watcher. Leave unset until Blaze names it. Also listed below |
| `COLLECTOR_WATCHDOG_N` | optional | default 3. Restart the feed loop after N missed `COLLECTOR_WATCH_S` ticks. In-process; no second Railway service |
| `CARD_STALE_S` | optional | default 600. Reported as `card_stale_s`. Does not change `ok` |
| `DATA_STALE_S` | optional | default 21600. Reported as `data_stale_s`. Does not change `ok` |
| `RAILWAY_TOKEN` | optional | read-only token. The collector polls deploys over HTTPS when it is set. Unset leaves the poll off. An account or team token is sent as `Authorization: Bearer`; a project token is retried as `Project-Access-Token` (#327) |
| `LIVE_GH_SEATS` | required for seat traffic | JSON list of `{seat, bot, botId, org}`: each seat's GitHub App bot login, its numeric user id (`api.github.com/users/<app>%5Bbot%5D`), and the org it is installed on. `POST /activity` accepts only these installation tokens. Unset keeps the kit example, so every real seat gets 401 |
| `HUMAN_ALIASES` | optional | comma list `alias=Label`. Default empty, so a sender that is not a roster seat credits `github`. burst-live sets `htafolla=Blaze,lead=Blaze` (GitHub login `htafolla`, box node `lead`). Leave `blaze0x1` unset |
| `LIVE_SEAT_IDS` | optional | comma list that replaces the default seat ids. `builder` and `builder-cloud` stay. Unset keeps arch1, forge, critic, mill, blinky, herald, nibbler, sound, magnet |
| `LIVE_WINDOW_MIN` | optional | minutes a seat stays active after its last line. Default 15, clamped from 1 to 1440 |
| `CURSOR_WEBHOOK_SECRET` | optional | HMAC key for `POST /cursor/webhook` (`X-Webhook-Signature: sha256=<hex>`). Under 32 characters, or unset, the launch leaves the webhook unregistered. See `house/live/docs/work-tracking.md` |
| `SEAT_DISPLAY_NAMES` | optional | JSON seat id to lane label. The Work panel reads `fleet.seat_display` |
| `WORK_HUMAN_TO` | optional | inbox `to` that parks a blocker on the human lane |
| `WORK_HUMAN_LANE` | optional | label of that lane |
| `SEAT_AGENT_MAP` | optional | JSON agent id or `id*` prefix to seat |
| `LIVE_TURN_OPEN_MIN` | optional | open turn, and a mapped GitHub comment, review, PR, or issue, stay working this many minutes. Default 20 |
| `RAILWAY_PROJECTS` | optional | JSON list of `{project, projectId, service, environments}`. No default project |
| `ARCH1_LAUNCH_ENABLED` | optional | `1` launches a cloud agent for a real arch1 packet. Default off |
| `SEAT_KEYS` | required for inboxes | JSON `{seat: sha256hex}`; hashes only, from `feed/seat_keys.sh publish` |
| `GITHUB_READ_TOKEN` | for the collector | fine-grained, read-only. Today it covers public repos only: private-repo reads (including CI/check reads) return 403 and the collector logs `skip ... (403)`. Widening the token's repo scope needs Blaze's GO |
| `MESH_DATA_DIR` | optional | default `/data` |
| `COLLECTOR`, `COLLECTOR_REPOS`, `COLLECTOR_ORG`, `COLLECTOR_ORG_REFRESH_S`, `COLLECTOR_HEALTH_URLS`, `COLLECTOR_WATCH_S` | optional | `off`; `org/repo ...`; org whose repos are all watched (unioned with `COLLECTOR_REPOS`); org re-list seconds, default 3600; space-separated app `/health` URLs (unset means the collector probes no host); default 45 |
| `LIVE_FLEET_SEATS` | optional | JSON list of seat names, or `{"seats","board","fold"}`, or a path to that JSON. Unset keeps the example seat list. Passed to the collector. The header "N of M bots active" counts `board` (or the list). |
| `NUDGE_L1_S`, `NUDGE_L2_S`, `NUDGE_L3_S`, `SILENT_S`, `HELD_MAX_S` | optional | 3600, 1800, 7200, 7200, 259200 |
| `EMITTER_WORKING_S`, `BOX_STALE_S` | optional | 120, 180 |
| `GITHUB_HOLD_LABEL` | optional | label that holds a card; default `on-hold` |
| `NO_NUDGE_REPOS` | optional | comma list of `owner/name` or `owner/*`; unset means every repo can be nudged |
| `SEAT_PRESENCE` | optional | JSON `{source seat: dest seat or [dest, ...]}`; default `{"builder-cloud":"builder"}` |
| `SEAT_WEBHOOKS` | set for Grok Bot seats | JSON `{seat: {url, key_env, header?}}` pointing at each seat's inbox wake routine; the key is `process.env[key_env]`, never this JSON. The owner pastes URL, key and header from the seat's 1:1 links. See [inbox.md](../live/docs/inbox.md#grok-bot-seats-use-webhooks) |
| `WAKE_DEBOUNCE_S`, `WAKE_COALESCE_MS`, `WAKE_RETRY_MS` | optional | 60, 50, 400 |
| `JIRA_SITE`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECTS` | optional | all four turn the Jira pull child on; the token stays in that child |
| `JIRA_HOLD_STATUS`, `JIRA_EXCLUDE`, `JIRA_SOURCE`, `SOURCE_ALLOWLIST` | optional | hold status default `On Hold`; `off` disables the pull; allowlist for other sources |
| `UPSTREAM_REPO` or `XRAY_REPO` | leave for Blaze | one public repo to watch. Leave unset until Blaze names it; unset means the upstream watcher is off |
| `UPSTREAM_PINNED`, `XRAY_OURS` | optional | `owner/name#N` list; logins that count as this fleet. Both unset means nothing is tracked |

One Node process (`server.mjs`) serves the page and supervises the collector child. There is no second page service.
The board seats see is the collector board: the `board` object `feed/live_board.py` writes on the collector feed. An empty box board does not replace those cards.

Collector child: its env is built from scratch by the server and holds only `GH_TOKEN` (= `GITHUB_READ_TOKEN`), `HOME`,
`PATH`, `TZ`, `LIVE_MODE=github`, `LIVE_NO_CHECKS=1`, `LIVE_HEALTH_URLS` (from `COLLECTOR_HEALTH_URLS`, empty when unset), `LIVE_MESH_SRC`, and, only when you set them,
`GITHUB_HOLD_LABEL`, `NO_NUDGE_REPOS`, `UPSTREAM_REPO`, `UPSTREAM_PINNED`, `XRAY_REPO`, `XRAY_OURS`, `SEAT_PRESENCE`, `LIVE_NODE_MAP`, `LIVE_BRAND`, `LIVE_BRAND_RE`, `LIVE_SHOW_UNMAPPED`, `LIVE_FLEET_SEATS`, `HUMAN_ALIASES`.
It never sees the password, session secret, ingest secret, seat hashes, or the Jira token.
The child `--health` argument is the first URL in `COLLECTOR_HEALTH_URLS`, or empty. There is no example host.

Stored collector events are relabeled with the current `LIVE_NODE_MAP` when the store is loaded. A seat change does not require deleting the store.

Box (feed pass, `feed/supervisor.sh`): `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` (read-only
mint only), `MESH_RUN`, `LIVE_HEALTH_URLS`, `LIVE_MERGE_QUEUE`, `LIVE_REST_FLOOR`, `LIVE_GQL_FLOOR`, `LIVE_BACKFILL_SECONDS`, `LIVE_RAILWAY_TARGETS` (optional deploy poller; JSON list, ids from your own Railway projects).
Box pusher (`house/live/feed/push_to_host.sh`, not `house/burst/push.sh`): `LIVE_HOME` (default `/srv/live`), `MESH_RUN` (default `/srv/live/run`), `FEED` (default `$MESH_RUN/feed/live-events.json`), plus `MESH_URL` and `INGEST_SECRET` in `$MESH_RUN/.push-env` (mode 0600).
`LIVE_NODE_MAP` (service var) only adds logins: the committed `feed/fleet-nodes.json` (shipped to `collector/`) wins for every login it names, so a stale var (it mapped htafolla to "Blaze0x1") can't override it. The server sets the feed `title` from `site.json` (`title`), whatever the collector or box header says.

Seat helpers and emitter: `LIVE_URL`, `LIVE_KEY`, `SEAT_KEYS_DIR`.
Seat keys (`feed/seat_keys.sh`): `SEAT_KEYS_SEATS` or `SEATS_JSON` for the seat list, `LIVE_RAILWAY_SERVICE`, `MESH_APP_DEPLOY_DIR`, `SEAT_KEYS_DIR`. Unset seats keep the example list. New keys are `<seat>.key`. A legacy bare `builder-cloud` file is still read.

## 5. Volume

One volume on the service, mounted at `/data`. A 5 GB volume is enough to start. Layout: `/data/feed/`
(collector output, store, and `jira-events.json` when Jira is on), `/data/live/` (inboxes, acks, cards, nudges), `/data/archive/`
(append-only daily JSONL, never pruned), `/data/home/` (child HOME).

## 6. Healthcheck

`healthcheckPath: /healthz` in `railway.json`, and `healthcheck: "/healthz"` in `house/live/app/.railway/railway.ts`. `server.mjs` answers `GET /healthz` on `$PORT`. The collector does not
answer HTTP. The `/health` URLs in `COLLECTOR_HEALTH_URLS` are your app's endpoints, polled for status code only. Unset means no probe. `railway.json` stops being read on 2026-12-01; switch to the `.railway/railway.ts` file before that date (section 3).

`/healthz` fields: `data_age` (seconds since the newest GitHub event `t_ct`; null if there is none), `card_age` (seconds since the board last changed; null while `cardsAt` is 0), `box_age`, `collector_age` (collector feed file mtime), `feed_quiet`, `cards_behind`, `last_tick` (collector feed mtime, or null), `stalled` (feed loop older than `COLLECTOR_WATCHDOG_N` times `COLLECTOR_WATCH_S`), `repos_unreadable` (count) and `unreadable_repos` (names), `board` (`building`, `empty`, or `live`), and `origin` (the pinned `APP_PUBLIC_ORIGIN`, or null). `ok` is false when the collector feed file is quiet (`feed_quiet`) or when cards are behind (`cards_behind`: the board file lags card-moving data, or the card clock lags ingest, by more than `CARD_BEHIND_S`). `data_age` and `box_age` are informational. HTTP is 503 when `ok` is false and 200 otherwise, so a quiet night does not restart the service. A 403 or 404 on a per-repo collector read, including workflow runs, adds that repo to `unreadable_repos`. The in-process watchdog restarts a hung feed loop. There is no second service.

Install mismatches are listed as Symptom / Cause / Fix in [house/live/docs/faq.md](../live/docs/faq.md).

## 7. Key model per process

- Server: no GitHub key. It holds sha256 hashes of seat keys (`SEAT_KEYS`), the three secrets above, and verifies
  `POST /activity` installation tokens against GitHub (bot login and id pinned in `LIVE_GH_SEATS`, every installation repo in
  your org). It caches only by sha256 of the token.
- Collector child: `GITHUB_READ_TOKEN` only, a fine-grained read-only token (no Checks permission; suites and runs come
  from Actions). No App keys on the host.
- Box feed pass: App keys (`GITHUB_APP_*`) for a read-only installation token minted every 50 minutes. The mint
  refuses a non-read permission. The box runs in "box" mode (no GitHub calls) when the host collector is on.
- Seats: each seat gets one random key (`feed/seat_keys.sh mint`, files 0600, never printed). Only the hash goes to Railway.
  An off-box builder seat uses its own App installation token instead.

## 8. Region, plan and cost

- Region: one replica in a region close to the seats. Each region works.
- Plan: a Hobby-tier workspace is enough for one small always-on service and a 5 GB volume.
- Cost: roughly $5 to $10 a month (one small Node process plus a Python child, low egress, and the volume at about
  $0.25/GB-month). Check your own Usage page; we did not export an invoice figure.

## What this release adds

Source cards (Jira pull or `POST /ingest/source`), inbox lines that validate before a replace and return 400 when
nothing is stored, a read that does not ack (`--ack` / `--pop` is the receipt), board groups (in work, seat, folded
issues), ghost-card reconcile, holds from a Jira status, a GitHub label, or a `Held:` comment, `NO_NUDGE_REPOS`,
one pinned upstream repo plus `XRAY_OURS`, `SEAT_PRESENCE` (a string or an array of seats), and inbox webhooks.
A merge closes the card. A failed retest after merge needs a new issue.

## Box activity uploader (optional)

If seats on one box share an uploader instead of holding their own `/activity` keys, run `house/live/tools/push_activity.sh` there with `LIVE_URL`, `LIVE_INGEST_SECRET` and `ACTIVITY_FILE` (loop, or `ONCE=1` from cron). It posts to `/activity/ingest`. Details and when to pick it: [`house/live/docs/activity-upload.md`](../live/docs/activity-upload.md). The work-track rules, including `CURSOR_WEBHOOK_SECRET`, are [`house/live/docs/work-tracking.md`](../live/docs/work-tracking.md).
