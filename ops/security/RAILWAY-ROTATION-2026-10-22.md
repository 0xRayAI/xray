# Railway rotation checklist — 2026-10-22

Refs #560. Names only. This file does not contain secret values, and it was built without calling Railway or using Railway credentials.

Railway’s 2026-10-21 disclosure says customer environment variables may have been read, including decrypted API keys and database or registry credentials. At 04:39 UTC on 2026-10-22 Railway invalidated every Railway API token and reset bucket keys. Railway-held GitHub tokens were invalidated. A GitHub personal access token that was stored as a Railway registry credential keeps working on GitHub until someone revokes it there.

## How to rotate

| Provider | Step |
| --- | --- |
| xAI | Disable the old key in the xAI Console. Then put the new key in the Railway variable. Overwriting the variable is not enough. |
| GitHub PAT | Revoke the token on GitHub. Then put a new token in the Railway variable, if the service still needs one. |
| npm | Roll the token at npm. Then update the Railway variable. |
| Stripe | Roll the key at Stripe. Then update the Railway variable. |
| Redis / DB | Roll the password at the database provider (for a Railway Redis plugin, that is Railway). Then update `REDIS_URL` on every service that uses it. |
| cloud | Roll the credential at that cloud (Railway API token, Railway bucket key, Cursor key, RPC provider). Then update the Railway variable. Railway API tokens from before 04:39 UTC on 2026-10-22 are already invalid. Railway says bucket keys were reset; confirm each bucket client is on the new pair. |
| other | Roll the credential at the provider (or generate a new app secret). Then update the Railway variable. |
| not a credential | Leave it. A public URL, a timeout, or a feature flag is not a secret. |

`UNSURE` means the repo names the variable or the host, and does not prove the Railway project name, or does not prove the variable is set in production.

Public hostnames in this fleet look like `<service>-production-<suffix>.up.railway.app`. The service slug is inferred from that hostname. The Railway **project** name is recorded only where a file states it.

No `nixpacks.toml` is in this repo. The root MCP image is a Dockerfile (`src/__tests__/unit/mcp-node-image.test.ts:9`). Other repos below do use Nixpacks.

## Services

| Service | Railway project | Evidence | Secret-bearing names |
| --- | --- | --- | --- |
| burst-live | `burst-live` | `house/live/app/deploy.sh:8`, `house/live/README.md:92` | `GITHUB_READ_TOKEN`, `RAILWAY_TOKEN`, `CURSOR_API_KEY`, `CURSOR_WEBHOOK_SECRET`, `SESSION_SECRET`, `INGEST_SECRET`, `MESH_PASSWORD`, `ARCHIVE_KEY`, `WAKE_KEY_<SEAT>`, `JIRA_API_TOKEN`, `SEAT_KEYS` (hashes) |
| xray governance MCP | UNSURE | `railway.json:8`, `docs-site/docs/mcp/README.md:73` | `GOVERNANCE_API_KEY`, `XRAY_HERMES_AUTH`, `XRAY_LLM_API_KEY`, `XRAY_GOVERNANCE_LLM_API_KEY` |
| blurrn-mcp (Dynamo) | UNSURE | `htafolla/chrono-warp-drive` `mcp/railway.toml:6`, host `mcp-production-80e2` | `VORTEX_SIGNING_KEY`, `MCP_WRITE_API_KEY`, `DEPLOYER_PRIVATE_KEY`, `REDIS_URL`, `BASE_RPC_URL` |
| neural-fusion backend | UNSURE | same repo, `backend/neural-fusion-server.ts:6` | none in code besides `PORT` |
| blurrn-stellar-mcp | UNSURE | same repo, `mcp/stellar-server.ts:7` | `REAL_NEURAL_BACKEND_URL` if it embeds a key |
| chrono Redis weekly backup | UNSURE | `services/redis-weekly-backup/railway.json:8` | `REDIS_URL`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY` |
| muse-house | UNSURE | `0xRayAI/muse-house` `railway.json:1` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SKILLS_REPO_TOKEN`, `RESEND_API_KEY`, `BLING_API_TOKEN`, `BLING_DEV_TOKEN` |
| clearing | UNSURE | `htafolla/clearing` `railway.json:7` | `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CLEARING_8004_KEY`, `CLEARING_RAIL_TOKEN`, `CLEARING_OPERATOR_TOKEN`, `CLEARING_SESSION_TOKEN`, `ZIGZAG_RAIL_TOKEN`, `AGENT_TOOLS_VERIFY_TOKEN_RAILWAY` |
| groover registry | UNSURE | `htafolla/groover` `railway.json:7`, host `registry-production-e2c4` | `GRVR_PRIVATE_KEY`, `GRVR_RPC_URL` |
| groover website (`/suit`) | UNSURE | `htafolla/groover` `website/railway.json:7`, host `website-production-c0da` | none read by the site code |
| 0xray-moltbook | UNSURE | `house/HOUSE.md:28` | xAI login material is on the volume. Env var names were not readable. `DRY_RUN` is a flag, not a secret. |

