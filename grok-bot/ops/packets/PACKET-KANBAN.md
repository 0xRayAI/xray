# PACKET — Kanban view of the Bifrost wave board

Packet only. No code in this change.

## Core

The root bug is that card metadata is not maintained. `owner`, `status`, `acceptance`, `evidence`, `next owner`, `blockers`, `branch/head`, and `CI` are derived on every `live_board.model` pass from source events, then derived again when those events change. A field is not written by hand and left. A value a replay of the events would not produce is underivable.

- `status`, `evidence`, `blockers` — GitHub PR, review, and CI events. `review` with `CHANGES_REQUESTED` is the beat and the blocker `changes requested`, not `Reviewer FAIL`, and the stage is `fix`.
- `branch/head` — the newest PR push (`head` sha, and branch when the event carries one).
- `CI` — the newest CI conclusion on the card.
- `acceptance` — the linked packet only. That is the card packet's `acceptance`, else the PR body's `## Packet` acceptance, else the packet the card or PR names. The body is not stored.
- `owner` — the cloud-agent start/stop hooks (#472). A `cloud_agent` event with `action` `launch` or `finished` sets `owner` to that event's `agent` (`bcId`). The newest launch on the card wins. A `finished` for that agent leaves the same `bcId`. The critic login is never the owner.
- `next owner` — the review verdict. `changes requested` names the fixer, the owner the #472 hook set on that card, not the review author.

`state` (`live`, `held`, `parked`, `closed`) stays a badge. It is not one of these fields. A drag does not write `status` on the card. It appends a `board_status` event, and the next pass derives `status` from it. A newer GitHub event that moves stage still wins.

## Board check

Every issue and PR card gets `field_check`: a list of `{field, why}` with `why` of `missing` or `underivable`. Missing means the field is empty. Underivable means the stored value is not what a replay produces, including a hand-set `next owner` or an owner of critic while the hook names a `bcId`. An empty list is a maintained card. The wave face and the kanban face show the same flag. The check does not fill a field to clear itself. `— missing —` is not a value. When the events can fill the field, the field is filled. When they cannot, the flag is the signal.

## Scope

A kanban of those cards. Columns are the derived stages `open`, `review`, `fix`, `merge`, `retest`, `done` (`STAGES`, also `board.stages`). The owner's "backlog → active" example is a drag from `open` to `review`. Closed cards sit in `done`.

A click on a card, on the wave list and on the kanban, opens one modal with that card's timeline and the derived fields. This replaces the in-place `.wdetail` expand on both views. Esc closes the modal. A click on the backdrop closes it. The URL carries `?card=` plus the card key (`repo#number`, encoded). Closing clears the param. A finished drag does not open the modal.

Every issue and PR card on both views shows a GitHub link on the card face, visible while the modal is closed. The link is `c.url` when that is an https GitHub issue or pull. Otherwise it is `https://github.com/<repo>/pull/<number>` or `.../issues/<number>` from `kind`. It opens in a new tab (`target=_blank`, `rel=noopener`). A click on the link does not open the modal. A pinned card with no repo and number has no such link. A cloud row shows the same face link when its `pr` is a GitHub pull URL.

A signed-in user can drag a card into another column. Anonymous viewers and the password session can see the board and cannot drag.

### 24h tiles

The six buttons in `#waveStats` stay the filter they are now: `issues_opened_24h`, `issues_closed_24h`, `prs_opened_24h`, `prs_merged_24h`, `prs_closed_unmerged_24h`, and `open_total`, matched by `*_ids`. A Kanban control beside that strip switches the card list to columns of the same filtered set. A tile click while the kanban is up repaints the columns. Empty columns stay visible so they can receive a drop.

## Files to touch

- `house/live/feed/live_board.py` — derive the eight fields on every pass, and set `field_check`.
- `house/live/feed/live_packet.py` — acceptance from the linked packet only. The body is not stored.
- `house/live/app/public/index.html` — columns, the shared modal, the face GitHub link, the field-check flag, drag, Kanban control next to the tiles.
- `house/live/app/public/live-config.js` — pure helper that places a card in the derived stage column.
- `house/live/app/server.mjs` — `POST /cards/status` appends the event and does not write `status` on the card. Password `POST /login` and `mesh_session` stay.
- `house/live/docs/board.md` — the derived fields, the check, and the `CHANGES_REQUESTED` row.
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

- `docs-site/docs/plates/bifrost.md` — kanban is a column view of derived status. A card click opens the timeline modal (`?card=`). A drag is an event, then a re-derived status. The GitHub link sits on the card face. `field_check` is the maintenance flag.
- `grok-bot/OP-PROC.md` — the beat line's `CHANGES_REQUESTED` parenthetical becomes `changes requested`. A status move is still not a beat that moves stall or nudge.

## Tests

The earlier per-field fixes are tests that a replay derives the field.

- `house/live/tests/test_board.py`
  - A `cloud_agent` launch (#472) for `bc-id` on the card, then `review` `CHANGES_REQUESTED`: `owner` is `bc-id`, not critic. A later `finished` for that agent leaves `owner` as `bc-id`.
  - That review sets `next owner` to that fixer, not the critic login. The beat is `changes requested` and the stage is `fix`. Not `Reviewer FAIL`.
  - `acceptance` equals the linked packet. A second case reads it from the PR body's `## Packet` when that is the linked packet. No other string is written into the field.
  - `evidence`, `blockers`, `head`, and `CI` match the GitHub events in the fixture. A hand-set `next owner` with no verdict is `underivable`.
  - `field_check` is empty when every field replays. It flags `missing` when the packet has no acceptance, and `underivable` when a stored owner is critic while the hook names `bc-id`.
  - A `board_status` event re-derives `status` only while it is the newest stage move. A newer merge still ends the card.
- `house/live/tests/server-route.test.mjs` — `POST /cards/status` rejects a missing session, a pinned card, and a same-column drop. A signed-in drop appends one event and does not write `status` on the stored card.
- Live Playwright, new file `house/live/tests/kanban-drag.test.mjs`, same shape as `board-panel.test.mjs` (`node:test` + Playwright chromium against the app page). Individually runnable: `node --test house/live/tests/kanban-drag.test.mjs`.
  - Drag a fixture card from `open` to `review` with a real pointer. After the next paint the card is in `review` because status was re-derived. Reload. It stays. The drag does not leave the modal open.
  - Timeline modal, both views: a click opens the dialog with that card's beats and derived fields, and neither card expands `.wdetail` in place. Esc closes and clears `?card=`. A backdrop click closes and clears it. Loading `?card=` opens the same modal.
  - GitHub link, both views: while the modal is closed, each card shows a link to that PR or issue with `target=_blank` and `rel=noopener`. Activating it does not open the modal.
  - Card fields, both views: the fixture shows `changes requested`, owner `bc-id`, next owner that fixer, and the packet acceptance. `field_check` is empty. It does not show `Reviewer FAIL`, critic as owner or next owner, or `— missing —` for a field the events can fill. A card with no packet acceptance shows the missing flag on both views.

## Out of scope

- Editing GitHub state, labels, comments, merge, or close. The board reads those events.
- Seat keys, inbox, wakes, nudges, tripwire, clock.
- The mesh canvas, roster, and activity log.
- Replacing the password gate or public-mode reads.
- Cloud-agent rows as draggable cards.
- Publishing an npm package.
- A second status vocabulary (`backlog`, `active`) beside derived stage.
- Keeping the in-place `.wdetail` expand as a second timeline.
- Hand-filling a field so the check goes quiet.
