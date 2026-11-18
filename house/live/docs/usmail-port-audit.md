# usmail Bifrost port audit

Audit date: 2026-10-15. Reader: GitHub API via `gh` as the `cursor` installation token (`gh auth status`). Read-only. This file is the gap list for P13.

## Access

`usmail-ai/live-mesh` and `usmail-ai/live-wire` are not readable from this token. `GET /repos/usmail-ai/live-mesh` and `GET /repos/usmail-ai/live-wire` both return HTTP 404. The same 404 comes back for `USMailAI/`, `usmail/`, `htafolla/`, `0xRayAI/`, and `broadstrokeinc/` plus `live-mesh`, `live-wire`, `burst`, `burst-live`, `bifrost`, and `live`. GitHub uses 404 for a missing repo and for a private repo the token cannot see, so this audit cannot tell those apart.

`GET /orgs/usmail-ai/repos?type=all` returns five public repositories and no others: `usmail-ai-feedback`, `xray`, `usmail-cursor-plugin`, `plugins`, `template-microsite`. None of them is live-mesh or live-wire. `usmail-ai/xray` `house/` on `main` contains `live-mesh/` (the mesh renderer: `fetch_feed.py`, `tripwire_push.py`) and does not contain `house/live/` or a live-wire tree.

Code search for `cloud-agents` under `user:usmail-ai` returned HTTP 429. It was not retried into a second inventory.

Because the private live-mesh and live-wire pull requests cannot be listed, this audit cannot confirm from usmail source that their board draws cloud agents as rows. The public usmail pull requests below treat cloud agents as working lights and activity lines, not as board rows. xray `house/live` matched that until this change: a Work-panel track item and a `CloudAgents` mesh node, with webhook `ERROR` stored as `finished`. First-class board rows are implemented here from those two feeds (Cursor webhook `agents.jsonl`, and `POST /activity` `kind: cloud_agent`, the same line `fleet/cloud-agents.jsonl` already uses).

`0xRayAI/xray` #320 says its source series is `usmail-ai/live-mesh#42`. That pull request cannot be opened. #320 itself is on xray and is listed below as the known port of that one private pull request.

## Public usmail-ai/xray pull requests

Every pull request on the public `usmail-ai/xray` repository as of this audit. "In xray" means the feature is in `house/live` (or the named file) on this tree. Line numbers are the file after this change only where this change edited the file; otherwise they are the current tree.