npm: no `NPM_TOKEN` or `NODE_AUTH_TOKEN` is read by any of these services, and none of the repos ships an `.npmrc`. If the Railway dashboard still has either name, roll it at npm and then update Railway. That presence is UNSURE.

### 1. burst-live

- Project: `burst-live`. Service: `burst-live`. Environment: `production`.
- Defined: `house/live/app/deploy.sh:8` (project and service) and `:11` (environment). `house/live/README.md:86` and `:92`. `house/live/feed/site.json:2`.
- Builder: `house/live/app/Dockerfile:2` (`node:24.22.1-bookworm-slim`). Start: `house/live/app/railway.json:4` (`node server.mjs`). Health: `/healthz`.
- Public board host behind the service is named at `house/live/tools/load-wave-seed.mjs:14`. The page host is `https://bifrost.0xray.dev` (`house/live/feed/site.json:3`).
- `house/live/app/.railway/railway.ts:11` and `:16` say service `live-mesh` and project `live-board`. The file says to rename those to `LIVE_RAILWAY_SERVICE` and `LIVE_RAILWAY_PROJECT` before apply, and not to apply while `railway.json` is still the config (`railway.ts:4`). Treat `live-mesh` / `live-board` as unused placeholders, not the live names.
- Deploy-machine names, not variables on the service: `LIVE_RAILWAY_PROJECT`, `LIVE_RAILWAY_SERVICE`, `LIVE_RAILWAY_ENVIRONMENT`, `MESH_APP_DEPLOY_DIR`, `LIVE_PUBLIC_OVERLAY` (`house/burst/DEPLOY.md:155`).

Secrets and credentials the process reads:

| Name | Read | Provider | Rotation |
| --- | --- | --- | --- |
| `GITHUB_READ_TOKEN` | `house/live/app/server.mjs:822` and `:2156` | GitHub PAT (fine-grained, read-only; `house/burst/DEPLOY.md:193`) | Revoke on GitHub, then update Railway. The collector child receives that same value as `GH_TOKEN` (`server.mjs:2169`). There is not a second Railway variable named `GH_TOKEN`. |
| `RAILWAY_TOKEN` | `house/live/app/server.mjs:2175` | cloud (Railway API) | Tokens from before 04:39 UTC on 2026-10-22 are already invalid. Create a new read-only token and set this variable. Optional: unset leaves deploy poll off (`house/burst/DEPLOY.md:180`). |
| `CURSOR_API_KEY` | `house/live/app/arch1-launch.mjs:199` | cloud (Cursor) | Roll at Cursor, then update Railway. Required only when `ARCH1_LAUNCH_ENABLED=1` (`house/live/env.example:41`). |
| `CURSOR_WEBHOOK_SECRET` | `house/live/app/arch1-launch.mjs:200` | other (HMAC we generate) | Generate a new secret of 32 characters or more, update Railway, and register it on the Cursor webhook again. |
| `SESSION_SECRET` | `house/live/app/server.mjs:49` | other | Generate a new value and update Railway. Existing login cookies stop working. |
| `INGEST_SECRET` | `house/live/app/server.mjs:50` | other | Generate a new value, update Railway, and update every pusher that sends it. |
| `MESH_PASSWORD` | `house/live/app/server.mjs:48` | other | Generate a new value if gated mode is on. `house/live/feed/site.json:1` sets `"public": true`, so this may be unset. If it is set, rotate it. |
| `ARCHIVE_KEY` | `house/live/app/server.mjs:3198` | other | Generate a new bearer and update Railway. Optional. |
| `SEAT_KEYS` | `house/live/app/server.mjs:339` | other (sha256 hashes only; `house/burst/DEPLOY.md:253`) | Not a bearer token. Remint seat keys and publish new hashes if a raw seat key was also stored on Railway. That raw-key storage is UNSURE; the doc says only the hash is published. |
| `WAKE_KEY_<SEAT>` | `house/live/app/server.mjs:341` | other | One variable per seat (`key_env` in `SEAT_WEBHOOKS`, or `WAKE_KEY_` plus the seat id uppercased, `-` turned into `_`). Example name in docs: `WAKE_KEY_MILL` (`house/live/docs/inbox.md:49`). Generate a new value per seat and update Railway and that seat. |
| `JIRA_API_TOKEN` | `house/live/app/server.mjs:2511` | other (Atlassian) | Roll at Atlassian, then update Railway. The Jira child starts only when `JIRA_SITE`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and `JIRA_PROJECTS` are all set (`server.mjs:2511`). |
| `JIRA_EMAIL` | `house/live/app/server.mjs:2511` | other (account id, not a token) | Not a credential by itself. Change it only if the Atlassian user changes. |

