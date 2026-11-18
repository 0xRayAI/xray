---
name: stand-up-fleet
description: >-
  use this once when a fleet has no house, no board routes, and no worn
  0xray suits. One pass for the fleet, then the NEAR path: foundry, pay,
  cap, escrow, the Grok Bot one-click, and the CLI.
---

# Stand up a fleet

Run this once for the fleet. Sections 1-5 stand the fleet up. Section 6 is the NEAR path. Do not register a Groover identity, do not set up Open Wallet pay, and do not plant hangar shops unless the owner asked for those in this turn.

Each fleet runs its own Bifrost board on Railway, in a new Railway project and service the owner names. Its `LIVE_URL` is that service's Railway URL. Never point a new fleet at another fleet's board, and never offer a shared or public board as a choice.

Every `npx` line pins the kit version. An unpinned `npx @0xray/grok-bot` can run an old cached copy.

## 1. House

Follow [setup-house](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/setup-house/SKILL.md).

```bash
npx --yes @0xray/grok-bot@0.1.18 house init
```

Fill `house/HOUSE.md` from what the owner has already said. Ask only for what is missing, one question at a time. Show the filled file. Nothing in Allowed counts until the owner approves it. Paste the same Ask first and Allow lines into `house/AUTO-REVIEW.md`.

```bash
npx --yes @0xray/grok-bot@0.1.18 doctor
```

Doctor must pass before the next step. In a house-only folder (no seat suited yet) it passes with `Plant: PASS — house only`. A line that is exactly `wallet off` skips Open Wallet, Clearing, and hangar pay. That skip stays in force below.

## 2. Routes

