# Packet: owner sign-in under the mesh

Packet only. No code in this change. The word on the board is owner.

## Packet

- goal: A sign-in card in the empty slot under the mesh. A logged-in owner pings a seat and drags a kanban card. The ping lands in that seat's inbox and on the board timeline. The drag writes a status beat on the card timeline.
- constraints: Packet only. Stay on the word owner. No personal names. No OAuth token in the browser, in a cookie, or in a log line. Do not invent an npm package name. `POST /emit` stays the assistant presence dot.
- path: This file. After packet PASS, one follow-up edits the files named below.
- acceptance: Logged out, the slot shows sign-in, the kanban does not drag, and ping and status posts answer 401. Logged in, a short note is stored on that seat's inbox and on the board timeline, and a drag from `open` to `review` stays after reload with a new card beat. Refresh of the access token runs on the board service and mirrors to Railway.
- gates: A and C wait on the follow-up. B and D stay off. A docs-only packet does not wait on CI.
- evidence: `house/live/app/server.mjs` `validDot` accepts `kind` `oauth` only as an emitter dot. `house/live/app/public/index.html` renders a read-only kanban. The owner's bedrock `package.json` is `"private": true` and lists no xAI OAuth dependency.
- next owner: reviewer, for packet PASS.
- escalate: owner, on the package blocker below.

## Blocker

There is no xAI OAuth npm package to depend on.

The owner's bedrock repo package name is `bedrock`. That `package.json` sets `"private": true`. Its `dependencies` do not include an OAuth package. The working copy is two server modules in that repo, `server/xai-oauth.mjs` and `server/xai-oauth-redis.mjs`. They are not an export map, and this checkout does not depend on them, vendor them, or import them.

`scripts/node/setup-xai-oauth.mjs` in this repo is a localhost PKCE script for a Hermes auth file. It is not that package and the board does not call it.

This packet does not guess a package name and does not copy the modules. The follow-up imports them only after the owner publishes a package, or after the owner says to vendor those two files. The Redis module imports `ioredis`, which this repo does not depend on.

## What the bedrock modules export

Read from `server/xai-oauth.mjs` in the owner's bedrock repo:

`XAI_TOKEN_URL`, `XAI_DEVICE_CODE_URL`, `XAI_CLIENT_ID`, `XAI_OAUTH_SCOPES`, `XAI_OAUTH_RAILWAY_ENV_VAR`, `normalizeTokenBlob`, `loadOAuthTokensFromEnv`, `isRailwayOAuthSyncEnabled`, `refreshOAuthTokens`, `ensureFreshOAuth`, `invalidateCachedAccessToken`, `resolveXaiBearer`, `getCachedOAuthTokens`, `chatAuthMode`, `oauthPersistConfigured`, `startOAuthRefreshLoop`, `oauthStatus`, `serializeTokensForEnv`, `writeHermesAuthFile`, `hasOAuthTokens`, `exportTokensForRailway`, `requestDeviceCode`, `startDeviceCodeFlow`, `getOAuthFlowStatus`.

Read from `server/xai-oauth-redis.mjs`:

`XAI_OAUTH_REDIS_KEY`, `initOAuthRedis`, `isOAuthRedisAvailable`, `readOAuthTokensFromRedis`, `writeOAuthTokensToRedis`, `deleteOAuthTokensFromRedis`, `shutdownOAuthRedis`.

## How bedrock wires refresh

`startOAuthRefreshLoop` loads Redis when `REDIS_URL` is set, then the env and file blob, and prefers the newer Redis blob. A timer calls `ensureFreshOAuth`. `ensureFreshOAuth` calls `refreshOAuthTokens` when the access token is inside the headroom (`XAI_OAUTH_REFRESH_BUFFER_MS`, else `XAI_OAUTH_REFRESH_BUFFER_SECS`, else five minutes) or when `force` is set. The timer interval is `XAI_OAUTH_REFRESH_INTERVAL_MS` (else 60 seconds).

`refreshOAuthTokens` posts `grant_type=refresh_token` to the token URL with the public client id. A success runs `saveTokens`: memory, `XAI_OAUTH_TOKENS` / `XAI_OAUTH_JSON` / `XAI_OAUTH_B64` in the process env, the token file (`XAI_OAUTH_PATH` or the default file), Redis, then a debounced Railway `variableUpsert` with `skipDeploys: true` for `XAI_OAUTH_TOKENS` and `XAI_OAUTH_B64`. That upsert runs when `isRailwayOAuthSyncEnabled` is true: `RAILWAY_API_TOKEN` plus `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, and `RAILWAY_SERVICE_ID`. `XAI_OAUTH_RAILWAY_SYNC=false` turns the mirror off. An HTTP 400 or 401 with `invalid_grant` quarantines refresh, drops the in-memory blob, and deletes the Redis key. Sign-in is required again.

Production sign-in in those modules is the device-code flow (`requestDeviceCode`, `startDeviceCodeFlow`), polled on the service. It is not a localhost redirect.

The board service calls `ensureFreshOAuth` before it accepts a ping or a status write, and it keeps the same boot loop. The browser never sees the refresh.

## Scope

The live page is a two-column `.split`. `#meshPanel` is the left cell. `#wave` is the right cell and is fixed at 720px, so the left column ends short. That gap under the mesh controls is the slot.