Not credentials (the process reads them; do not rotate them as secrets): `PORT` (`server.mjs:33`, Railway sets it), `NODE_ENV` and `TZ` (`house/live/app/Dockerfile:15`), `APP_PUBLIC_ORIGIN` and `LIVE_URL` (`house/live/app/origin.mjs:12`), `LIVE_PUBLIC`, `LIVE_SITE_NAME`, `LIVE_SITE_JSON` (`house/live/feed/live_site.py:15`), `MESH_DATA_DIR`, `MESH_ARCHIVE_WARM_DAYS`, `CARD_STALE_S`, `DATA_STALE_S`, `CARD_BEHIND_S`, `COLLECTOR`, `COLLECTOR_REPOS`, `COLLECTOR_ORG`, `COLLECTOR_ORG_REFRESH_S`, `COLLECTOR_HEALTH_URLS`, `COLLECTOR_WATCH_S`, `COLLECTOR_STALE_S`, `COLLECTOR_WATCHDOG_N`, `GITHUB_API_URL`, `GITHUB_HOLD_LABEL`, `NO_NUDGE_REPOS`, `LIVE_GH_SEATS`, `HUMAN_ALIASES`, `LIVE_SEAT_IDS`, `LIVE_WINDOW_MIN`, `LIVE_SHOW_UNMAPPED`, `LIVE_TURN_OPEN_MIN`, `LIVE_NODE_MAP`, `LIVE_BRAND`, `LIVE_BRAND_RE`, `LIVE_FLEET_SEATS`, `SEAT_PRESENCE`, `SEAT_WEBHOOKS` (URLs and env **names**, not the wake secret), `SEAT_DISPLAY_NAMES`, `SEAT_AGENT_MAP`, `SEAT_BOTS`, `SEAT_WATCHERS`, `WORK_HUMAN_TO`, `WORK_HUMAN_LANE`, `SOURCE_ALLOWLIST`, `UPSTREAM_REPO`, `UPSTREAM_PINNED`, `UPSTREAM_REPOS`, `XRAY_REPO`, `XRAY_OURS`, `RAILWAY_PROJECTS`, `RAILWAY_POLL_S`, `RAILWAY_API_URL` (`house/live/feed/host_poll.py:18`), `LIVE_RAILWAY_TARGETS`, `LIVE_RAILWAY_FILE`, `NUDGE_L1_S`, `NUDGE_L2_S`, `NUDGE_L3_S`, `NUDGE_LINE_S`, `SILENT_S`, `HELD_MAX_S`, `EMITTER_WORKING_S`, `BOX_STALE_S`, `BIFROST_TICK_S`, `BIFROST_TRIPWIRE_MINUTES`, `BIFROST_RUN_SEAT_MINUTES`, `BIFROST_CLOCK_SEATS`, `BIFROST_WEEKLY_BURN`, `BIFROST_ROUTING_DIR`, `BIFROST_ROUTING_AUDIT_S`, `BIFROST_LOGIN_TTL_S`, `BIFROST_ROSTER`, `BIFROST_WAKE_QUIET_MINUTES`, `WAKE_DEBOUNCE_S`, `WAKE_COALESCE_MS`, `WAKE_RETRY_MS`, `ARCH1_LAUNCH_ENABLED`, `ARCH1_LAUNCH_DAILY_CAP`, `ARCH1_LAUNCH_COOLDOWN_S`, `ARCH1_CLOUD_REPO`, `CURSOR_API_URL`, `CURSOR_WEBHOOK_BASE`, `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_STATIC_URL`, `JIRA_SITE`, `JIRA_PROJECTS`, `JIRA_EXCLUDE`, `JIRA_SOURCE`, `JIRA_API_BASE`, `JIRA_HOLD_STATUS`, `LIVE_OWNER`, `LIVE_OWNER_FILE`, `HOUSE`, `LIVE_HOUSE`, `LIVE_TRACKS`, `HOME`, `PATH`, `LANG`. Full name list also in `house/live/env.example:23` and `house/burst/DEPLOY.md:160`.

`RAILWAY_PUBLIC_DOMAIN` and `RAILWAY_STATIC_URL` are injected by Railway (`arch1-launch.mjs:94` and `:231`). They are hostnames, not customer secrets.

Box feed pass (`house/live/feed/supervisor.sh`), not this Railway service (`house/burst/DEPLOY.md:250` says no App keys on the host): `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`. If any of those were copied onto the Railway service anyway, revoke or rotate the GitHub App key and update the variable. That copy is UNSURE.

### 2. xray governance MCP

- Project: UNSURE. Service slug inferred from the host: `governance`. Environment: `production`.
- Host: `https://governance-production-69c3.up.railway.app/mcp` (`docs-site/docs/mcp/README.md:73`).
- Defined: `railway.json:3` (Dockerfile builder) and `:8` (`node mcp-server.mjs`). Image: `Dockerfile:2`, `ENV NODE_ENV=production` at `Dockerfile:8`, command at `Dockerfile:9`.
- No Nixpacks config (`src/__tests__/unit/mcp-node-image.test.ts:17`).

