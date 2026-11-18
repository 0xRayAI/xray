# Packet: cloud agents working from start to stop

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

This card is the spec. The follow-up edits the hook, the board, and the collector.

## Packet

- goal: Every Cursor cloud agent on this repo shows on the board as working from the start of its run until the run ends, without a wake prompt and without `live-inbox --turn start`.
- constraints: Packet only. No code in this PR. Fail open and fast. No key and no network means skip. A short timeout. Never block the agent. The key comes from env only and is never printed. No `Closes`.
- path: Critic PASS on this packet, then one follow-up implements the files below.
- acceptance: Launch once while the loop runs. Finished, including error and aborted, posts when it ends and the row leaves running. A second running row keeps the seat mark. The idle clock stays off.
- gates: Critic packet PASS before any code. A and C wait on the follow-up. B and D stay off.
- evidence: Hooks cloud matrix 2026-10-20. src/integrations/cursor/README.md. live-inbox cursor_cloud_id. applyCloudOwners and POST /activity. WORKING_CLOUD_S stays unread.
- next owner: critic, for packet PASS.
- escalate: Blaze, if one shared activity key is the wrong seat for the glyph, or if working must stay on across user follow-ups inside one cloud run.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/record-map.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/suit-wear.md`.

## Scope

Working is a `cloud_agent` line on `POST /activity`, then the board. It does not depend on a seat running `live-inbox --turn`. Today that command posts `launch` only on `--turn start` (`house/live/tools/live-inbox` lines 22–23 and 409–412). Turn end does not post `finished`.

The follow-up adds one fail-open command hook, `.cursor/hooks/cloud-activity.sh`. It posts when `cursor_cloud_id()` would return an id, and otherwise exits 0 with `{}`.

Identity, copied from `cursor_cloud_id()` (`live-inbox` lines 338–343, pattern line 53). Do not shell out to `live-inbox`. That tool exits 2 when `SEAT_KEYS_DIR` is missing, uses a 20s timeout, and can print a server error. `LIVE_CURSORS` is not required. The cursor folder rule is `grok-bot/OP-PROC.md#cursor-folder`.

- `CURSOR_AGENT` is `1`, `true`, or `yes`.
- `CURSOR_CONVERSATION_ID` fullmatches `bc-[A-Za-z0-9_-]{2,40}`.
- Anything else: skip.

Launch body, once per id. The dedupe stamp is a file under `.xray/state/cloud-activity/`, because each hook run is a new process:

```json
{"kind":"cloud_agent","action":"launch","agent":"<bc-id>","t_ct":"<America/Chicago offset>","tag":"<40-hex head>"}
```

`tag` is the git head when `git rev-parse` returns 40 hex characters. Omit it when that read fails. The same `tag` goes on `finished`.

Finished body, on `stop`:

```json
{"kind":"cloud_agent","action":"finished","agent":"<bc-id>","t_ct":"<America/Chicago offset>"}
```

Omit `seat`. `POST /activity` stores the seat from the bearer token (`server.mjs` `activitySeatOfKey`, around line 2927). A body seat that does not match the token is 403. Both actions are already legal (`ACT_KINDS.cloud_agent` is `launch`, `reply`, `finished`, `cancel`). `t_ct` is the same offset form `live-inbox` already sends. No `note`, no free-text field.

`stop` statuses `completed`, `aborted`, and `error` all post `finished`. A failed run stays `finished` on the board. It does not post `cancel` and it does not show as `failed`. The hook returns `{}` and never `followup_message`. `subagentStop` is not this signal. A child ending is not the parent run ending.

That `finished` line is `POST /activity` only. It is not an inbox line and its kind is not `run_end`. `run_end` stays the owner's chat flushing one batch. Before `launch`, the board row for that git head has to be `running`. A stale row is not resumed. A `running` row keeps that same `bc-` id. A second id does not open another running row. The launch stamp is written only after `POST /activity` returns 202, so a timeout or any other status is retried.

Opening the follow-up pull request uses the seat's GitHub App installation token. `LIVE_ACTIVITY_KEY` and `SEAT_KEYS` stay on `POST /activity` only.

After `finished`, the dedupe stamp for that id is cleared, so the next loop in the same conversation can post `launch` again. Between loops the agent is not working.

Board, same follow-up:

