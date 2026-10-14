# Live board setup

## Routing is required

Every seat needs a route: a seat no rule routes to gets no inbox lines, so its wake never fires. Before the first deploy, run `house/live/tools/bifrost-init` once. It asks for the seats and their wake URLs, writes `house/live/feed/routing/inbox-roles.json` and `feed/routing/seat-webhooks.json` (placeholders and env names only, never real URLs or keys), and fails if any seat has no route. Put the real URLs in the `SEAT_WEBHOOKS` host variable and each key in `WAKE_KEY_<SEAT>`. `bifrost-init --check` re-validates after hand edits; CI runs it via `house/live/tests/run_tests.sh`.

**Bifrost does not work without routing.** No route means no inbox line, no wake, no nudge and no tripwire for that seat.

**The routing map.** `inbox-roles.json` `routing` lists each seat once: its real GitHub login (App seats as their bot login, e.g. `forge0x1[bot]`, `arch10x[bot]`; people by handle; `null` when the seat has no GitHub login and is reached only in the inner loop) and its nicknames as `aliases` on the same entry. `bifrost-init --logins forge=forge0x1[bot],arch1=arch10x[bot]` writes it. `bifrost-init --check` asks the GitHub users API about every non-null login (optional `GITHUB_TOKEN`, never printed) and fails on a 404, naming the seat; a rate limit or network error is a warning. Check a login by hand with `curl https://api.github.com/users/<login>` before you add it, never from memory. Each route must @-mention the seat's login (`@forge0x1`), not only its nickname; `bifrost-init --check --table` fails a nickname-only route and prints seat, mention, login, OK.

**Edited comments.** The collector re-reads a comment when its `updated_at` moves and keeps its id. A mention added on edit becomes one `comment_edit` line (`<comment id>:edit:<handle>`) for the newly mentioned seat only, once; seats already mentioned and comment watch get nothing new.

**Login audit.** At startup and every `BIFROST_ROUTING_AUDIT_S` (default 3600) burst-live resolves every map login on GitHub with the existing `GITHUB_READ_TOKEN` (cached `BIFROST_LOGIN_TTL_S`, default 21600; on a rate limit it pauses until the reset and answers from cache). A login GitHub does not know is refused: `/routing` shows it `missing`, `/healthz` `routing` is `fail`, and the CoS gets a board nudge (`login not on GitHub`). No token or no answer is `unverified`, flagged, never refused. `GET /routing` serves the map read-only: look a login up there before you @-mention anyone, never from memory. After a deploy, `house/live/tools/bifrost-check --target <host>` fails any login that does not resolve (runbook: `grok-bot/runbooks/CRITIC.md`).

## Pieces
- **Railway server** (`app/server.mjs`, service `burst-live`): the page, the merged feed, and the **source of truth** for
  seat inboxes, cards and nudges (volume `/data/live/`: `inbox/<seat>.jsonl`, `cards.json`, `nudges.jsonl`).
- **Host collector** (`LIVE_MODE=github`): builds the board from GitHub events so a host-only install has cards. The page uses that board when the box board is absent or older than `BOARD_BOX_STALE_S`.
- **Box feed pass + pusher** (`feed/push_to_host.sh`, released with `feed/release.sh`): pushes box events
  (`POST /ingest[/delta]`). A box `board` wins while the box pushed within `BOARD_BOX_STALE_S` (default 900 s). Env: `LIVE_HOME`, `MESH_RUN`, `FEED`.
  Locally it keeps only a ring buffer (`$MESH_RUN/feed/inbox-spool/<seat>.jsonl`, 300 lines a seat)
  for when the server can't be reached.

## Seat credit and avatars