| Name | Read | Provider | Rotation |
| --- | --- | --- | --- |
| `GOVERNANCE_API_KEY` | `mcp-server.mjs:10`, `src/mcps/governance.server.ts:496` | other (API key this server checks) | Generate a new key, update Railway, and update every client that sends `X-API-Key`. Optional: unset means the HTTP server has no authentication. |
| `XRAY_HERMES_AUTH` | `mcp-server.mjs:21` | xAI (base64 of a Hermes `auth.json`; UNSURE whether that file is an API key or an OAuth blob) | Disable the old key in the xAI Console. If the blob is an OAuth login rather than an API key, revoke that login as well, then update Railway. |
| `XRAY_LLM_API_KEY` | `src/governance/llm-governance-provider.ts:135` | xAI if this is the Hermes/xAI key; UNSURE when the direct client is pointed at another model (`gpt-4o` is the code default at `:141`) | If it is an xAI key, disable it in the xAI Console, then update Railway. If it is another vendor, roll it at that vendor, then update Railway. |
| `XRAY_GOVERNANCE_LLM_API_KEY` | `src/governance/llm-governance-provider.ts:136` | same as `XRAY_LLM_API_KEY` | Same step. The provider uses this name when `XRAY_LLM_API_KEY` is empty. |
| `XRAY_LLM_ENDPOINT` | `llm-governance-provider.ts:131` | other (URL) | Not a credential unless the URL embeds a key. UNSURE. |
| `XRAY_GOVERNANCE_LLM_ENDPOINT` | `llm-governance-provider.ts:132` | other (URL) | Same. |
| `PORT` | `mcp-server.mjs:34` | not a credential | Railway sets it. |
| `MCP_HOST` | `mcp-server.mjs:36`, `governance.server.ts:488` | not a credential | Bind address. |
| `MCP_PORT` | `mcp-server.mjs:35` | not a credential | Copied from `PORT`. |
| `MCP_ALLOWED_HOSTS` | `governance.server.ts:489` | not a credential | Host allowlist. |
| `XRAY_ROOT` | `governance.server.ts:374` | not a credential | Path. |
| `NODE_ENV` | `Dockerfile:8` | not a credential | Image env. |
| `RAILWAY_ENVIRONMENT` | `src/governance/governance-service.ts:279` | not a credential | Railway injects it. |
| `HERMES_PROVIDER`, `HERMES_MODEL`, `HERMES_TIMEOUT_MS`, `HERMES_BIN` | `llm-governance-provider.ts:96`, `:100`, `:114`, `:124` | not a credential | Model and binary selection. |
| `XRAY_LLM_MODEL`, `XRAY_GOVERNANCE_LLM_MODEL` | `llm-governance-provider.ts:139` | not a credential | Model name. |
| `XRAY_LLM_ENABLED`, `XRAY_GOVERNANCE_LLM_ENABLED`, `XRAY_GOVERNANCE_ALLOW_HERMES` | `llm-governance-provider.ts:143`, `:109` | not a credential | Flags. |
| `XRAY_LOCAL_MODE`, `XRAY_GOVERNANCE_IN_PROCESS`, `VERCEL` | `governance-service.ts:136`, `:278`, `:280` | not a credential | Flags. `VERCEL` is a platform name, not this service. |

`GOVERNANCE_ENDPOINT` (`src/integrations/governance/types.ts:85`) is what **clients** use to find Dynamo. It is not read by `mcp-server.mjs`. The public Dynamo host is a different service (next section): `src/integrations/governance/types.ts:77`.

### 3. blurrn-mcp (Dynamo MCP)

- Repo: `htafolla/chrono-warp-drive` (public). Package: `mcp/package.json` name `blurrn-mcp-v5.2`. This repo calls it `blurrn-mcp` (`examples/killer-dual/ARM-B-LANDSCAPE.md:38`, `docs/reflections/two-arch-review-journey-2026-10-02.md:24`).
- Project: UNSURE. Service slug inferred from the host: `mcp`. Environment: `production`.
- Host: `https://mcp-production-80e2.up.railway.app` (`src/integrations/governance/types.ts:77`, and `chrono-warp-drive` `.mcp.json`).
- Defined: `mcp/railway.json:4` (Nixpacks, Node 22) and `mcp/railway.toml:6` (`tsx ${ENTRY_POINT:-server.ts}`). `ENTRY_POINT` selects the process. Default is `server.ts` (the Dynamo MCP). Docs: `docs/DYNAMO-CURRENT-STATE.md` in that repo (Railway, `mcp/` directory).
- The Dynamo UI is not a Railway service. `chrono-warp-drive` `.env.example:45` says there is no Railway service in front of the UI. `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY`, `CHAIN_SAVE_LIMIT_STORE_URL`, and `VITE_CHAIN_SAVE_ENABLED` are described there as Vercel, not Railway.