The follow-up wraps the mesh panel and a new `#ownerSlot` in one left column so the slot fills the gap beside the board. Logged out, the slot is the sign-in card (start device-code, show the verification URL and user code to that browser, poll until the service has a session). Logged in, the slot is a seat select drawn from the fleet seat ids, a short note, and send. A sign-out control clears the owner cookie.

The same owner session gates kanban drag. The kanban in `index.html` is read-only today (`renderKanban` paints columns and a click opens the card). The follow-up adds a pointer drag only while the owner session is valid. A finished drag does not open the card modal. Logged out, cards stay click-to-open and are not draggable.

`POST /emit` (`validDot` in `server.mjs`, the `kind` check that allows `tool` and `oauth`) stays the assistant presence dot. The bearer is the assistant seat-key hash. The field set is `tool`, `t`, `ok`, `client`, `latency_ms`, `kind`. Any other field is refused. The handler stores the last 50 dots in memory and folds Assistant into the fleet view. It does not open a session, accept a note, or move a card. Owner login, ping, and drag do not call it.

The mesh password and `mesh_session` stay the page gate in private mode. They do not authorize ping or drag. Public mode still serves the page. Ping and drag still require the owner session.

## Files

- `house/live/app/public/index.html` — `#ownerSlot` under the mesh; drag on `#kanbanBoard` only with a valid owner session.
- `house/live/app/public/live-config.js` — pure helper for the note charset and for which column a card drops into. `KANBAN_STAGES` stays `open`, `review`, `fix`, `merge`, `retest`, `done`.
- `house/live/app/server.mjs` — owner session, device-code routes, ping, `POST /cards/status`. In-process writes. The browser does not hold a seat key.
- OAuth modules — imported only after the blocker clears. No new dependency name in this packet.
- `house/live/tests/owner-sign-in.test.mjs` — Playwright, logged out and logged in.
- `house/live/tests/server-route.test.mjs` — 401 without the owner cookie, CSRF failure, note rejection, same-column no-op.
- `house/live/docs/board.md` — ping line and status beat.
- `docs-site/docs/plates/bifrost.md` — the slot, the owner session, and the emitter dot left as it is.

`grok-bot/ops/packets/PACKET-KANBAN.md` already names `POST /cards/status` and left the package question open. This packet is the sign-in card, the ping, and the drag gate. It does not redo that packet's exit fields, `field_check`, or face-link work.

## Data flow

Sign-in:

1. The slot posts `POST /owner/oauth/initiate` on this origin.
2. The server starts a device-code flow and binds it to an HttpOnly pending cookie for that browser. One process-global pending code is not used, so a second visitor cannot finish someone else's flow.
3. The card shows the verification URL and user code.
4. `GET /owner/oauth/status` returns `pending`, `authenticated`, and `needsReauth`. It never returns a token.
5. On success the server sets the owner session cookie and the card becomes the ping form.
6. A healthy refresh token already on the service is not replaced by a new device-code unless the caller has the owner session or refresh is quarantined.

Ping:

1. `POST /owner/ping` with `{ seat, note }` and the CSRF header. Seat is a fleet seat id. `note` matches `ACT_NOTE` (1–240 characters, the prompt charset).
2. The server calls `ensureFreshOAuth` first. A quarantined refresh answers 401 and the slot returns to sign-in.
3. Board timeline: one activity line `{ kind: "prompt", action: "sent", from: "owner", to: <seat>, note }` through `rememberActivity` and `activityEvent`. `from` stays the literal `owner`. The feed draws it as `seat_prompt` on the activity list. `promptSender` must not replace that literal with a name from `LIVE_OWNER` or `HOUSE.md` for this path.
4. Seat inbox: one line through `postSeatLines`. `type` is `prompt`. `reason` is the same note. `repo`, `title`, and `url` are empty strings. `number` is 0. `from` is omitted, because `owner` is not a seat id. `seat` and `to` are the chosen seat. Field names `body`, `text`, and `message` stay off the line.
5. `nudgeLines` skips `type === "prompt"`, so a ping does not climb the unacked-line ladder.

Drag:

