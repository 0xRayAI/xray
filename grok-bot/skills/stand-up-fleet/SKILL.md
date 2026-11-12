---
name: stand-up-fleet
description: >-
  use this once when a fleet has no house, no board routes, and no worn
  0xray suits. One pass for the fleet. Stops before pay and hangar shops.
---

# Stand up a fleet

Run this once for the fleet. Then stop. Do not register a Groover identity, do not set up OWS pay, and do not plant hangar shops unless the owner asked for those in this turn.

Each fleet runs its own Bifrost board on Railway. Its `LIVE_URL` is that service's Railway URL.

## 1. Board

Deploy this fleet's own Bifrost on Railway by following [DEPLOY.md](https://github.com/0xRayAI/xray/blob/main/house/burst/DEPLOY.md). Deploy only with the owner's GO in this turn and their Railway login. Set every secret by name in Railway. Never write a value into a file.

When `GET /healthz` on the Railway service returns 200, `LIVE_URL` is that Railway origin (for example `https://<service>.up.railway.app`). If the owner already runs a Bifrost for this fleet, use its URL and skip the deploy. Do not point a new fleet at another fleet's board.

## 2. House

Follow [setup-house](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/setup-house/SKILL.md).

```bash
npx @0xray/grok-bot house init
```

Fill `house/HOUSE.md` from what the owner has already said. Ask only for what is missing, one question at a time. Show the filled file. Nothing in Allowed counts until the owner approves it. Paste the same Ask first and Allow lines into `house/AUTO-REVIEW.md`.

```bash
npx @0xray/grok-bot doctor
```

Doctor must pass before the next step. A line that is exactly `wallet off` skips Open Wallet, Clearing, and hangar pay. That skip stays in force below.

## 3. Routes

Every seat needs a route or the board does not wake them. The rule is [OP-PROC #routing](https://github.com/0xRayAI/xray/blob/main/grok-bot/OP-PROC.md#routing).

`bifrost init` writes `inbox-roles.json`. Each seat is one row: real GitHub login, plus nicknames as aliases. `bifrost init --check` fails a missing route and a nickname-only route. Look the login up at the board's `GET /routing` before an @-mention. Do not invent a login.

## 4. Seats

For each seat, in that seat's own chat:

1. Follow [fasten-suit-per-agent](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/fasten-suit-per-agent/SKILL.md). One project, then `npm i 0xray`, `npx 0xray wear`, `npx 0xray inspect --skip-live`. Expect `ok: true`, mill + inspect, `costume: false`.
2. That seat runs [seat-label](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/seat-label/SKILL.md). One seat does not set another seat's title.
3. Install `~/bin/gh-<seat>` from [seat-github-key](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/seat-github-key/SKILL.md). A seat with no App hands the branch and the PR body to a seat that has one.

## 5. Wake

Set `LIVE_URL` and `SEAT_KEYS_DIR` as names only. Never write a key value into a file this skill creates.

The wake commands are [WAKE-ROUTINE](https://github.com/0xRayAI/xray/blob/main/grok-bot/templates/house/fleet/WAKE-ROUTINE.md). They run `live-inbox` from the main checkout. The order after `house init` is [STATION-BOOT](https://github.com/0xRayAI/xray/blob/main/grok-bot/templates/house/STATION-BOOT.md).

Owner prompts, acks, and cloud tags stay on those two pages. Do not restate them here.

## Stop

Pay is [setup-ows-pay](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/setup-ows-pay/SKILL.md). Hangar shops are [plant-hangar-shops](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/plant-hangar-shops/SKILL.md). Open those only when the owner asked. A `wallet off` line means do not open them.