| Name | Read | Provider | Rotation |
| --- | --- | --- | --- |
| `VORTEX_SIGNING_KEY` | `mcp/lib/writeGate.ts:10` and `:233` | other (HMAC key this server holds) | Generate a new key and update Railway. Mint signatures from the old key stop verifying. |
| `MCP_WRITE_API_KEY` | `mcp/lib/writeGate.ts:11` and `:219` | other (bearer this server checks) | Generate a new bearer, update Railway, and update the chain-save proxy that sends it. |
| `DEPLOYER_PRIVATE_KEY` | `mcp/lib/contractClient.ts:40` | other (Base secp256k1 key) | Create a new key, move any on-chain role off the old key, then update Railway. `writeGate.ts:230` says vortex minting does not use this key; `contractClient.ts` still reads it. UNSURE whether production still sets it. |
| `REDIS_URL` | `mcp/pubsub.ts:22` | Redis/DB | Roll the Redis password, then update this variable. A Railway Redis plugin URL is a cloud credential. |
| `BASE_RPC_URL` | `mcp/lib/contractClient.ts:10` | other (RPC URL) | Roll at the RPC provider if the URL contains an API key, then update Railway. UNSURE whether the value is keyed. |
| `MINT_GLOBAL_BUDGET` | `mcp/lib/writeGate.ts:12` | not a credential | Cap. |
| `MINT_GLOBAL_WINDOW_MS` | `mcp/lib/writeGate.ts:13` | not a credential | Window. |
| `NEURAL_FUSION_URL` | `mcp/index.ts:68` | not a credential | URL of the neural service below. Default host `neural-fusion-backend-production.up.railway.app`. |
| `ALLOW_SEED_ROUTE` | `mcp/lib/containerOrigin.ts:72` | not a credential | Flag. Must stay off in production. |
| `NODE_ENV` | `mcp/lib/containerOrigin.ts:71` | not a credential | Railway / image. |
| `PORT` | `mcp/server.ts:5` | not a credential | Railway sets it. |
| `ENTRY_POINT` | `mcp/railway.toml:6` | not a credential | Start-file selector. |

### 4. neural-fusion backend

- Repo: `htafolla/chrono-warp-drive`. Project: UNSURE (same repo as blurrn-mcp; the Railway project name is not in git).
- Service slug inferred from the default host: `neural-fusion-backend`. Host: `https://neural-fusion-backend-production.up.railway.app` (`src/config/platform-env.ts:24` in that repo).
- Defined: `backend/neural-fusion-server.ts:6` (“intended for Railway”). A second copy lives at `mcp/backend-server.ts:52`. There is no separate `railway.json` for this process. Whether a service is still deployed is UNSURE; the MCP still defaults to that host.

| Name | Read | Provider | Rotation |
| --- | --- | --- | --- |
| `PORT` | `backend/neural-fusion-server.ts:190` | not a credential | Railway sets it. |
| `NEURAL_RETRAIN_INTERVAL_MS` | `backend/neural-fusion-server.ts:48` | not a credential | Interval. |

### 5. blurrn-stellar-mcp

- Repo: `htafolla/chrono-warp-drive`. Project: UNSURE.
- Service slug inferred from the default host: `stellar-mcp`. Host: `https://stellar-mcp-production.up.railway.app` (`src/config/platform-env.ts:28` in that repo).
- Process: `mcp/stellar-server.ts:7` logs `blurrn-stellar-mcp`. Start it by setting `ENTRY_POINT` (`mcp/railway.toml:6`) or an equivalent start command. No separate `railway.json`. Still deployed: UNSURE.

| Name | Read | Provider | Rotation |
| --- | --- | --- | --- |
| `PORT` | `mcp/stellar-server.ts:4` | not a credential | Railway sets it. |
| `REAL_NEURAL_BACKEND_URL` | `mcp/stellar.ts:13` | other (URL) | Not a credential unless the URL embeds a key. UNSURE. Default is localhost. |

### 6. chrono Redis weekly backup

- Repo: `htafolla/chrono-warp-drive`. Project: UNSURE (doc says create a **new** service in this repo and do not attach it to the MCP service).
- Service name: UNSURE. The doc does not name it.
- Defined: `services/redis-weekly-backup/railway.json:5` (Dockerfile) and `:8` (`node bin/redis-weekly-backup.mjs`), cron `0 9 * * 3` (`railway.json:7`). Narrative: `docs/backups/WEEKLY-REDIS-BACKUP.md:36` and `:61`.
- Required names (`bin/redis-weekly-backup.mjs:25`):

