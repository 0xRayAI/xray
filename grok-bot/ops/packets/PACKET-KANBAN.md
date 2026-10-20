# PACKET — Kanban view of the Bifrost wave board

Packet only. No code in this change.

## Scope

A kanban of the cards the wave board already serves. `house/live/feed/live_board.py` builds them, the server puts them on `feed.board`, and `house/live/app/public/index.html` draws them. Columns are the existing stages `open`, `review`, `fix`, `merge`, `retest`, `done` (`STAGES`, also `board.stages`). The owner's "backlog → active" example is a drag from `open` to `review`. `state` stays a badge (`live`, `held`, `parked`, `closed`), not a second set of columns. Closed cards sit in `done`.

A click on a card, on the wave list and on the kanban, opens one modal with that card's timeline (the beats on the card, including a status move). This replaces the in-place `.wdetail` expand on both views. Esc closes the modal. A click on the backdrop closes it. The URL carries `?card=` plus the card key (`repo#number`, encoded), so a reload or a shared link opens that same modal on either view. Closing clears the param. A finished drag does not open the modal.

Every issue and PR card on both views shows a GitHub link on the card face, visible while the modal is closed. The link is `c.url` when that is an https GitHub issue or pull. Otherwise it is `https://github.com/<repo>/pull/<number>` or `.../issues/<number>` from `kind`. It opens in a new tab (`target=_blank`, `rel=noopener`). A click on the link does not open the modal. A pinned card with no repo and number has no such link. A cloud row shows the same face link when its `pr` is a GitHub pull URL.

A signed-in user can drag a card into another column. The drop is saved as one status-change event on that card's timeline. The next feed paint places the card in the new column. Anonymous viewers and the password session can see the board and cannot drag.

### 24h tiles

The six buttons in `#waveStats` stay the filter they are now: `issues_opened_24h`, `issues_closed_24h`, `prs_opened_24h`, `prs_merged_24h`, `prs_closed_unmerged_24h`, and `open_total`, matched by `*_ids` (open now = not `closed` and not stage `done`). A Kanban control beside that strip switches the card list to columns of the same filtered set (`wb.statFilter`). A tile click while the kanban is up repaints the columns. Empty columns stay visible so they can receive a drop.

## Files to touch

- `house/live/app/public/index.html` — columns, the shared timeline modal, the face GitHub link, drag, Kanban control next to the tiles.
- `house/live/app/public/live-config.js` — pure helper that places a card in a stage column. `board_status` is already a kind word ("board").
- `house/live/app/server.mjs` — `POST /cards/status` and the sign-in session. Password `POST /login` and `mesh_session` stay as they are.
- `house/live/feed/live_board.py` — read the status events with the feed events and set `stage` from the newest one.
- `house/live/tests/test_board.py`, `house/live/tests/server-route.test.mjs`, and a new Playwright file under `house/live/tests/`.
- `docs-site/docs/plates/bifrost.md` — the column view, the timeline modal, the face GitHub link, and the drag beat.

OAuth modules: see the open question. Do not add an npm dependency with a guessed name.

## Data model for status moves

A card is still one GitHub issue or PR, key `repo#number`. A move does not edit GitHub.

Append-only JSONL on the volume, beside `cards.json`:

- `id` — `status:<repo>#<number>:<seq>`
- `t_ct` — America/Chicago offset, same clock as other board times
- `kind` — `board_status`
- `repo`, `number`
- `from_stage`, `to_stage` — both in `open|review|fix|merge|retest|done`
- `by` — the signed-in subject
- beat `what` — `status <from> → <to>`

`live_board.model` appends that beat to the card. If it is the newest stage-moving beat, `stage` becomes `to_stage`. A later GitHub beat that already changes stage (reviewer verdict, merge, close) still wins when it is newer. The event does not set `closed`, `held`, or `parked`, and it does not clear stall, nudge, or the tripwire. The collector pass must keep the event, or the column snaps back.

`POST /cards/status` body: `{ repo, number, to_stage }`. Same column is a no-op and writes nothing. Unknown stage, missing card, or a pinned card is rejected. The response includes the new beat.

## Auth flow

The page login today is the mesh password (`POST /login` → `mesh_session`). That cookie does not authorize a drag.

Sign-in for a drag reuses the owner's bedrock xAI OAuth. Searched npm and the bedrock repo: `package.json` there has no xAI OAuth dependency, and `xai-oauth` is not on the npm registry. The working copy is the bedrock server modules `server/xai-oauth.mjs` and `server/xai-oauth-redis.mjs` (device code on the service, not a localhost callback). Refresh is `ensureFreshOAuth`: a timer, plus a check when the access token is inside the headroom. A successful refresh is stored in Redis, the token file, and the Railway env var `XAI_OAUTH_TOKENS` (`variableUpsert`, `skipDeploys`) when that service has `RAILWAY_API_TOKEN` and the project, environment, and service ids. `invalid_grant` quarantines refresh and requires sign-in again.

The board server calls that same refresh before it accepts a drag. The browser talks only to this origin (`connect-src 'self'`). The verification page opens on x.ai. A session cookie separate from `mesh_session` marks the signed-in user. Expiry refresh happens on the Railway service. No token is logged or written into this repo.

Open question: there is no published npm package name to depend on. Confirm whether to copy those two bedrock modules or to publish and name a package. Do not invent a package name.

## Plates and docs

- `docs-site/docs/plates/bifrost.md` — kanban is a column view of the collector board. A card click opens the timeline modal (`?card=`). A drag is a timeline beat, not a GitHub edit. The GitHub link sits on the card face.
- `grok-bot/OP-PROC.md` — no change. A status move is not one of the beats that move stall or nudge.

## Tests

- `house/live/tests/test_board.py` — a `board_status` event becomes a beat and sets `stage` only while it is newest. A newer merge still ends the card.
- `house/live/tests/server-route.test.mjs` — `POST /cards/status` rejects a missing session, a pinned card, and a same-column drop. A signed-in drop appends one event.
- Live Playwright, new file `house/live/tests/kanban-drag.test.mjs`, same shape as `board-panel.test.mjs` (`node:test` + Playwright chromium against the app page). Individually runnable: `node --test house/live/tests/kanban-drag.test.mjs`.
  - Drag a fixture card from the `open` column to `review` with a real pointer. The timeline modal shows `status open → review`. Reload. The card is still in `review`. The drag itself does not leave the modal open.
  - Timeline modal, both views: a click on a wave-list card and a click on a kanban card each open the dialog with that card's beats, and neither card expands `.wdetail` in place. Esc closes and clears `?card=`. A backdrop click closes and clears it. Loading `?card=` with that key opens the same modal.
  - GitHub link, both views: while the modal is closed, the wave-list card and the kanban card each show a link to that PR or issue. The link has `target=_blank` and `rel=noopener`. Activating it does not open the modal.

## Out of scope

- GitHub state, labels, comments, merge, or close.
- Seat keys, inbox, wakes, nudges, tripwire, clock.
- The mesh canvas, roster, and activity log.
- Replacing the password gate or public-mode reads.
- Cloud-agent rows as draggable cards.
- Publishing an npm package.
- A second status vocabulary (`backlog`, `active`) beside `stage`.
- Keeping the in-place `.wdetail` expand as a second timeline.
