# house/live: the 0xray install of the live board

Bifrost: the live fleet page and the system behind it: a read-only GitHub activity feed, seat inboxes with ack, cards / packets /
beats, nudges, a silent-seat check, parked state, a split card view with a stats strip, and a write-only endpoint for an
external emitter (for example an MCP server reporting tool calls). The page is served from one Railway service; our install runs public mode (no password, no masking), while other installs
default to gated and masked. Seat names in this package are examples (Builder, Reviewer, Tester, QA, Operator, Coord, Lead); rename them in
`feed/live_fleet.py`, `feed/routing/inbox-roles.json`, `feed/seat_keys.sh`, `app/public/live-config.js` and the `GH_SEATS`
table in `app/server.mjs`.

Setup: [SETUP.md](SETUP.md). Operating rules: [PLAYBOOK.md](PLAYBOOK.md). Hosting: [../burst/DEPLOY.md](../burst/DEPLOY.md).

```
 GitHub (example-org/app, mcp)      /health (dev, app)     merge-queue.md
            │  read-only ops-app token                  │ status code only       │ lab retests
            ▼                                              ▼                        ▼
 feed/supervisor.sh ── mints token (50 min) ──► feed/live_mesh.py  (upstream fetch_feed.py --watch 60)
                                                  └ feed/live_collect.py  full backfill, then ETag/since polling
                                                        │
                                       $MESH_RUN/feed/live-events.json  (+ .jsonl, store/)
                                                        │
 feed/push_to_host.sh ── every 60 s, gzip POST /ingest (Bearer INGEST_SECRET) ──► app/server.mjs on Railway
                                                                                      password-gated page (app/public)
```

## Layout

| path | what |
|---|---|
| `app/` | Railway service `burst-live` (project `burst-live`; the kit default name is `live-mesh`): `server.mjs` (login, `/ingest` up to 25 MB, identity or gzip; serves `/live-events.json` with gzip + ETag), `public/` (page + avatars), `deploy.sh` |
| `feed/live_mesh.py` | adapter: imports upstream `fetch_feed.py` (unmodified), replaces `build()`/`write()`, reuses its merge/ordering and `--watch` loop |
| `feed/live_collect.py` | GitHub collector: GraphQL backfill (history, PR commits/reviews/CI), REST + ETag incremental polling, rate-limit floors |
| `feed/supervisor.sh` | mints the read-only token, runs the feed in a scrubbed env, re-mints every 50 min |
| `feed/gh-app-token-readonly.mjs` | read-only installation-token mint; refuses any non-`read` permission |
| `feed/push_to_host.sh` | pusher (gzip, 60 s, single instance via flock) |
| `site/public/` | our install's page overlay (9 seats, Lens nodes, avatars, favicon, footer), copied over `public/` by `app/deploy.sh`; another install has no `site/` and keeps the kit page |
| `feed/live-config.js`, `app/public/` | the page: `docs-site/static/live` plus this overlay (seats, nodes, polling, card panel) |
| `feed/routing/`, `feed/inbox_pass.py`, `feed/nudges.py` | seat inbox routing, nudge delivery |
| `feed/seat_keys.sh` | mint per-seat keys; publish only their sha256 hashes as `SEAT_KEYS` |
| `tools/live-inbox`, `tools/live-cards`, `tools/paste-block.sh` | seat helpers (read inbox / ack, list cards, paste block for an off-box seat) |
| `feed/tools/verify_counts.py` | feed vs GitHub count table |
| `tests/` | `run_tests.sh`: python unittest + node --test |

Data (feed JSON, store, logs, pids, preview `www/`) lives in `$MESH_RUN` (default `/srv/live/run`), never in the repo.

## What the feed records

Both repos, full history then incremental, any author: PR open/edit/ready/draft/close/reopen/merge (base + merge SHA),
head pushes, labels, assignees, review requests; reviews (state + author); reviewer verdicts (latest per PR:
PASS/FAIL/HOLD/re-check + SHA); comment and review-comment **metadata only**; issue open/close (state_reason)/reopen/
labels/assignees/milestones; commits on `develop` and `main` (SHA, first line ≤72 chars, author login, time); tags,
releases; check suites/runs, commit statuses (Railway statuses = `deploy*`), workflow runs; lab retests; `/health`
status changes (HTTP code + time only).