1. A pointer drop posts `POST /cards/status` with `{ repo, number, to_stage }` and the CSRF header.
2. The owner session is required. A missing card, a pinned card, or a stage outside the six columns is rejected and writes nothing. The same column is a no-op and writes nothing.
3. The server appends an event on the volume beside `cards.json`: `kind` `board_status`, `from_stage`, `to_stage`, `by` `owner`, `t_ct` America/Chicago with its offset. The card beat `what` is `status <from> → <to>`. The card pop and the wave detail read that beat. The collector pass keeps the event so the next derivation does not snap the column back. The event does not set `closed`, `held`, or `parked`.

## Security

- The access token and the refresh token stay on the server: process memory, the token file mode `0600`, Redis, and the Railway env mirror. They are not in HTML, JSON, cookies, `localStorage`, or the activity line.
- Log lines for refresh carry the HTTP status and the error code. They do not carry the token URL response body, the Railway variable value, or an `Authorization` header.
- The verification URL and user code render in the slot for the browser that started the flow. They are not copied into the inbox `reason` or the activity `note`.
- Owner cookie name is `owner_session`, separate from `mesh_session`. Flags match the mesh cookie helper: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`. `Max-Age` is 12 hours. The HMAC label is `owner-session:` so a mesh cookie cannot be replayed as an owner cookie. The signed subject is the literal `owner`. The cookie value is expiry, subject, and signature. It does not contain a bearer token.
- Pending device-code cookie: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, cleared when the flow ends or expires.
- CSRF: `GET /owner/session` returns a per-session CSRF token in the JSON body. Ping and status posts echo it in `X-Owner-CSRF`. The token is not an OAuth token and is not written to `localStorage`. A missing or wrong token is 403 and writes nothing. `SameSite=Strict` stays on the cookie as well.
- Rate limit failed initiate and failed session posts per client IP with the existing login window.
- Content-Security-Policy stays `connect-src 'self'`. The verification page is a normal navigation to x.ai, not a fetch from the page.
- Seat keys, `INGEST_SECRET`, and `MESH_PASSWORD` are not sent to the browser.

## Env vars

Names only. Values stay in Railway.

Already required by the board process: `SESSION_SECRET`.

OAuth load and refresh, same names the bedrock module reads: `XAI_OAUTH_TOKENS`, `XAI_OAUTH_JSON`, `XAI_OAUTH_B64`, `XAI_OAUTH_PATH`, `XAI_OAUTH_REFRESH_BUFFER_MS`, `XAI_OAUTH_REFRESH_BUFFER_SECS`, `XAI_OAUTH_REFRESH_INTERVAL_MS`, `XAI_OAUTH_REFERRER`, `REDIS_URL`.

Railway mirror: `RAILWAY_API_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_SERVICE_ID`, `XAI_OAUTH_RAILWAY_SYNC`.

`MESH_PASSWORD` stays the private-mode page gate. It is not the drag credential.

## Tests

Playwright is already a devDependency. The new file matches `house/live/tests/board-panel.test.mjs`: `node:test` plus Playwright chromium against the app page. Individually runnable: `node --test house/live/tests/owner-sign-in.test.mjs`. The test mints `owner_session` with the test `SESSION_SECRET`. It does not call auth.x.ai and it does not log a token.

Logged out:

- `#ownerSlot` shows the sign-in control and hides the seat sender.
- Kanban cards have no drag behavior. A pointer drag leaves the card in its column.
- `POST /owner/ping` and `POST /cards/status` without the owner cookie answer 401 and write nothing.

Logged in:

- The slot shows the seat select and the note field.
- Sending a note to one seat adds that line on the activity list and returns it from that seat's inbox. The stored `from` is `owner`.
- Dragging a fixture card from `open` to `review` with a real pointer leaves it in `review` after the next paint and after reload. The card timeline shows the status beat. The drag does not open the modal.
- A note outside `ACT_NOTE`, an unknown seat, a wrong CSRF header, and a same-column drop write nothing.

`server-route.test.mjs` covers the same 401, 403, and no-write cases without a browser.

## Docs

- `docs-site/docs/plates/bifrost.md` — the slot under the mesh is the owner sign-in card. A logged-in owner pings a seat and drags a column. The ping is an inbox line and a board timeline line. The drag is a card beat. `POST /emit` with `kind` `oauth` stays the assistant dot.
- `house/live/docs/board.md` — the ping shape and the `board_status` beat. The password session stays a read gate.

## Out of scope

- Publishing or naming an npm package.
- Copying the bedrock modules in this packet.
- Using `scripts/node/setup-xai-oauth.mjs` or a localhost callback.
- Putting a token in the client or in logs.
- Routing owner login through `POST /emit`.
- Replacing the mesh password, public mode, or `mesh_session`.
- Seat-key inbox posts from the browser.
- Editing GitHub labels, comments, merge, or close.
- The exit-field work in `PACKET-KANBAN.md`.
- A second status vocabulary beside the six stages.