| Name | Provider | Rotation |
| --- | --- | --- |
| `REDIS_URL` | Redis/DB | Roll the Redis password, then update this variable. Shared with blurrn-mcp if they use the same plugin. |
| `ACCESS_KEY_ID` | cloud (Railway bucket) | Railway reset bucket keys. Confirm this service has the new id. |
| `SECRET_ACCESS_KEY` | cloud (Railway bucket) | Same. The old secret should already be dead. Confirm the cron is on the new secret. |
| `BUCKET` | not a credential | Bucket name. |
| `ENDPOINT` | cloud (bucket API origin) | Update if Railway issued a new endpoint with the key reset. |
| `REGION` | not a credential | `auto` on current Railway buckets (`WEEKLY-REDIS-BACKUP.md:67`). |

### 7. muse-house

- Repo: `0xRayAI/muse-house` (public). Project: UNSURE. Code service id: `muse-house` (`src/server.mjs:23`).
- Defined: `railway.json:1` (Nixpacks, Node 20, health `/health`, start `node src/server.mjs`). `Dockerfile:7` sets `ENV PORT=3000` for the image; Railway still injects `PORT` (`src/server.mjs:25`).
- Public site: `mymuse.house` (`src/bling.mjs:34` default). This xray repo watches its GitHub deployments (`house/live-mesh/fetch_feed.py:49`).

| Name | Read | Provider | Rotation |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | `src/bling.mjs:53` | Stripe | Roll at Stripe, then update Railway. |
| `STRIPE_WEBHOOK_SECRET` | `src/bling.mjs:332` | Stripe | Roll the webhook signing secret at Stripe, then update Railway. |
| `SKILLS_REPO_TOKEN` | `src/tools.mjs:518` and `:525` | GitHub PAT (read of private `0xRayAI/muse-house-skills`; classic vs fine-grained is UNSURE) | Revoke on GitHub, then update Railway. This is an API bearer, not a container-registry credential. See the registry section. |
| `RESEND_API_KEY` | `src/feedback.mjs:110` and `src/bling.mjs:100` | other (Resend) | Roll at Resend, then update Railway. |
| `BLING_API_TOKEN` | `src/bling.mjs:153` | other (bearer this server checks) | Generate a new token and update Railway and the caller. |
| `BLING_DEV_TOKEN` | `src/bling.mjs:275` | other (bearer this server checks) | Generate a new token and update Railway. |
| `SITE_URL` | `src/bling.mjs:34` | not a credential | Public origin. |
| `BLING_TO`, `FEEDBACK_TO`, `FEEDBACK_FROM` | `src/bling.mjs:105`, `src/feedback.mjs:112` | not a credential | Mailbox addresses. |
| `OWNER_NAME` | `scripts/build-data.mjs:118` | not a credential | Build-time label. |
| `PORT` | `src/server.mjs:25` | not a credential | Railway sets it. |

### 8. clearing

- Repo: `htafolla/clearing` (public). Project: UNSURE. Service slug inferred from the host: `clearing`.
- Host: `https://clearing-production-9968.up.railway.app/` (`grok-bot/lib/seat-doctor.cjs:9`). Also `https://clearing.rippel.ai` (`seat-doctor.cjs:8`), which is a custom domain, not a second service in git.
- Defined: `railway.json:4` (Nixpacks) and `:7` (`npx tsx mcp/src/mcp-http.ts`), health `/health`. `nixpacks.toml:2` installs `ffmpeg`.
- `CLEARING_CHAIN_ID` and `CLEARING_USDC` are in `.env.example:2` and are not read by `mcp/src/config.ts` (chain and USDC are hardcoded). If they are set on Railway they are not secrets.

Secrets:

| Name | Read | Provider | Rotation |
| --- | --- | --- | --- |
| `CDP_API_KEY_ID` | `mcp/src/cdp-auth.ts:15` | other (Coinbase CDP) | Roll at Coinbase, then update Railway. Used when `CLEARING_FACILITATOR=cdp`. |
| `CDP_API_KEY_SECRET` | `mcp/src/cdp-auth.ts:16` | other (Coinbase CDP) | Same. |
| `CLEARING_8004_KEY` | `mcp/src/context.ts:145` | other (chain private key) | Create a new key, move the on-chain role, then update Railway. |
| `CLEARING_RAIL_TOKEN` | `mcp/src/facilitator.ts:315` | other (rail bearer) | Generate a new token and update Railway and the rail that checks it. |
| `ZIGZAG_RAIL_TOKEN` | `mcp/src/facilitator.ts:315` | other | Same family as `CLEARING_RAIL_TOKEN` (fallback). |
| `CLEARING_OPERATOR_TOKEN` | `mcp/src/mcp-http.ts:89` | other | Generate a new operator token and update Railway and operators. |
| `CLEARING_SESSION_TOKEN` | `mcp/src/config.ts:112` | other | Generate a new session token and update Railway. |
| `AGENT_TOOLS_VERIFY_TOKEN_RAILWAY` | `mcp/src/extract.ts:256` | other | Generate a new token and update Railway. The code also has a built-in fallback constant; rotating the env does not change that constant. UNSURE whether production relies on the env or the constant. |
| `CLEARING_RPC_URL` | `mcp/src/context.ts:146` | other (RPC URL) | Roll at the RPC provider if the URL contains a key, then update Railway. UNSURE whether it is keyed. |