Known gaps: Deployments API is 403 for the app (no deployments permission; recorded, not worked around); deleted
comments are not detected; commits whose git author is not linked to a GitHub account have no login.

## Flow directions and fleet state
- Board view: dev.example.com, labtest and app.example.com collapse into one product node, and QaOne and QA two fold into QA. The instance (dev / labtest / prod) and the seat (qa-one / qa-two) become short label tags. Health changes show as Railway → product node.
- `feed/live_flow.py` gives every event a `hops` list that the page animates hop by hop. Writes: actor → GitHub. Checks: GitHub → CI → PR author. Reviewer: Reviewer → GitHub → PR author. Merge: actor → GitHub → Railway → dev.example.com (develop) or app.example.com (main). Deploy: Railway → host. Lab retest: Tester → GitHub. Health: host → product node. Lab runs and calls: tester → instance → tester.
- `feed/live_fleet.py` runs in the same 60 s loop, with no bot turns and no LLM calls. It reads only files the fleet already writes (qa bugs, issues, runs and call logs; labtest gate results and flights; house board files) and emits only on change (`feed/fleet-state.json`: mtimes and hashes keyed by a path hash). Events carry only ids, severity, whitelisted status words, counts, HTTP status classes, time and a short source tag. A seat counts as active if an owned file or a GitHub event is under 15 min old, or (server side) if the server saw it within that window through a wake that landed (2xx), an inbox read or an ack (`via: "inbox"`, `app/presence.mjs` `foldSeatTouch`; in memory, so it rebuilds on the next wake after a restart).

- Live playback follows event ids, not time. Every id the page hasn't seen flashes once, in time order, even when it arrives late (watcher restart, GitHub lag, or a poll during Replay or a rewound view). Events more than 2 min old carry a small "late" tag; added events older than 30 min join the timeline without a flash. merge-queue.md is seeded silently on first read.
- Operator / Coord sources: `feed/host_poll.py` (read-only `railway deployment list`, run by the watchdog every 3 min, sanitized output only) plus ops-app commits from the local git log and labtest runs → Operator. Coord's house files and house commits → Coord. Every source seeds silently on first read.
- `feed/watchdog.sh` (one loop, no cron needed) restarts a missing supervisor or pusher, restarts a feed that has stalled for more than 5 min, and logs every write gap over 150 s to `logs/watchdog.log`.

## Run (box)

```bash
export MESH_RUN=/srv/live/run            # data dir
setsid feed/supervisor.sh >>"$MESH_RUN/logs/fetch_feed.watch.log" 2>&1 < /dev/null &   # needs GITHUB_APP_PRIVATE_KEY in env
setsid feed/push_to_host.sh < /dev/null >/dev/null 2>&1 &                            # needs $MESH_RUN/.push-env
```

Stop the supervisor with `kill -TERM <supervisor pid>` (its trap stops the feed child). Stop the pusher by process
group so its `sleep` child releases the flock.

## Deploy

```bash
LIVE_RAILWAY_PROJECT=burst-live LIVE_RAILWAY_SERVICE=burst-live app/deploy.sh   # copies app/ + assembles collector/, railway up --detach
railway deployment list --service burst-live       # expect SUCCESS
```