- `applyCloudOwners` (`worktrack.mjs` line 552) sets `working` for `state === "running"` and never clears it. `open_agents` is the union with the previous list (line 558). `cloud.working` stays true if the previous flag was true (line 570). Change it so cloud working exists only while a row is `running`. A finished or failed row drops out of `open_agents`. A seat whose `working_via` is `cloud` (or whose `working[seat].via` is `cloud`) loses that mark when it has no running row left. A non-cloud mark stays. A second running row for that seat keeps the mark.
- `spareTurnMark` (`server.mjs` line 2588) keeps every `via === "cloud"` mark. `refreshWorking` (line 2700) reruns stored activity and does not call `applyCloudOwners`, so a finished agent stays working on that path. The clear has to run there too. `mergedHeader` already calls `applyCloudOwners` last (line 1426), after `applyTurnRelease` (line 1425).
- `boardStateOfAction` already maps `finished` to `finished` and `launch` to `running` (line 396). Latest line wins. No new action.

Collector clock:

- Delete `WORKING_CLOUD_S` and the `LIVE_CLOUD_IDLE_S` read (`live_fleet.py` line 48). Nothing in `working_state` or `cloud_state` reads it. Open launch/reply already uses `CLOUD_STALE_S` (6h, line 50, used at lines 1038, 1183, and 1211).
- Do not put the 20-minute clock back. A run longer than 20 minutes must stay working until `finished` or until the 6h stale mark. The 6h mark stays only for a lost `stop`. `finished` and `cancel` already drop the agent in `_cloud_line` (line 723) and `cloud_state` (line 1034). Keep that.

Hooks registered beside the five shipped events, each with `"timeout": 2`, no `failClosed`:

| Event | Why it is in the file |
| --- | --- |
| `sessionStart` | Fires at composer start on the desktop, and on self-hosted pool claim. Posts `launch`. |
| `postToolUse` | Fires on managed cloud after the first successful tool. That is the launch path `sessionStart` cannot cover. Posts `launch` only when this id has not posted since the last stop. |
| `stop` | Supported on managed cloud when the agent loop ends. Posts `finished`. |

`postToolUse` stdout `{}` is valid (context fields are optional). The script returns before any network when the dedupe stamp is already set, so later tools do not wait on the board.

Wear already keeps events outside the five shipped names (`mergeCloudSafeCursorHooks` at `scripts/node/install-bridges.cjs` line 1155, `mergeInstalledCursorHooks` at line 1868). The follow-up does not change wear unless the test below fails.

## Files

The follow-up edits these:

- `.cursor/hooks.json` — add `sessionStart`, `postToolUse`, and `stop`, command `.cursor/hooks/cloud-activity.sh`, `timeout` 2, no `failClosed`. Leave the five shipped commands as they are. Do not attach this script to `preToolUse`, `beforeShellExecution`, `beforeReadFile`, or `beforeSubmitPrompt`.
- `.cursor/hooks/cloud-activity.sh` — new. Relative path. No `XRAY_AI_PATH=` prefix. Reads stdin and discards it. Posts or skips. Always exits 0. Stdout is `{}`.
- `house/live/app/worktrack.mjs` — `applyCloudOwners` clears cloud working when no running row remains.
- `house/live/app/server.mjs` — `refreshWorking` runs that same clear. `spareTurnMark` does not preserve a cloud mark after the row is finished.
- `house/live/feed/live_fleet.py` — remove `WORKING_CLOUD_S` / `LIVE_CLOUD_IDLE_S`.
- `src/integrations/cursor/README.md` — one line that managed cloud launch is `postToolUse`, and `stop` posts `finished`. `sessionStart` stays registered and is not the managed-cloud start.
- Tests listed below.

No new activity route. No key file. No change to `live-inbox` turn end.

## Tests

Hook script, with a stub HTTP server or a blocked address. No live board and no real key.

- `CURSOR_AGENT` unset, or id not a `bc-` id: exit 0, stdout `{}`, no request.
- `LIVE_URL` or `LIVE_ACTIVITY_KEY` unset: exit 0, stdout `{}`, no request.
- Launch posts exactly `kind`, `action` `launch`, `agent`, `t_ct`. No `seat`. A second `postToolUse` for the same id does not post again.
- `stop` posts `action` `finished` for `completed`, `aborted`, and `error`, then a later `postToolUse` may post `launch` again. Stdout has no `followup_message`.
- HTTP 401, 422, 429, connection refused, and a timeout under 2s: exit 0, stdout `{}`. The process does not exit 2.
- The key and the `Authorization` value are absent from stdout and stderr. A test key planted in the env must not appear.

Board (`house/live/tests/cloud-board.test.mjs`):

