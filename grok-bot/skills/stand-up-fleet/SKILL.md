---
name: stand-up-fleet
description: >-
  use this once when a fleet has no house, no board routes, and no worn
  0xray suits. One pass for the fleet, then the NEAR path: foundry, pay,
  cap, escrow, the Grok Bot one-click, and the CLI.
---

# Stand up a fleet

The kit names are `stand-up-fleet` (this file) and `setup-house`. Marketplace names `fleet-stand-up` and `fleet-getting-started` are not files in this package. If a catalog points at those names and the file is missing, use these two. The marketplace template is updated separately.

Run this once for the fleet. Sections 1-6 stand the fleet up. Section 7 is the NEAR path. Do not register a Groover identity, do not set up Open Wallet pay, and do not plant hangar shops unless the owner asked for those in this turn.

Each fleet runs its own Bifrost board on Railway, in a Railway project and service the owner names. Its `LIVE_URL` is that service's Railway URL. Never point a new fleet at another fleet's board, and never offer a shared or public board as a choice. Section 3 checks the signed-in account and an existing project name before `railway init`.

Every `npx` line pins the kit version. An unpinned `npx @0xray/grok-bot` can run an old cached copy.

## 1. House

Follow [setup-house](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/setup-house/SKILL.md).

```bash
npx --yes @0xray/grok-bot@0.1.20 house init
```

Fill `house/HOUSE.md` before the first doctor run. Ask only for what is missing, one question at a time. The six lines doctor checks are Owner, Seats, Public voice, Allowed, Ask first, and Board. A line that starts with `(example)` fails doctor. Offer these defaults and wait for the owner to accept them:

- Public voice: `none`
- Allowed: `None yet. Repos are named when the owner picks them.`
- Ask first: `package publish, production deploy, payments, secrets, and deletes`
- Board: `the team's Bifrost board once live, and house/WAVEBOARD.md until then.`

Owner and Seats have no default. Use the owner's name and the seat names they already gave. Do not invent a seat. Show the filled file. Nothing in Allowed counts until the owner approves it. Paste the same Ask first and Allow lines into `house/AUTO-REVIEW.md`.

`house init` does not copy `templates/house/EXAMPLE.md`. Doctor still fails with `house/EXAMPLE.md exists — delete it` if that file is in `house/`. Do not copy it in. The template link in `OP-PROC.md` stays a template-only illustration.

```bash
npx --yes @0xray/grok-bot@0.1.20 doctor
```

Doctor must pass before the next step. In a house-only folder (no seat suited yet) it passes with `Plant: PASS — house only`. A line that is exactly `wallet off` skips Open Wallet, Clearing, and hangar pay. That skip stays in force below.

## 2. Routes