**A deploy only works through `app/deploy.sh`.** A Railway build straight from git (any root directory) has no assembled `app/collector/` and the Dockerfile stops with "collector/ is not assembled" (#292). Since #286 the server also refuses to start in production without `APP_PUBLIC_ORIGIN` (the board's public https origin) set as a Railway variable on the service.

Only the `burst-live` service of the `burst-live` project is deployed (`deploy.sh` defaults to the kit names `live-board` / `live-mesh`, so set both variables); no other Railway project is touched.

## Tests

```bash
tests/run_tests.sh               # collector, routing, nudges, board (python); server, page, emitter, builder-cloud (node)
```

## Environment (names only; see `env.example`)

Box: `GITHUB_APP_PRIVATE_KEY` (mint only), `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `MESH_RUN`, `LIVE_HEALTH_URLS`, `LIVE_MERGE_QUEUE`,
`LIVE_REST_FLOOR`, `LIVE_GQL_FLOOR`, `LIVE_BACKFILL_SECONDS`; pusher file `$MESH_RUN/.push-env`: `MESH_URL`,
`INGEST_SECRET`. Railway: see [DEPLOY.md](../burst/DEPLOY.md).

## Security

- The feed only ever gets a **read-only** installation token (metadata, issues, pull_requests, checks, statuses,
  contents, actions = read). The mint script exits non-zero if GitHub returns any non-read permission. There is no
  fallback to any other credential, gh login, or upstream's own App self-mint (disabled in the adapter).
- The private key stays in an unexported variable in the supervisor and goes only to the mint child; the feed
  runs with a scrubbed env (empty `HOME`/`GH_CONFIG_DIR`, no git credentials).
- No bodies of any kind (comments, reviews, issues, PRs, `/health`) are stored; `/health` keeps the status code and time.
- **Credit.** Every event carries `credit`, never blank. Order: a `Seat: <seat>` commit trailer > the actor / sender login > the PR's author > the commit author's login (checks, workflow runs and deploys on that sha) > that commit's `Seat:` trailer > `github` (CI, unmapped bots, rails). Unknown people credit `other` (still kept off the page unless `LIVE_SHOW_UNMAPPED=1`); the server credits any other source's events by sender node. Logins map to seats in the committed `feed/fleet-nodes.json`, which wins over the `LIVE_NODE_MAP` service variable (the variable can only add logins it doesn't name). `forge0x1[bot]` → forge (mill commits through forge's identity; add `Seat: mill` to credit mill), `critic0x[bot]` → critic, `arch10x[bot]` → arch1 (`minime0x[bot]` runs workflows and credits `github` unless a `Seat:` trailer names a seat); `htafolla`, `Blaze0x1` and `Lead` credit the Blaze node. Details: [docs/board.md](docs/board.md#seat-credit).
- Titles and messages can be relabeled to one display name (`LIVE_BRAND`, `LIVE_BRAND_RE`). `LIVE_BRAND` defaults to the `name` in `feed/site.json` (ours: Bifrost), or the template default name when there is no site.json.
- Secrets (`.push-env`, `.railway-secrets`, keys, tokens) and all feed data, state, logs and archives stay out of the
  repo (`.gitignore`). The pusher passes the ingest secret to curl on stdin, never argv or logs.
- `/ingest` requires `Authorization: Bearer $INGEST_SECRET`; the page and feed are behind the `MESH_PASSWORD` login (gated mode, the default).
- **Site mode.** Gated (default for any install): password login, and repos not confirmed public show as `private repo` on the page and feed and `private repo #n` in logs. Public: no password, no masking, real repo names everywhere (page, feed, logs, collector output). Set by `feed/site.json` (`{"public": true, "name": "Bifrost"}`), which `app/deploy.sh` ships to `collector/site.json`; `LIVE_PUBLIC=1|0` overrides. Our burst-live is public (we build in public) via the committed `feed/site.json`; another install deletes that file or sets `"public": false`. `/healthz` reports `mode`. `feed/site.json` also names the site and its services (`feed/live_site.py`): `title`, `node` (the product node every instance folds into), `hosts` (dev / labtest / prod node names) and `services` (`[{name, health}]`, the health URLs the collector polls). Ours: Bifrost, one service `burst-live` (`/healthz`). With no site.json the template defaults stay (`dev.example.com`, `app.example.com` and the template title); `LIVE_SITE_JSON=<path>` reads another file and `LIVE_SITE_JSON=` (empty) forces the template. In public mode `GET /cards` is open too (no key; `?seat=<seat>`, default `coord` = all cards); in gated mode it still needs a seat key (401 without).
