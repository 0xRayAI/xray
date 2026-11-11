---
name: stand-up-fleet
description: >-
  use this once when a fleet has no house, no board routes, and no worn
  0xray suits. One pass for the fleet. Stops before pay and hangar shops.
---

# Stand up a fleet

Run this once for the fleet. Then stop. Do not register a Groover identity, do not set up OWS pay, and do not plant hangar shops unless the owner asked for those in this turn.

The kit does not start a Bifrost server. A fleet uses the public board, or a board someone already deployed.

## 1. Board

Ask which board this fleet uses.

- Public board: `LIVE_URL` is `https://bifrost.0xray.dev`.
- Their own board: follow [house/burst/DEPLOY.md](../../../house/burst/DEPLOY.md). That page starts `house/live/app`. When the health check answers, `LIVE_URL` is that origin. Do not deploy it from this skill.

## 2. House

Follow [setup-house](../setup-house/SKILL.md).

```bash
npx @0xray/grok-bot house init
```

Fill `house/HOUSE.md` from what the owner has already said. Ask only for what is missing, one question at a time. Show the filled file. Nothing in Allowed counts until the owner approves it. Paste the same Ask first and Allow lines into `house/AUTO-REVIEW.md`.

```bash
npx @0xray/grok-bot doctor
```

Doctor must pass before the next step. A line that is exactly `wallet off` skips Open Wallet, Clearing, and hangar pay. That skip stays in force below.

## 3. Routes

Every seat needs a route or the board does not wake them. The rule is [OP-PROC #routing](../../OP-PROC.md#routing).

`bifrost init` writes `inbox-roles.json`. Each seat is one row: real GitHub login, plus nicknames as aliases. `bifrost init --check` fails a missing route and a nickname-only route. Look the login up at the board's `GET /routing` before an @-mention. Do not invent a login.

## 4. Seats

For each seat, in that seat's own chat:

1. Follow [fasten-suit-per-agent](../fasten-suit-per-agent/SKILL.md). One project, then `npm i 0xray`, `npx 0xray wear`, `npx 0xray inspect --skip-live`. Expect `ok: true`, mill + inspect, `costume: false`.
2. That seat runs [seat-label](../seat-label/SKILL.md). One seat does not set another seat's title.
3. Install `~/bin/gh-<seat>` from [seat-github-key](../seat-github-key/SKILL.md). A seat with no App hands the branch and the PR body to a seat that has one.

## 5. Wake

Set `LIVE_URL` and `SEAT_KEYS_DIR` as names only. Never write a key value into a file this skill creates.

The wake commands are [WAKE-ROUTINE](../../templates/house/fleet/WAKE-ROUTINE.md). They run `live-inbox` from the main checkout. The order after `house init` is [STATION-BOOT](../../templates/house/STATION-BOOT.md).

Owner prompts, acks, and cloud tags stay on those two pages. Do not restate them here.

## Stop

Pay is [setup-ows-pay](../setup-ows-pay/SKILL.md). Hangar shops are [plant-hangar-shops](../plant-hangar-shops/SKILL.md). Open those only when the owner asked. A `wallet off` line means do not open them.