Every seat needs a route or the board does not wake them. The rule is [OP-PROC #routing](https://github.com/0xRayAI/xray/blob/main/grok-bot/OP-PROC.md#routing). Each seat is one row: its real GitHub login, plus nicknames as aliases. Ask the owner for each login. Do not invent one. A seat with no login yet can wait; add it later and redeploy.

Create the GitHub App(s) before those logins are real. The owner page is [github-app-setup.md](github-app-setup.md). It covers one App per writing seat, the permissions this repo documents, where the PEM and `~/bin/gh-<seat>` live, and what `GITHUB_READ_TOKEN`, `SEAT_KEYS`, and `LIVE_GH_SEATS` contain. Do not print a PEM, a token, or a seat key.

The board code is the public repo [0xRayAI/bifrost](https://github.com/0xRayAI/bifrost). Its `collector/` holds the burst-live fleet's own roster and routes, so reset those files for this fleet before anything else:

```bash
git clone https://github.com/0xRayAI/bifrost.git <fleet>-bifrost && cd <fleet>-bifrost
rm collector/routing/inbox-roles.json                        # burst-live's routes
printf '{}\n' > collector/fleet-nodes.json                    # login -> seat; fill with this fleet's logins
printf '{"seats": ["<seat>", "<seat>"]}\n' > collector/fleet-roster.json
printf '{"public": false, "name": "<fleet> Bifrost"}\n' > collector/site.json
: > owner-name
npx --yes @0xray/grok-bot@0.1.20 bifrost init --seats <seat>,<seat> --logins <seat>=<login>,<seat>=<login> --yes
npx --yes @0xray/grok-bot@0.1.20 bifrost init --check --seats <seat>,<seat>
```

`bifrost init` writes `collector/routing/inbox-roles.json` and `collector/routing/seat-webhooks.json` (placeholders and env names only). `--check` fails a missing route, a nickname-only route, and a login GitHub does not know. It needs `python3`. Look a login up at the board's `GET /routing` before an @-mention.

## 3. Board

Deploy only with the owner's GO in this turn. Never reuse another fleet's project or service. From the `<fleet>-bifrost` folder, before `railway init`:

1. Run `railway whoami`. Show the owner the account and the workspace it prints. Stop until they confirm it is the account they want. If it is not, they sign in again and you show `railway whoami` again. Do not init on an unconfirmed account. If the output includes a token, show only the account and the workspace.
2. Run `railway project list`. If a project already has the name the owner chose, show that row and ask: reuse it, pick another name, or leave the old project and create another. Do not create a second project with the same name unless they choose that.

```bash
railway whoami
railway project list
railway init --name <project>
railway add --service <service>
railway service <service>
railway volume add --mount-path /data
railway up --service <service> --detach
railway domain --service <service>
```

Set these on the service before the first deploy that should wake seats. Names only in chat. `LIVE_SEAT_IDS` is this fleet's seat ids, comma-separated. `builder` and `builder-cloud` stay on the list even when `LIVE_SEAT_IDS` is set. Unset, the server keeps `arch1`, `forge`, `critic`, `blinky`, `herald`, `nibbler`, `sound`, `magnet`, `near`, and `mill` (`house/live/app/server.mjs`). `LIVE_OWNER` is the owner name (letters, digits, space, and `._:@#+/-`, at most 40 characters). `STATION_NUDGE` is `on` to post the weekday station nudge, or `off` to stay quiet. Unset still posts when `RAILWAY_ENVIRONMENT` is set and `PORT` is not `0`, so set it explicitly.

`SESSION_SECRET` and `INGEST_SECRET` are 32 characters or more. `APP_PUBLIC_ORIGIN` is the `https://` domain from `railway domain`. Then `GITHUB_READ_TOKEN`, `SEAT_KEYS`, and `LIVE_GH_SEATS` from [github-app-setup.md](github-app-setup.md). The full list is [DEPLOY.md](https://github.com/0xRayAI/xray/blob/main/house/burst/DEPLOY.md).

### MESH_PASSWORD

The board is gated. The owner chooses `MESH_PASSWORD`. Preferred: they set it themselves with a masked prompt in their own terminal, or in the Railway Variables tab for this service, and they tell you only that it is set. Do not generate a password and paste it. Do not put the value in chat, a tool command, a log, or a file. Do not ask them to repeat it. Confirm they can open the board, not what the password is.

`GET /healthz` needs no password. It does not list this fleet's seats. In gated mode the page, `/site-config.js`, `/live-config.js`, and `/live.js` return the login page until a session exists (`house/live/app/server.mjs`). Do not send `MESH_PASSWORD` to a scrape or a log to read those files. The owner confirms the seat layout after they sign in. An unauthenticated seat list on `/healthz` is a board change in the bifrost repo, not this kit.

When `GET /healthz` on that domain returns 200, `LIVE_URL` is that origin (for example `https://<service>-production.up.railway.app`). If the owner already runs a Bifrost for this fleet, use its URL and skip the deploy. A routes change means another `railway up` from the same folder, with the owner's GO.

## 4. Create the seat bots

The house and the board do not create Grok Bot chats. Before section 5, the owner adds one bot per seat, using the same seat id `bifrost init` wrote. **Unconfirmed:** the product's button labels. This kit does not ship that screen. What it requires is a separate chat per seat.

Suit, label, and `gh-<seat>` run in that seat's own chat. They do not run in the owner's setup chat.

## 5. Seats

For each seat, in that seat's own chat:

1. Follow [fasten-suit-per-agent](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/fasten-suit-per-agent/SKILL.md). One project, then `npm i 0xray`, `npx 0xray wear`, `npx 0xray validate`. Expect `✅ plant: mill + inspect fastened` and `🎉 Wear checks passed.`
2. That seat runs [seat-label](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/seat-label/SKILL.md). One seat does not set another seat's title.
3. Install `~/bin/gh-<seat>` from [seat-github-key](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/seat-github-key/SKILL.md) and [github-app-setup.md](github-app-setup.md). A seat with no App hands the branch and the PR body to a seat that has one.

## 6. Wake

Set `LIVE_URL` and `SEAT_KEYS_DIR` as names only. Never write a key value into a file this skill creates.

The wake commands are [WAKE-ROUTINE](https://github.com/0xRayAI/xray/blob/main/grok-bot/templates/house/fleet/WAKE-ROUTINE.md). They run `live-inbox` from the kit (`npx --no-install grok-bot live-inbox`), with no repo checkout. The order after `house init` is [STATION-BOOT](https://github.com/0xRayAI/xray/blob/main/grok-bot/templates/house/STATION-BOOT.md).

Owner prompts, acks, and cloud tags stay on those two pages. Do not restate them here.

## 7. NEAR path

This is the path the 0xRay Fleet Setup listing shows. Testnet only. Do not send a mainnet transaction. Do not print a private key or a seed phrase. Do not spend real money. Do not post in public.

The Grok Bot one-click and the CLI run near-seat, then the foundry, then `near-status`. Pay, cap, and escrow are the later commands in near-mill. That one-click does not run them and does not pass amounts. The listing step is on the CLI when the owner already has an agent id. Otherwise `near-status` prints `Listing: pending`. That print is the NEAR account, the foundry id, the listing id, Pay, Cap, and Escrow, then the owner summary from `.xray/state/seats/<seat>/near/summary.json`. No private key and no seed phrase.

### Grok Bot one-click

The prompt is [one-click.txt](https://github.com/0xRayAI/xray/blob/main/docs-site/static/earn/one-click.txt). The page is https://docs.0xray.dev/earn and the same text is at https://docs.0xray.dev/earn/one-click.txt. Paste it into Grok Bot. It checks out main, runs `foundry-create`, then `near-status`. It names pay, cap, and escrow and does not run them. A new user has no agent id, so the listing stays `pending`. Do not invent an agent id. Do not run `hangar-list` on that one-click. Pass `--seat` a short name for this machine. Do not copy a name out of this repository.

### CLI

Grok CLI, Cursor, Claude Code, and Codex run the installed kit. A checkout of main runs the same commands from the files in that checkout. Testnet only.

```bash
npx --yes @0xray/grok-bot@0.1.20 foundry-create --id <foundry-id> --seat <seat-id> --account <new-name>.testnet
npx --yes @0xray/grok-bot@0.1.20 near-status
```

```bash
git clone https://github.com/0xRayAI/xray
cd xray
npm install
node grok-bot/bin/grok-bot.js foundry-create --id <foundry-id> --seat <seat-id> --account <new-name>.testnet
node grok-bot/bin/grok-bot.js near-status
```

`foundry-create` runs near-seat, then records the foundry. It prints an owner summary: account, foundry, seat, each transaction id with a testnet explorer link, the balance `view_account` returned, the function-call key allowance, gas and fees when the CLI printed them, keys by permission, what was verified, and Listing, Pay, Cap, and Escrow as pending. The same summary is written to `.xray/state/seats/<seat>/near/summary.json` at mode `0600`. `near-status` prints that record and overlays Listing, Pay, Cap, and Escrow from the foundry and `.xray/state/near-rail.json`. It does not print a private key or a seed phrase. After `foundry-create`, every file under `~/.near-credentials` is mode `0600` and every directory there is mode `0700`. Those CLI copies are not deleted unless the owner asks.

Pay, cap, and escrow are the commands in [near-mill](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/near-mill/SKILL.md). The one-click does not run them.

- Pay: `npx --yes @0xray/grok-bot@0.1.20 near-pay`
- Cap: `npx --yes @0xray/grok-bot@0.1.20 near-cap`
- Escrow: `npx --yes @0xray/grok-bot@0.1.20 near-escrow` uses its own account, never the foundry.

Listing is `npx --yes @0xray/grok-bot@0.1.20 hangar-list --agent-id <id> --url <https-shop>` only when the owner already has an agent id. That id is an ETH register, and the pin is a USDC payment. This path does not do either. With no agent id, `near-status` prints `Listing: pending`.

Open Wallet pay is [setup-ows-pay](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/setup-ows-pay/SKILL.md). Hangar shops are [plant-hangar-shops](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/plant-hangar-shops/SKILL.md). Open those only when the owner asked. A `wallet off` line means do not open them.
