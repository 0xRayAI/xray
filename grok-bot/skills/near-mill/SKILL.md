---
name: near-mill
description: >-
  Install the mill plant with near-seat for NEAR identity and NEAR testnet
  USDC as a second payment choice beside Base USDC. Does not publish the
  0xray package.
---
# near-mill

The mill plant stays: suit, Groover register, `mint_suit`, pin, and `npx groover-hangar`. Two additions:

- `near-seat` is the NEAR testnet account.
- NEAR testnet USDC (`3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`) is a second accepts entry beside Base USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).

Install from this skill inside `@0xray/grok-bot`. Do not `npm publish` the `0xray` package.

Grok CLI, Cursor, Claude Code, and Codex run these commands. Grok Bot runs the same ones.

1. `grok-bot foundry-create --id <id> --seat <seat> --account <account>`
   Creates the foundry and runs near-seat for the NEAR testnet account.
2. `grok-bot hangar-list --agent-id <id> --url <https-shop>`
   Checks the Clearing listing for that shop. It does not pay.
3. `grok-bot near-status`
   Prints one block: NEAR account, foundry id, and listing id. An absent value is `pending`.

`grok-bot doctor` prints that same block, the NEAR account when near-seat has recorded one, and the Groover register, mint, and pin step. The Open Wallet path is unchanged.

## Pending

Pay, Cap, and Escrow are not wired. Leave them pending. Do not invent a payment, a cap, or an escrow call.