Not credentials: `PORT` (`mcp/src/mcp-http.ts:16`), `RAILWAY_ENVIRONMENT` (`mcp/src/mcp-http.ts:110`), `RAILWAY_PUBLIC_DOMAIN` (`mcp/src/config.ts:98`), `NODE_ENV`, `CLEARING_PAY_TO` (address), `CLEARING_SIGNER`, `CLEARING_FACILITATOR`, `CLEARING_ALLOW_FAKE`, `CLEARING_PUBLIC_URL`, `CLEARING_PUBLIC_ORIGIN`, `CLEARING_EXTRACT_BASE_URL`, `CLEARING_EXTRACT_PORT`, `CLEARING_DATA_DIR`, `CLEARING_CHAIN` amounts and caps (`CLEARING_PER_TX_CAP_USD`, `CLEARING_SESSION_CAP_USD`, `CLEARING_DAILY_CAP_USD`, `CLEARING_CONFIRM_ABOVE_USD`, `CLEARING_EXTRACT_PRICE_USD`, `CLEARING_EXTRACT_PRICE_JS_USD`), `CLEARING_ALLOW_ORIGINS`, `CLEARING_SOAK_FROM`, `CLEARING_PROBE_TIMEOUT_MS`, `CLEARING_PROBE_INTERVAL_MS`, `CLEARING_CACHE_TTL_SEC`, `CLEARING_MAX_CHARS`, `CLEARING_FETCH_TIMEOUT_MS`, `CLEARING_DISCOVER_MIN_SETTLEMENTS_7D`, `CLEARING_SESSION_ID`, `CLEARING_HEADLESS`, `CLEARING_CONFIRM_APPROVED`, `CLEARING_OWS_INPROCESS`, `CLEARING_SIGNER_URL`, `CLEARING_ZIGZAG_URL`, `CLEARING_ZIGZAG_SETTLE_URL`, `ZIGZAG_ROOT`, `ZIGZAG_WALLET`, `OWS_WALLET`, `BLIPS_MINT_URL`, `BLIPS_NFT`, `BLIPS_NFT_ADDRESS`, `BLIPS_FOUNDRY_URL`, `BLIPS_FOUNDRY_CLI`, `BLIPS_FOUNDRY_BIN`, `CLEARING_AWAL_BIN`, `CLEARING_AWAL_PREFIX`, `CLEARING_AWAL_TIMEOUT_MS`, `CLEARING_AGENT_TOOLS_VERIFY`, `AGENT_TOOLS_VERIFY_DESCRIPTOR`, `CLEARING_LISTED_SEED`.

`ZIGZAG_ROOT` can point at a local wallet directory. On Railway that path is only a secret if the wallet files are in the image or the volume. UNSURE.

### 9. groover registry

- Repo: `htafolla/groover` (public). Project: UNSURE. Service slug inferred from the host: `registry`.
- Host: `https://registry-production-e2c4.up.railway.app/mcp` (`grok-bot/lib/seat-doctor.cjs:11`, `grok-bot/llms.txt:24`).
- Defined: `railway.json:7` (`npx tsx packages/marketplace/src/mcp-server.ts`), Nixpacks (`nixpacks.toml`). Health `/`.

| Name | Read | Provider | Rotation |
| --- | --- | --- | --- |
| `GRVR_PRIVATE_KEY` | `packages/identity/src/grvr-mint.ts:86` | other (Base minter key) | Create a new key, grant it the minter role, revoke the old key’s role, then update Railway. `grvr-mint.ts:84` says this is the only mint key; do not substitute `DEPLOYER_PRIVATE_KEY`. |
| `GRVR_RPC_URL` | `packages/identity/src/grvr-mint.ts:69` | other (RPC URL) | Roll at the RPC provider if the URL contains a key, then update Railway. UNSURE whether it is keyed. |
| `GRVR_CONTRACT` | `packages/identity/src/grvr-mint.ts:79` | not a credential | Contract address. |
| `GRVR_CHAIN_ID` | `packages/identity/src/grvr-mint.ts:68` | not a credential | Chain id. |
| `PORT` | `packages/marketplace/src/mcp-server.ts:469` | not a credential | Railway sets it. |
| `RAILWAY_ENVIRONMENT` | `packages/marketplace/src/mcp-server.ts:683` | not a credential | Railway injects it. |
| `DYNAMO_MINT_REQUIRED` | `packages/identity/src/suit-dna.ts:80` | not a credential | Flag. |

