# Packet: kanban view of the Bifrost wave board

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

Packet only. No code in this change.

## Packet

- goal: The last seat writes card metadata on the way out, on a card endpoint, inside the wake trap.
- constraints: Packet only. No new activity kind or field. ACT_FIELDS stays locked. Say owner. No personal names.
- path: This file. After packet PASS, one follow-up edits the files named below.
- acceptance: POST /cards/exit stores the five exit fields under an allowlist and an 80-character cap, and the WAKE-ROUTINE trap runs --exit and exits 0 when the wake has no card.
- gates: A and C wait on the follow-up. B and D stay off. A docs-only change does not wait on CI.
- evidence: Review 5588117957. validActivity rejects a kind outside ACT_KINDS. note stays prompt-only.
- next owner: reviewer, for packet PASS.
- escalate: owner, if a wake with no card must still record a marker.

## Core

The root bug is that card metadata is not maintained. The primary path is the last agent or seat that touched the card. On the way out it writes `owner`, `next owner`, `acceptance`, `evidence`, and `blockers`.

That write is `POST /cards/exit`, the same seat key as `POST /cards/start-after`. It is not an activity post. `kind` `card_exit` is not added. `ACT_FIELDS` and `house/burst/activity.schema.json` stay as #471 locked them (`additionalProperties: false`). `note` stays prompt-only.

`live-inbox <seat> --exit [--card <owner/repo#n> --owner <seat> --next <seat> --acceptance <line> --evidence <line> --blockers <line>]`

The body is `{ repo, number, owner, next, acceptance, evidence, blockers }`. Allowlist is those seven keys. Any other key is rejected, including a key whose name matches `body`, `text`, or `message`. Each string is 1 to 80 characters of letters, digits, space, and `._:@#+/-`, the same cap and charset as an activity value (`ACT_VALUE` in `house/burst/activity.mjs`). A value that contains `body`, `text`, or `message` is rejected. `number` is an integer >= 1. A rejected body writes nothing. A stored line is append-only on the volume, beside `cards.json`. `live_board` applies the newest accepted line onto the card.

The #465 trap in `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` is the one close. The trap runs `--exit`, then `--turn end --tag wake`, then `--release`. The board-prompt skill does not run `--exit` and does not add a second `--turn end`. When the wake has no card, `--exit` exits 0 and posts nothing. It is never an error.

After `REQUEST_CHANGES` the exit writes `owner` and `next owner` as the fixer, not critic, `acceptance` from the linked packet, and `blockers` as `changes requested`.