Logins map to seats in the committed `feed/fleet-nodes.json`, which beats the `LIVE_NODE_MAP` variable (the variable only adds logins). Full fallback order, the `Seat:` commit trailer and the Blaze node: [docs/board.md](docs/board.md#seat-credit). Avatars and how to add one: [docs/board.md](docs/board.md#avatars).

## Fleet seats and unmapped logins (server env)

`LIVE_NODE_MAP` maps your fleet's GitHub logins to page seats (JSON object, or a path to a JSON file; non-string values are ignored). Logins not in the map are hidden by default everywhere: feed, board (including the inbox event cache), packets, upstream items. `LIVE_SHOW_UNMAPPED=1` shows them as `Others` instead, which publishes those logins and titles. The server passes both to the collector.

**Private repos (D18, #267).** With `COLLECTOR_ORG` set, each repo's `private` flag comes from `GET /repos/<org>/<repo>`. A private repo is still collected: inboxes (`/ingest/events`) and `/cards` behind seat keys keep its real name and titles. In gated mode the login page and `/live-events.json` show it only as `private repo`, with no title, label or link; in public mode (`feed/site.json` `"public": true`) nothing is masked and the real name shows. The login map (`LIVE_NODE_MAP`, `LIVE_SHOW_UNMAPPED=1`) must never be used to bring private titles back onto the page. Public `/healthz` carries a repo count and two times, never repo names. It also carries `data_age`, `card_age`, `box_age`, `feed_quiet`, `board` (`building`, `empty`, or `live`), and `origin`. `ok` is false when the collector feed file is quiet or when cards lag open-card data. `data_age` and `box_age` do not change `ok`. HTTP is 503 when `ok` is false.

## Seat auth
| Seat | Credential |
|---|---|
| builder | its builder-app installation token (`ghs_…`, verified with GitHub; unchanged) |
| forge, critic, mill, blinky, herald, nibbler, sound, magnet | a per-seat key: `Authorization: Bearer <key>`. Our 9 seats (with arch1 below); routes: [route table](docs/inbox.md#server-routing) |

Keys live only on the box: `$SEAT_KEYS_DIR/<seat>.key` (default `~/.burst/seat-keys`; dir 0700, files 0600). The
server holds only their SHA-256 hashes, in the Railway variable `SEAT_KEYS` (JSON `{seat: sha256hex}`).
Rotate: `feed/seat_keys.sh mint` (writes new keys, never prints them) then `feed/seat_keys.sh publish` (sets
`SEAT_KEYS` on Railway) and deploy with `app/deploy.sh`. Seat list: `SEAT_KEYS_SEATS` or `SEATS_JSON`. Service and deploy dir: `LIVE_RAILWAY_SERVICE`, `MESH_APP_DEPLOY_DIR`.

| builder-cloud | a per-seat key (file `seat-keys/builder-cloud`, no `.key` suffix), seat display `Builder-cloud`: the cloud Builder. `POST /activity` (as `Builder-cloud`, own board node), `GET /inbox/builder-cloud` = every Builder line (merge-ready, Reviewer PASS) mirrored server-side + nudges to Builder (`type: nudge`), `GET /cards?seat=builder-cloud` = Builder's cards. Helper: `tools/builder-cloud-setup.sh` (key from env `LIVE_KEY`) |
| arch1 | a per-seat key (`seat-keys/arch1.key`): the Arch1 deep-review seat. `GET /inbox/arch1` = deep-review asks and Gate B runs (routed by needles in `feed/routing/inbox-roles.json` extra_seats); read with `tools/live-inbox arch1`, ack with `--ack <id|all>`. Arch1 receives its key file from Blaze in a 1:1 chat, never in a room or repo |
| forge | a per-seat key (`seat-keys/forge.key`). `GET /inbox/forge` = merge / deploy / Gate B run asks (`@forge`, `merge ask`, `deploy ask`, `run gate b`) and merges into main or bifrost/main; read with `tools/live-inbox forge`. Key delivered 1:1 by Blaze, never in room/repo |
| critic | a per-seat key (`seat-keys/critic.key`). `GET /inbox/critic` = review requests and Light / Strict / re-Light asks (`@critic`, `light ask`, `strict ask`, `re-light`); read with `tools/live-inbox critic`. Key delivered 1:1 by Blaze, never in room/repo |
| mill | a per-seat key (`seat-keys/mill.key`). `GET /inbox/mill` = implement / rebase asks (`@mill`, `implement ask`, `rebase ask`); read with `tools/live-inbox mill`. Key delivered 1:1 by Blaze, never in room/repo |
| blinky | a per-seat key (`seat-keys/blinky.key`). `GET /inbox/blinky` = CoS / board asks (`@blinky`); read with `tools/live-inbox blinky`. Key delivered 1:1 by Blaze, never in room/repo |
| herald | a per-seat key (`seat-keys/herald.key`). `GET /inbox/herald` = Dist asks (`@herald`); read with `tools/live-inbox herald`. Key delivered 1:1 by Blaze, never in room/repo |
| nibbler | a per-seat key (`seat-keys/nibbler.key`). `GET /inbox/nibbler` = asks to `@nibbler`; read with `tools/live-inbox nibbler`. Key delivered 1:1 by Blaze, never in room/repo |
| sound | a per-seat key (`seat-keys/sound.key`). `GET /inbox/sound` = asks to `@sound`; read with `tools/live-inbox sound`. Key delivered 1:1 by Blaze, never in room/repo |
| magnet | a per-seat key (`seat-keys/magnet.key`). `GET /inbox/magnet` = hangar / listing asks (`@magnet`); read with `tools/live-inbox magnet`. Key delivered 1:1 by Blaze, never in room/repo |
| assistant | a per-seat key, **write-only**: `POST /emit` only (no inbox / cards). Used by the sample MCP server (env `LIVE_KEY`) |

Seat inbox wakes (`SEAT_WEBHOOKS`): see [Seat wake URLs and webhooks](docs/inbox.md#seat-wake-urls-and-webhooks).

## Arch1 local inbox

- **Key:** `~/.burst/seat-keys/arch1.key` (dir 700, file 600). Blaze delivers it 1:1, never in a room or repo.
- **Script:** `~/.burst/bin/live-inbox` (Python 3), fetched from raw `bifrost/main` `house/live/tools/live-inbox`.
- **Env:** none needed. Defaults are `LIVE_URL=https://burst-live-production.up.railway.app`, `SEAT_KEYS_DIR=~/.burst/seat-keys`, `LIVE_CURSORS=~/.burst/cursors`; set them only to override.
- **Commands:** `live-inbox arch1` reads and never acks (`--peek` is the same); `live-inbox arch1 --ack <id>`; `live-inbox arch1 --ack all`.
- **Flow:** forge posts a Gate B / deep-review ask via `POST /inbox` (fields: [docs/inbox.md](docs/inbox.md); no `body`/`text`/`message`, the ask goes in `title`) → Arch1 reads it, runs it locally in Grok CLI on Blaze's machine, posts the receipt on the PR (envs, exit codes, tarball sha), then acks. If `live-inbox arch1` prints lines, those lines are the current job: a non-empty read is the work. The 60-second script never acks and never starts the work; the Grok turn that sees the lines does. No webhook yet, so Arch1 polls; PR comments are the fallback. The host's internal monitor runs `bin/live-inbox-watch` with `LIVE_WATCH_DELTA=1`, so a printed line is the session event. The launchd plist only fills a log and does not open the chat. Full setup, polling timer, ack and round-trip test: [docs/inbox.md](docs/inbox.md#arch1--cli-seats-grok-cli).

## Assistant / emitter node
The sample MCP server (example-org/mcp, env `LIVE_URL` + `LIVE_KEY`) posts one event per tool call and
per OAuth sign-in to `POST /emit`: `{kind: tool|oauth, tool, t, ok, client: assistant|other, latency_ms}`. Any other field
is refused (422), so no customer data (addresses, content, emails, user ids) can land here. The `Assistant / emitter` node is
**working** until `EMITTER_WORKING_S` (default 120 s) after the last event, active for the fleet window, then idle.

## Endpoints
| Method + path | Auth | Returns |
|---|---|---|
| `GET /inbox/<seat>?since=<id>` | that seat | `{seat, lines}` after `<id>` (all when omitted / unknown) |
| `GET /cards?seat=<seat>` | that seat, or blinky / forge | cards the seat owns or is next owner on (`all`, blinky or forge: all), with nudge beats |
| `POST /inbox/<seat>/ack` | that seat | `{id}` / `{upto}` / `{all: true}`: hides those lines for the seat. `GET /inbox/<seat>` returns OPEN lines only (not acked, card not past the seat's step: closed, or for critic a verdict at head); `?all=1` = history |
| `GET /routing` | any seat key or session (open in public mode) | `{ok, seats: [{seat, login, aliases, status}]}`: the routing map, read-only; status `ok`, `missing` (refused), `unverified`, `no_login`. Never keys or webhook URLs |
| `GET /nudges?since=<id>` | forge | `{nudges}` in creation order |
| `POST /inbox` | `X-Live-Ingest` (box pusher) | stores seat lines (deduped by id). A batch that stores nothing is 400 with `rejected` refs. `replace: true` clears only after a line validates |
| `POST /ingest/source` | `X-Live-Ingest` | normalized source events (`{source, events}`). Unknown fields are refused |
| `GET/POST /inbox/builder` | as before | kept for Builder's existing reader |

## Nudge timing (server env)
`NUDGE_L1_S` (default 3600), `NUDGE_L2_S` (default 1800), `NUDGE_L3_S` (default 7200), `HELD_MAX_S` (default 72h).
`NO_NUDGE_REPOS` unset means no repo is excluded. `GITHUB_HOLD_LABEL` default `on-hold`. `JIRA_HOLD_STATUS` default `On Hold`.
`SEAT_PRESENCE` default `{"builder-cloud":"builder"}`; a value may be a seat name or an array of seat names.
`UPSTREAM_REPO` (or `XRAY_REPO`) unset means the upstream watcher is off. `UPSTREAM_PINNED` and `XRAY_OURS` default empty.

## Retired local files
`fleet/inbox/*.jsonl` were archived to `logs/inbox-retired-<date>/`; `house/BOARD.md` is frozen with a header
pointing to the live board. Re-enable local writing only for debugging with `LIVE_BOARD_LOCAL=1`.

## Box helpers (any box bot)
- `tools/live-inbox <seat> [--peek]`: open inbox lines as JSON lines. A read never acks (`--peek` is the same as a plain read). `live-inbox <seat> --ack <id|all>` or `--pop <id|all>` is the receipt; the cursor still advances to the newest line seen. Cursor in
  `$LIVE_CURSORS/<seat>.txt` (advanced after a successful read). The default is `~/.burst/cursors` (override with `LIVE_CURSORS`).
- `tools/live-cards <seat>`: the seat's cards as JSON lines (with nudge beats).
- **Folders on our box:** the defaults are `~/.burst/seat-keys` and `~/.burst/cursors`; our box seats set `SEAT_KEYS_DIR` and `LIVE_CURSORS` to folders under `/home/box/burst-run` in their wake routines (variable names only; key values never go in a routine). See [docs/inbox.md](docs/inbox.md#key-folder-on-our-box).
- **Activity:** a wake that lands, a read and an ack each mark the seat active ([docs/board.md](docs/board.md#what-makes-a-seat-active)). Desktop-only work does not report yet (lap 3: heartbeat from `live-inbox`).
Copies live in `tools/`. Builder (on its own machine) uses `tools/paste-block.sh` (`live_act`, `live_inbox`; token minted
in-process by the builder-app wrapper's `mint_token.token()`, never printed).

## Silent seats
A bot seat with no activity / prompt / beat for > 2 h (`SILENT_S`, default 7200) while it owns live work (owner, next
owner or retest owner of a live card, or an open nudge) shows amber `silent 2h` on its node and chip, and blinky (CoS) gets one
nudge (`kind: silent`, `about: <seat>`) per quiet stretch. Humans (Lead) are never flagged.

## Fleet setup

Every file a new fleet edits to map its seats: [docs/fleet-setup.md](docs/fleet-setup.md).