- One running row sets that seat `working` with via `cloud`.
- A later `finished` for that id clears the seat's cloud working mark and removes the id from `open_agents`.
- A second running id for the same seat keeps the mark after the first finishes.
- A github (non-cloud) working mark on another seat stays.
- `refreshWorking` after a finished line does not bring the cloud mark back.

Collector (`house/live/tests/test_flow_fleet.py`):

- Drop the assertion `WORKING_CLOUD_S == 20 * 60` (line 575).
- Keep the behavior already pinned: an open launch is still `via: cloud` past 20 minutes (`now + 61 * 60` in the spinner test) and past the 30-minute subagent window, until `finished` or the 6h stale mark.
- `finished` still removes the launching seat from `working` (`test_cloud_agent_keeps_its_seat_working`).

Wear: a `hooks.json` that already has `sessionStart`, `postToolUse`, and `stop` still has those three after `mergeCloudSafeCursorHooks` and `mergeInstalledCursorHooks`.

## Risks

### Hook event names Cursor cloud supports

Source: https://cursor.com/docs/hooks.md, cloud agent support, read 2026-10-20. The same limit is already in `src/integrations/cursor/README.md` line 3 and `src/integrations/cursor/hooks/cursor-hook-utils.js` line 4.

Managed cloud runs command hooks only. The supported list includes `stop`, `postToolUse`, `afterFileEdit`, `preToolUse`, `beforeShellExecution`, `beforeReadFile`, `preCompact`, `subagentStart`, and `subagentStop`.

`sessionStart` is in the "not available" table. Cursor defers it while a cloud agent can still start in a read-only environment. A cloud `sessionStart` would fire after the first write, not at true session start, so they do not run it. `sessionEnd` is also unavailable. It is an IDE session boundary, not a cloud chat.

Self-hosted pools and My Machines do fire `sessionStart` and `sessionEnd` when a session claims the worker and when that claim is released. Registering `sessionStart` covers those hosts and the desktop. It does not mark managed cloud.

Hooks do not run during the read-only exploratory turns at the start of some cloud runs. They start once the agent has a writable environment. Working on the board begins at the first `postToolUse` after that, not at VM claim.

`stop` is supported. It runs when the agent loop ends, with `status` `completed`, `aborted`, or `error`, and `loop_count`. Returning `followup_message` submits another user message (default loop limit 5). This hook must not do that.

Exit code 2 blocks the action even when `failClosed` is false. Permission hooks (`preToolUse`, `beforeShellExecution`, `beforeReadFile`) treat invalid JSON or a missing permission as a block. `beforeSubmitPrompt` expects `continue`. This poster stays off those events. `postToolUse`, `sessionStart`, and `stop` accept `{}`.

The hooks doc env table lists `CURSOR_PROJECT_DIR`, `CURSOR_VERSION`, and others. It does not list `CURSOR_AGENT` or `CURSOR_CONVERSATION_ID`. `live-inbox` already reads both in the cloud VM. The follow-up still checks that the hook process inherits them. If it does not, the script skips and the goal is unmet. Do not parse the key out of stdin. Stdin on `postToolUse` is the tool payload, not the identity.

`ACT_AGENT` accepts an id of at most 41 characters (`server.mjs` line 2479). A current `bc-` plus uuid is 39 and matches both that and `cursor_cloud_id()`. A longer id fails validation. The hook treats 422 as a skip.

### Secret handling

`POST /activity` wants `Authorization: Bearer <seat key>` (`server.mjs` line 2917). The seat on the stored line is the key's seat. Builder may use a `ghs_` installation token. Every other seat matches `SEAT_KEY_HASH`.

The hook reads `LIVE_ACTIVITY_KEY` and `LIVE_URL` from the environment only. It does not read `SEAT_KEYS_DIR`, a key file, argv, or stdin. It does not echo the key, the header, or `curl -v`. Curl stderr is discarded. A skip line may say `skipped` and the reason (`no key`, `no network`). It must not include the value.

Unset key, unset URL, 401, 429, 5xx, DNS failure, and timeout: exit 0, stdout `{}`, hook `timeout` 2, client max time 1 second, under that hook limit. `failClosed` stays off. Rate limit is 60 posts a minute per seat, which is why the dedupe stamp exists.

The key is injected as a Cursor cloud environment secret. It is not committed. This packet does not name a seat and does not contain a key. One key lights one seat's glyph for every cloud agent that posts with it. Each `bc-` id is still its own board row, running then finished. Per-seat glyphs need a different injection later. That later step still cannot print the key, and it still cannot read a key file from this hook.

`live-inbox` keeps its own file-based seat key. This hook does not call it and does not change it.
