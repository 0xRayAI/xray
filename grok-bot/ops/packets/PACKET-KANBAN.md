# PACKET — Kanban view of the Bifrost wave board

Packet only. No code in this change.

## Core

The root bug is that card metadata is not maintained. The primary path is the last agent or seat that touched the card. On the way out it writes `owner`, `next owner`, `acceptance`, `evidence`, and `blockers`.

That write is one cheap command, the same shape as the other `live-inbox` posts. It does not read GitHub.

`live-inbox <seat> --card <owner/repo#n> --exit --owner <seat|bcId> --next <seat|bcId> --acceptance <line> --evidence <line> --blockers <line>`

One `POST /activity`, the seat's own key, kind `card_exit`. Each value is one line of at most 200 characters. The shared skill `grok-bot/skills/board-prompt/SKILL.md` runs this on every exit, before `live-inbox <seat> --turn end`. `grok-bot/OP-PROC.md` carries the same line. After `REQUEST_CHANGES` the exit writes `owner` and `next owner` as the fixer (`bcId` or seat), not critic, `acceptance` from the linked packet, and `blockers` as `changes requested`.

Backstop only. GitHub events set `status`, `CI`, and `head`. A `review` of `CHANGES_REQUESTED` sets the status beat to `changes requested` and the stage to `fix`, not `Reviewer FAIL`. Cloud-agent start/stop (#472) sets `owner` when the exit step left it empty. These events do not write `next owner`, `acceptance`, `evidence`, or `blockers`.

After `--turn end` or a cloud `finished` with no `--exit` on that card, `field_check` lists each of the five exit fields still empty (`why: missing`). The wave face and the kanban face show the same flag. The check does not fill a field. `status`, `CI`, and `head` are not an exit miss. `— missing —` is not a stored value.

`state` (`live`, `held`, `parked`, `closed`) stays a badge. A drag appends a `board_status` event. The next pass sets `status` from it. A newer GitHub event that moves stage still wins.

## Scope

A kanban of those cards. Columns are the derived stages `open`, `review`, `fix`, `merge`, `retest`, `done` (`STAGES`, also `board.stages`). The owner's "backlog → active" example is a drag from `open` to `review`. Closed cards sit in `done`.

A click on a card, on the wave list and on the kanban, opens one modal with that card's timeline and these fields. This replaces the in-place `.wdetail` expand on both views. Esc closes the modal. A click on the backdrop closes it. The URL carries `?card=` plus the card key (`repo#number`, encoded). Closing clears the param. A finished drag does not open the modal.

Every issue and PR card on both views shows a GitHub link on the card face, visible while the modal is closed. The link is `c.url` when that is an https GitHub issue or pull. Otherwise it is `https://github.com/<repo>/pull/<number>` or `.../issues/<number>` from `kind`. It opens in a new tab (`target=_blank`, `rel=noopener`). A click on the link does not open the modal. A pinned card with no repo and number has no such link. A cloud row shows the same face link when its `pr` is a GitHub pull URL.

A signed-in user can drag a card into another column. Anonymous viewers and the password session can see the board and cannot drag.

### 24h tiles

The six buttons in `#waveStats` stay the filter they are now: `issues_opened_24h`, `issues_closed_24h`, `prs_opened_24h`, `prs_merged_24h`, `prs_closed_unmerged_24h`, and `open_total`, matched by `*_ids`. A Kanban control beside that strip switches the card list to columns of the same filtered set. A tile click while the kanban is up repaints the columns. Empty columns stay visible so they can receive a drop.

## Files to touch

- `house/live/tools/live-inbox` — the `--exit` command above. One activity post, no GitHub read.
- `grok-bot/skills/board-prompt/SKILL.md` — one line on every exit, before `--turn end`.
- `house/live/feed/live_board.py` — apply `card_exit` to the five fields. Events set only `status`, `CI`, `head`, and `owner` when the exit left it empty. Set `field_check` after an exit with no `--exit`.
- `house/live/app/public/index.html` — columns, the shared modal, the face GitHub link, the field-check flag, drag, Kanban control next to the tiles.
- `house/live/app/public/live-config.js` — pure helper that places a card in the derived stage column.
- `house/live/app/server.mjs` — `POST /cards/status` appends the event and does not write `status` on the card. Password `POST /login` and `mesh_session` stay.
- `house/live/docs/board.md` — the exit step, the mechanical backstop, and the `CHANGES_REQUESTED` row.
- `house/live/tests/test_board.py`, `house/live/tests/server-route.test.mjs`, and a new Playwright file under `house/live/tests/`.
- `docs-site/docs/plates/bifrost.md` — the column view, the modal, the face link, and the field check.

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
- `grok-bot/OP-PROC.md` — one line: the last agent or seat runs the `--exit` command before turn end. The beat line's `CHANGES_REQUESTED` parenthetical becomes `changes requested`. A status move is still not a beat that moves stall or nudge.

## Tests

The earlier per-field fixes are tests of this exit step. The event path is only the backstop.

- `house/live/tests/test_board.py`
  - A `card_exit` after `REQUEST_CHANGES` sets `owner` and `next owner` to the fixer `bc-id`, not critic, `acceptance` to the linked packet's acceptance, `evidence` to that line, and `blockers` to `changes requested`. Not `— missing —`.
  - With no `card_exit`, the review still sets the status beat to `changes requested` and the stage to `fix`. `head` and `CI` follow their events. A cloud launch or finished (#472) sets `owner` only while the exit left it empty. `next owner`, `acceptance`, `evidence`, and `blockers` stay empty.
  - After `--turn end` or cloud `finished` with no `--exit`, `field_check` flags those empty exit fields. It is empty when `--exit` ran.
  - A `board_status` event sets `status` only while it is the newest stage move. A newer merge still ends the card.
- `house/live/tests/server-route.test.mjs` — `POST /cards/status` rejects a missing session, a pinned card, and a same-column drop. A signed-in drop appends one event and does not write `status` on the stored card.
- Live Playwright, new file `house/live/tests/kanban-drag.test.mjs`, same shape as `board-panel.test.mjs` (`node:test` + Playwright chromium against the app page). Individually runnable: `node --test house/live/tests/kanban-drag.test.mjs`.
  - Drag a fixture card from `open` to `review` with a real pointer. After the next paint the card is in `review` because status was re-derived. Reload. It stays. The drag does not leave the modal open.
  - Timeline modal, both views: a click opens the dialog with that card's beats and derived fields, and neither card expands `.wdetail` in place. Esc closes and clears `?card=`. A backdrop click closes and clears it. Loading `?card=` opens the same modal.
  - GitHub link, both views: while the modal is closed, each card shows a link to that PR or issue with `target=_blank` and `rel=noopener`. Activating it does not open the modal.
  - Card fields, both views: the fixture's exit shows `changes requested`, owner `bc-id`, next owner that fixer, and the packet acceptance. `field_check` is empty. It does not show `Reviewer FAIL` or critic as owner or next owner. A card whose exit posted no `--exit` shows the missing flag on both views.

## Out of scope

- Editing GitHub state, labels, comments, merge, or close. The board reads those events.
- Seat keys, inbox, wakes, nudges, tripwire, clock.
- The mesh canvas, roster, and activity log.
- Replacing the password gate or public-mode reads.
- Cloud-agent rows as draggable cards.
- Publishing an npm package.
- A second status vocabulary (`backlog`, `active`) beside derived stage.
- Keeping the in-place `.wdetail` expand as a second timeline.
- The check filling a field the exit step left empty.