Every seat needs a route or the board does not wake them. The rule is [OP-PROC #routing](https://github.com/0xRayAI/xray/blob/main/grok-bot/OP-PROC.md#routing). Each seat is one row: its real GitHub login, plus nicknames as aliases. Ask the owner for each login. Do not invent one. A seat with no login yet can wait; add it later and redeploy.

The board code is the public repo [0xRayAI/bifrost](https://github.com/0xRayAI/bifrost). Its `collector/` holds the burst-live fleet's own roster and routes, so reset those files for this fleet before anything else:

```bash
git clone https://github.com/0xRayAI/bifrost.git <fleet>-bifrost && cd <fleet>-bifrost
rm collector/routing/inbox-roles.json                        # burst-live's routes
printf '{}\n' > collector/fleet-nodes.json                    # login -> seat; fill with this fleet's logins
printf '{"seats": ["<seat>", "<seat>"]}\n' > collector/fleet-roster.json
printf '{"public": false, "name": "<fleet> Bifrost"}\n' > collector/site.json
: > owner-name
npx --yes @0xray/grok-bot@0.1.18 bifrost init --seats <seat>,<seat> --logins <seat>=<login>,<seat>=<login> --yes
npx --yes @0xray/grok-bot@0.1.18 bifrost init --check --seats <seat>,<seat>
```

`bifrost init` writes `collector/routing/inbox-roles.json` and `collector/routing/seat-webhooks.json` (placeholders and env names only). `--check` fails a missing route, a nickname-only route, and a login GitHub does not know. It needs `python3`. Look a login up at the board's `GET /routing` before an @-mention.

## 3. Board

Deploy only with the owner's GO in this turn and their Railway login. Use a NEW Railway project and service with names the owner gives. Never reuse another fleet's project or service. From the `<fleet>-bifrost` folder:

```bash
railway init --name <project>
railway add --service <service>
railway service <service>
railway volume add --mount-path /data
railway up --service <service> --detach
railway domain --service <service>
```

Set the boot secrets on the service by name, in the Railway dashboard or with `railway variables --service <service> --set`: `SESSION_SECRET` and `INGEST_SECRET` (32+ characters each), `MESH_PASSWORD` (the board is gated), `APP_PUBLIC_ORIGIN` (the `https://` domain from `railway domain`), then `GITHUB_READ_TOKEN` and `SEAT_KEYS`. Never write a value into a file. The full list is [DEPLOY.md](https://github.com/0xRayAI/xray/blob/main/house/burst/DEPLOY.md).

When `GET /healthz` on that domain returns 200, `LIVE_URL` is that origin (for example `https://<service>-production.up.railway.app`). If the owner already runs a Bifrost for this fleet, use its URL and skip the deploy. A routes change means another `railway up` from the same folder, with the owner's GO.

## 4. Seats

For each seat, in that seat's own chat:

1. Follow [fasten-suit-per-agent](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/fasten-suit-per-agent/SKILL.md). One project, then `npm i 0xray`, `npx 0xray wear`, `npx 0xray validate`. Expect `✅ plant: mill + inspect fastened` and `🎉 Wear checks passed.`
2. That seat runs [seat-label](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/seat-label/SKILL.md). One seat does not set another seat's title.
3. Install `~/bin/gh-<seat>` from [seat-github-key](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/seat-github-key/SKILL.md). A seat with no App hands the branch and the PR body to a seat that has one.

## 5. Wake

Set `LIVE_URL` and `SEAT_KEYS_DIR` as names only. Never write a key value into a file this skill creates.

The wake commands are [WAKE-ROUTINE](https://github.com/0xRayAI/xray/blob/main/grok-bot/templates/house/fleet/WAKE-ROUTINE.md). They run `live-inbox` from the kit (`npx --no-install grok-bot live-inbox`), with no repo checkout. The order after `house init` is [STATION-BOOT](https://github.com/0xRayAI/xray/blob/main/grok-bot/templates/house/STATION-BOOT.md).

Owner prompts, acks, and cloud tags stay on those two pages. Do not restate them here.

## 6. NEAR path

This is the path the 0xRay Fleet Setup listing shows. Testnet only. Do not send a mainnet transaction. Do not print a private key or a seed phrase. Do not spend real money. Do not post in public.

The Grok Bot one-click and the CLI both run near-seat, then the foundry, then pay, cap, and escrow. The listing step is on the CLI when the owner already has an agent id. Otherwise `near-status` prints `Listing: pending`. That print is the NEAR account, the foundry id, the listing id, and Pay, Cap, and Escrow.

### Grok Bot one-click

The prompt is [one-click.txt](https://github.com/0xRayAI/xray/blob/main/docs-site/static/earn/one-click.txt). The page is https://docs.0xray.dev/earn and the same text is at https://docs.0xray.dev/earn/one-click.txt. Paste it into Grok Bot. It checks out main and runs foundry, pay, cap, and escrow. A new user has no agent id, so the listing stays `pending`. Do not invent an agent id. Do not run `hangar-list` on that one-click.

### CLI

Grok CLI, Cursor, Claude Code, and Codex use a checkout of main. The `npx` forms of these commands ship in the next kit publish. This pass does not publish.

```bash
git clone https://github.com/0xRayAI/xray
cd xray
npm install
node grok-bot/bin/grok-bot.js foundry-create --id <foundry-id> --seat <seat-id> --account <new-name>.testnet
node grok-bot/bin/grok-bot.js near-status
```

`foundry-create` runs near-seat, then records the foundry. Pay, cap, and escrow are the commands in [near-mill](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/near-mill/SKILL.md):

- Pay: `node grok-bot/bin/grok-bot.js near-pay`
- Cap: `node grok-bot/bin/grok-bot.js near-cap`
- Escrow: `node grok-bot/bin/grok-bot.js near-escrow` uses its own account, never the foundry.

Listing is `node grok-bot/bin/grok-bot.js hangar-list --agent-id <id> --url <https-shop>` only when the owner already has an agent id. That id is an ETH register, and the pin is a USDC payment. This path does not do either. With no agent id, `near-status` prints `Listing: pending`.

Open Wallet pay is [setup-ows-pay](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/setup-ows-pay/SKILL.md). Hangar shops are [plant-hangar-shops](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/plant-hangar-shops/SKILL.md). Open those only when the owner asked. A `wallet off` line means do not open them.