| PR | Title | Merged | Feature | In xray house/live |
|---|---|---|---|---|
| 1 | Burst: live signals the merged kit still lacked | no (open) | Delta cursors, honest LIVE pill, wall-clock re-mint, loud 401, lab-run and check working lights, installation-token checks, watcher playbook. Folded into #9/#10 | Present as the live page and feed. LIVE pill and working lights: `app/public/index.html` ambient and seat chips. Not re-listed as a separate gap |
| 2 | feat(grok-bot): house cadence starters for 0.1.10 | no (open) | `house init` copies watcher and fleet starters; `--migrate` appends `## Cadence`; doctor warns on a stale watcher log | grok-bot house kit, not a Bifrost board feature. Follow-up if the 0.1.10 cadence block still drifts. Not ported in this change |
| 3 | Burst: watchers log only real work | no (open) | An idle watcher tick writes nothing. Live work includes a running cloud agent or subagent | Watcher playbook lives under `house/burst` and grok-bot. The board side (a running cloud agent keeps the seat working) is present: `feed/live_fleet.py` cloud window, `app/server.mjs` `applyTrackWorking`. The watcher "write nothing when idle" rule is a follow-up, not a board row |
| 4 | live page: ambient replay loop (dimmed, visual only) | no (open) | Every 10s, replay the last hour dimmed. `?spectrum=0` turns it off. Visual only | Present. Replay loop checkbox and dimmed ambient clock: `app/public/index.html` (`ambientOn`, `Replay loop`). The window is the last hour. The off switch is `?replay=0`, not `?spectrum=0`. Same feature, renamed. Not a gap |
| 5 | Burst: route live events to per-seat inboxes | no (open) | One inbox line per event; critic gets pull requests | Present. Seat inboxes and routing: `app/server.mjs` inbox routes, `feed/routing/`. Documented in `docs/inbox.md` |
| 6 | Burst: live waveboard split on the feed page | no (open) | Cards on the board, packet and last five beats, 60 min stall, closed cards linger, amber missing packet | Present. Wave board: `app/public/index.html` `renderWave`. Stall and packet badge: `docs/board.md` |
| 7 | Burst-only: working-status logic, activity schemas and live board working lights | no (open) | Working lights, activity and cloud-agent schemas. Burst-only subset of #1 and #3 | Present as lights and schemas (`house/burst/activity.schema.json`, `feed/live_fleet.py`). Cloud agents were not board rows. That gap is this change |
| 8 | Burst-only: Spectrum ambient replay loop on the live page | no (open) | Copy of #4 without the waveboard | Same as #4. Present |
| 9 | live: 0xray install (seat inboxes, cards, nudges, waveboard) + deploy guide | no (closed) | Supersedes #1–#8. Generic `house/live` install | Superseded by #10 and by the install that landed on `0xRayAI/xray`. Present as `house/live/` |
| 10 | live: 0xray install (seat inboxes, cards, nudges) + deploy guide | no (open) | Squash of the install. Password page, `/live-events.json?since=`, inboxes, cards, nudges | Present. `app/server.mjs` login, `since`, cards, nudges. `docs/board.md`, `SETUP.md` |
| 11 | Fix the Bifrost install drift from the 0xRay install report | no (closed) | Drift items from the 0xRay install report. Replaced by #12 | Closed unmerged. The drift fix that merged is #12 |
| 12 | Fix the Bifrost install drift (on top of #258) | yes | Box board wins while fresh (`BOARD_BOX_STALE_S`); fleet-only collector env; deploy file list | Present. `tests/board-source.test.mjs`, `app/server.mjs` board source. `docs/board.md` describes which board wins |

No public usmail-ai/xray pull request describes a cloud agent as a board row with `bcId`, owning seat, linked card, `running`/`finished`/`failed`, and last update.

## Pull requests authored by USMailAI on 0xRayAI/xray

`search/issues?q=repo:0xRayAI/xray+author:USMailAI+is:pr` returns four pull requests.

| PR | Title | State | Feature | In xray |
|---|---|---|---|---|
| 3 | feat: 4.0.0 suit temperament + live Grok/Repertoire | closed | Suit temperament and Repertoire. Not the Bifrost board | Present in the suit (`xray/features.json`, Repertoire wiring). Out of this board audit |
| 249 | docs(grok-bot): op-proc cadence — seat-owned watchers, stall sweep, merge queue, live mesh | closed | OP-PROC cadence docs | Docs. A later open #251 carries a similar title. Not a missing board feature |
| 250 | house(op-proc): promote exact-head gate, issue close on retest, seat-owned watchers to core | closed | OP-PROC promotions | `grok-bot/OP-PROC.md`. Not a board row |
| 256 | live: 0xray install (seat inboxes, cards, nudges) + deploy guide | closed | The 0xray install of the live board. Same story as usmail-ai/xray #10 | Present as `house/live/`. Superseded on the way to current `main` by later Bifrost pull requests (#279, #317, #320, #342, #363) |

## Known private series, one cited pull request

| Source | Port | Feature | In xray |
|---|---|---|---|
| usmail-ai/live-mesh #42 (not readable) | 0xRayAI/xray #320, merged | Pending deploys close on error, failure, and inactive. Railway poll when `RAILWAY_TOKEN` is set. `/healthz` fails on `feed_quiet` or `cards_behind`. Append-only `activity.jsonl`. ARCH1 launch off unless `ARCH1_LAUNCH_ENABLED=1`. Deploy quickstart | Present. `app/server.mjs` health and activity. `app/arch1-launch.mjs`. `house/burst/DEPLOY.md`. #320 body lists these and says board history (#317) was already on the base |

Every other live-mesh and live-wire pull request is **unlisted**. This token cannot see them. Do not treat the table above as a complete private-series inventory.

## Cloud agents, before this change

| Behavior | Where it was | Board row? |
|---|---|---|
| `fleet/cloud-agents.jsonl` and activity `kind: cloud_agent` (`launch`, `reply`, `finished`, `cancel`) drive the mesh node and the seat working light | `feed/live_fleet.py` `scan_cloud`, `_cloud_line` | No. Pulse only |
| Cursor webhook appends `agents.jsonl`. The Work panel shows one track item. `ERROR` / `FAILED` / `CANCELLED` were stored as `finished` and labeled `closed` | `app/worktrack.mjs` `statusOf`, `agentItems`; `app/server.mjs` `POST /cursor/webhook` | No. Work panel, and failure was indistinguishable from finish |
| `CloudAgents` header chip is active while `open_agents` is non-empty | `app/public/index.html` seat chip; `app/server.mjs` `mergeFleet` | No |

That board-row gap is **MISSING** before this change and is the change: `cloud_agents` on the live feed, drawn in the `cloud agents` group, state `running` / `finished` / `failed`.

## Follow-ups (larger than this change, or blocked on access)

1. Re-run this audit when a token can read `usmail-ai/live-mesh` and `usmail-ai/live-wire`. List every pull request number, title, and feature, and mark each present or missing against `house/live`.
2. usmail-ai/xray #2 house cadence starters (`house init --migrate`, Cadence doctor warn). Confirm against current grok-bot before porting.
3. usmail-ai/xray #3 watcher idle ticks write nothing, including desktop and browser `computerUse` runs. The board already treats a running cloud agent as working. The watcher writer is a separate job.
4. Issue `0xRayAI/xray` #285 (production notes aimed at `house/live-mesh`) still asks for a hard publish allowlist on `tripwire_push.py` (refuse a feed that is not marked public) and a test that a real push records `feed_push`. `house/live-mesh/tripwire_push.py` already writes `feed_push`. The allowlist is not in this change.
5. Issue #323 asks for a full usmail contribution ledger (every `bifrost-port` commit, #256, #249, open #251). This file is the pull-request gap list, not that commit ledger.