Backstop only. GitHub events set `status`, `CI`, and `head`. A `review` of `CHANGES_REQUESTED` sets the status beat to `changes requested` and the stage to `fix`, not `Reviewer FAIL`. Cloud-agent start/stop (#472) sets `owner` when the exit step left it empty. These events do not write `next owner`, `acceptance`, `evidence`, or `blockers`.

After the trap runs and the card had no accepted exit line, `field_check` lists each of the five exit fields still empty (`why: missing`). The wave face and the kanban face show the same flag. The check does not fill a field. `status`, `CI`, and `head` are not an exit miss. `— missing —` is not a stored value.

`state` (`live`, `held`, `parked`, `closed`) stays a badge. A drag appends a `board_status` event. The next pass sets `status` from it. A newer GitHub event that moves stage still wins.

## Scope

A kanban of those cards. Columns are the stages `open`, `review`, `fix`, `merge`, `retest`, `done` (`STAGES`, also `board.stages`). The owner's "backlog → active" example is a drag from `open` to `review`. Closed cards sit in `done`.

A click on a card, on the wave list and on the kanban, opens one modal with that card's timeline and these fields. This replaces the in-place `.wdetail` expand on both views. Esc closes the modal. A click on the backdrop closes it. The URL carries `?card=` plus the card key (`repo#number`, encoded). Closing clears the param. A finished drag does not open the modal.

Every issue and PR card on both views shows a GitHub link on the card face, visible while the modal is closed. The link is `c.url` when that is an https GitHub issue or pull. Otherwise it is `https://github.com/<repo>/pull/<number>` or `.../issues/<number>` from `kind`. It opens in a new tab (`target=_blank`, `rel=noopener`). A click on the link does not open the modal. A pinned card with no repo and number has no such link. A cloud row shows the same face link when its `pr` is a GitHub pull URL.

A signed-in user can drag a card into another column. Anonymous viewers and the password session can see the board and cannot drag.

### 24h tiles

The six buttons in `#waveStats` stay the filter they are now: `issues_opened_24h`, `issues_closed_24h`, `prs_opened_24h`, `prs_merged_24h`, `prs_closed_unmerged_24h`, and `open_total`, matched by `*_ids`. A Kanban control beside that strip switches the card list to columns of the same filtered set. A tile click while the kanban is up repaints the columns. Empty columns stay visible so they can receive a drop.

## Files to touch

- `house/live/tools/live-inbox` — `--exit` posts `POST /cards/exit`. No card exits 0 and posts nothing. It does not post activity.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — the #465 trap becomes `--exit`, then `--turn end --tag wake`, then `--release`.
- `house/live/app/server.mjs` — `POST /cards/exit` with the allowlist and the 80-character cap. `POST /cards/status` still appends the drag event and does not write `status` on the card. Password `POST /login` and `mesh_session` stay.
- `house/live/feed/live_board.py` — apply the newest accepted exit line to the five fields. Events set only `status`, `CI`, `head`, and `owner` when the exit left it empty. Set `field_check` when the trap ran and no exit line was accepted.
- `house/live/app/public/index.html` — columns, the shared modal, the face GitHub link, the field-check flag, drag, Kanban control next to the tiles.
- `house/live/app/public/live-config.js` — pure helper that places a card in the stage column.
- `house/live/docs/board.md` — the exit endpoint, the mechanical backstop, and the `CHANGES_REQUESTED` row.
- `house/live/tests/test_board.py`, `house/live/tests/server-route.test.mjs`, `house/live/tests/test_wake_env.py`, and a new Playwright file under `house/live/tests/`.
- `docs-site/docs/plates/bifrost.md` — the column view, the modal, the face link, and the field check.
- `grok-bot/skills/board-prompt/SKILL.md` — no `--exit` line and no second `--turn end`.

OAuth modules: see the open question. Do not add an npm dependency with a guessed name.

## Status event

A card is still one GitHub issue or PR, key `repo#number`. A move does not edit GitHub.

Append-only JSONL on the volume, beside `cards.json`:

- `id` — `status:<repo>#<number>:<seq>`
- `t_ct` — America/Chicago offset, same clock as other board times
- `kind` — `board_status`
- `repo`, `number`
- `from_stage`, `to_stage` — both in `open|review|fix|merge|retest|done`
- `by` — the signed-in subject
- beat `what` — `status <from> → <to>`

The collector pass must keep the event, or the next derivation snaps the column back. The event does not set `closed`, `held`, or `parked`, and it does not clear stall, nudge, or the tripwire.

`POST /cards/status` body: `{ repo, number, to_stage }`. Same column is a no-op and writes nothing. Unknown stage, missing card, or a pinned card is rejected. The response includes the new beat.

## Auth flow

The page login today is the mesh password (`POST /login` → `mesh_session`). That cookie does not authorize a drag.

Sign-in for a drag reuses the owner's bedrock xAI OAuth. Searched npm and the bedrock repo: `package.json` there has no xAI OAuth dependency, and `xai-oauth` is not on the npm registry. The working copy is the bedrock server modules `server/xai-oauth.mjs` and `server/xai-oauth-redis.mjs` (device code on the service, not a localhost callback). Refresh is `ensureFreshOAuth`: a timer, plus a check when the access token is inside the headroom. A successful refresh is stored in Redis, the token file, and the Railway env var `XAI_OAUTH_TOKENS` (`variableUpsert`, `skipDeploys`) when that service has `RAILWAY_API_TOKEN` and the project, environment, and service ids. `invalid_grant` quarantines refresh and requires sign-in again.

The board server calls that same refresh before it accepts a drag. The browser talks only to this origin (`connect-src 'self'`). The verification page opens on x.ai. A session cookie separate from `mesh_session` marks the signed-in user. Expiry refresh happens on the Railway service. No token is logged or written into this repo.

Open question: there is no published npm package name to depend on. Confirm whether to copy those two bedrock modules or to publish and name a package. Do not invent a package name.

## Plates and docs

- `docs-site/docs/plates/bifrost.md` — kanban is a column view of status. A card click opens the timeline modal (`?card=`). A drag is an event, then a new status. The GitHub link sits on the card face. The exit step maintains the card. `field_check` flags an exit that skipped it.
- `grok-bot/OP-PROC.md` — one line: the exit write is inside the `WAKE-ROUTINE.md` trap, not a step before turn end. The beat line's `CHANGES_REQUESTED` parenthetical becomes `changes requested`. A status move is still not a beat that moves stall or nudge.

## Tests

The earlier per-field fixes are tests of the exit endpoint. The event path is only the backstop. Each round-2 blocker has a test.

- Packet block. `live_packet.parse` of this file's `## Packet` returns `acceptance` and `next owner`. A card built from that parse has `packet_ok` true and `missing` empty.
- `house/live/tests/server-route.test.mjs` — `POST /cards/exit` rejects an unknown field, a key named `body`, `text`, or `message`, a value longer than 80, and a value outside the activity charset. Each rejection writes nothing and does not call `POST /activity`. An allowlisted body within 80 is stored. `POST /cards/status` still rejects a missing session, a pinned card, and a same-column drop.
- `house/live/tests/test_wake_env.py` — the bash block in `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` traps `--exit`, then `--turn end --tag wake`, then `--release`. `live-inbox <seat> --exit` with no card exits 0 and the test server receives no POST.
- `house/live/tests/test_board.py`
  - An accepted exit line after `REQUEST_CHANGES` sets `owner` and `next owner` to the fixer, not critic, `acceptance` to the linked packet's acceptance, `evidence` to that line, and `blockers` to `changes requested`. Not `— missing —`.
  - With no exit line, the review still sets the status beat to `changes requested` and the stage to `fix`. `head` and `CI` follow their events. A cloud launch or finished (#472) sets `owner` only while the exit left it empty. `next owner`, `acceptance`, `evidence`, and `blockers` stay empty.
  - After the trap with no accepted exit line, `field_check` flags those empty exit fields. It is empty when the exit line was accepted.
  - A `board_status` event sets `status` only while it is the newest stage move. A newer merge still ends the card.
- Live Playwright, new file `house/live/tests/kanban-drag.test.mjs`, same shape as `board-panel.test.mjs` (`node:test` + Playwright chromium against the app page). Individually runnable: `node --test house/live/tests/kanban-drag.test.mjs`.
  - Drag a fixture card from `open` to `review` with a real pointer. After the next paint the card is in `review` because status was re-derived. Reload. It stays. The drag does not leave the modal open.
  - Timeline modal, both views: a click opens the dialog with that card's beats and derived fields, and neither card expands `.wdetail` in place. Esc closes and clears `?card=`. A backdrop click closes and clears it. Loading `?card=` opens the same modal.
  - GitHub link, both views: while the modal is closed, each card shows a link to that PR or issue with `target=_blank` and `rel=noopener`. Activating it does not open the modal.
  - Card fields, both views: the fixture's exit shows `changes requested`, owner the fixer, next owner that fixer, and the packet acceptance. `field_check` is empty. It does not show `Reviewer FAIL` or critic as owner or next owner. A card whose exit posted nothing shows the missing flag on both views.

## Out of scope

- Editing GitHub state, labels, comments, merge, or close. The board reads those events.
- Seat keys, inbox, wakes, nudges, tripwire, clock.
- The mesh canvas, roster, and activity log.
- Replacing the password gate or public-mode reads.
- Cloud-agent rows as draggable cards.
- Publishing an npm package.
- A second status vocabulary (`backlog`, `active`) beside stage.
- Keeping the in-place `.wdetail` expand as a second timeline.
- The check filling a field the exit step left empty.
- Adding a field or a kind to `ACT_FIELDS` or `activity.schema.json`.