`deploy/*.ts` in that repo reads `MOLTBOOK_API_KEY`, `GROOVER_API_KEY`, `GOVERNANCE_API_KEY`, `HERMES_*`, and `DRY_RUN`. Those are worker and script env, not the registry start command. UNSURE whether any of them are also set on the registry service. If `MOLTBOOK_API_KEY` is on Railway, roll it at Moltbook and then update Railway (provider: other).

### 10. groover website (`/suit`)

- Same repo `htafolla/groover`. Project: UNSURE (may be the same project as the registry; git does not say).
- Service slug inferred from the host: `website`. Host: `https://website-production-c0da.up.railway.app/suit` (`grok-bot/lib/seat-doctor.cjs:10`, `grok-bot/llms.txt:23`).
- Defined: `website/railway.json:7` (`npx docusaurus serve --port $PORT --host 0.0.0.0`). `website/nixpacks.toml` builds with `npm run build`.
- The website tree does not read `process.env` except `PORT` in the start command. No secret name is in that service’s code. Extra dashboard variables are UNSURE.

| Name | Provider | Rotation |
| --- | --- | --- |
| `PORT` | not a credential | Railway sets it. |

### 11. 0xray-moltbook

- Repo named in git: `0xRayAI/0xray-moltbook` (`house/HOUSE.md:25`). Merge to `main` after critic PASS is the Railway auto-deploy (`house/HOUSE.md:28`, `grok-bot/ops/AUTO-REVIEW-POLICY.md:32`). No other repo in this checkout is described that way.
- Project and service: UNSURE. No `railway.json` for it is in this repo.
- This run could not read the repo (GitHub returned not found for `0xRayAI/0xray-moltbook`). Variable names below are only what this repo writes down.
- `house/WAVEBOARD.md:20` says xAI login auto-refreshes and the tokens sit on the `/data` volume, and it names `DRY_RUN` as a flag. The env var that holds the xAI credential is UNSURE. The volume copy has to be replaced even after the env var changes.

| Name | Provider | Rotation |
| --- | --- | --- |
| xAI credential (name UNSURE) | xAI | Disable the old key in the xAI Console. Then update Railway and replace the token files on the `/data` volume. |
| `DRY_RUN` | not a credential | Flag named at `house/WAVEBOARD.md:20`. |

## GitHub PATs and Railway registry credentials

Railway’s own GitHub connection tokens were invalidated on 2026-10-22 at 04:39 UTC. Reconnect GitHub on each project after that. That connection is not a PAT stored in git.

No Dockerfile in these repos pulls `ghcr.io`, and no file stores a PAT under a Railway registry-credential key. Still open each project’s registry credentials in the dashboard. Any GitHub personal access token saved there still works on GitHub until it is revoked. Projects to check, from the services above: `burst-live`, the governance project (UNSURE name), the chrono/Dynamo project (UNSURE name), muse-house (UNSURE name), clearing (UNSURE name), groover registry and website (UNSURE names), and moltbook (UNSURE name).

GitHub tokens that **are** named as Railway service variables (API use, not registry credentials):

| Name | Service | What it is | Rotation |
| --- | --- | --- | --- |
| `GITHUB_READ_TOKEN` | burst-live | Fine-grained read-only GitHub token (`house/burst/DEPLOY.md:193`). Passed to the collector as `GH_TOKEN`. | Revoke on GitHub, then update Railway. |
| `SKILLS_REPO_TOKEN` | muse-house | GitHub token with read access to `0xRayAI/muse-house-skills` (`muse-house` `src/tools.mjs:518`). UNSURE if it is also saved as a registry credential. | Revoke on GitHub, then update Railway. |

`GITHUB_APP_PRIVATE_KEY` is a GitHub App key for the box feed pass, not a PAT, and the deploy doc says it is not on the burst-live service (`house/burst/DEPLOY.md:250`).

npm tokens: not named on these services. Dashboard-only `NPM_TOKEN` / `NODE_AUTH_TOKEN` would be UNSURE and, if present, rolled at npm.

## Not a Railway service

- Dynamo UI and Turnstile (`chrono-warp-drive` `.env.example:45` and `:54`): Vercel, not Railway.
- Archive deploy guides in `docs-site/docs/archive/operations/deployment/` mention `DATABASE_URL`, `XRAY_DATABASE_URL`, and `REDIS_URL`. No `railway.json` in this repo wires those names to a service. They are not evidence of a live Railway database. UNSURE if an old project still has them.
- `src/mcps/registry.json` lists third-party MCP env names (`STRIPE_SECRET_KEY`, `GITHUB_TOKEN`, and others). That file is a catalog of other people’s servers, not a Railway service this fleet deploys.
- Seat helpers (`LIVE_URL`, `LIVE_KEY`, `SEAT_KEYS_DIR`, `LIVE_INGEST_SECRET`) run off the board host (`house/live/env.example:48`). They are not the burst-live service’s variables, except `LIVE_URL` which the server also accepts as an origin fallback (`origin.mjs:13`).
