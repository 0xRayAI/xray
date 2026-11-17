---
title: Foundry architecture
sidebar_label: Foundry architecture
plate_type: domain model
---

# Foundry architecture

The person wears Grok Bot. The foundry record is what that bot writes. Hangar lists it. NEAR pay moves testnet USDC. The lower row is open work, not on main.

```
┌──────────────────────┐           ┌──────────────────────┐           ┌──────────────────────┐           ┌──────────────────────┐
│GROK BOT              │           │FOUNDRY               │           │HANGAR                │           │NEAR PAY              │
│user wears it         │  records  │--id --seat           │   lists   │register mint pin     │   pays    │testnet USDC only     │
│grok-bot.js           │           │--account             │           │GET /v1/pin 402       │           │near-pay.cjs          │
│on main               │           │foundry.json          │           │Clearing USDC         │           │memo is nonce         │
└──────────────────────┘           └──────────────────────┘           └──────────────────────┘           └──────────────────────┘
draft joins sit under the shipped pipe                                                                                           
┌──────────────────────┐           ┌──────────────────────┐           ┌──────────────────────┐           ┌──────────────────────┐
│SHOP DRAFT            │           │BASE DRAFT            │           │RELAY DRAFT           │           │DYNAMO DRAFT          │
│--wallet --price      │  embeds   │self-settle           │  relays   │testnet treasury      │   cites   │0.01 persist          │
│shop/server.mjs       │           │own wallet            │           │mainnet empty         │           │not in this tree      │
│xray#1189 open        │           │clearing#40           │           │clearing#41           │           │PASS cite only        │
└──────────────────────┘           └──────────────────────┘           └──────────────────────┘           └──────────────────────┘
refused                                                                                                                          
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│NOT THIS                                                                                                                       │
│no hand-built shop                                                                                                             │
│no Railway foundry per agent                                                                                                   │
│NEAR Agent Market is an optional second listing                                                                                │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Shipped, on main. `foundry-create` takes `--id`, `--seat`, and `--account` (`grok-bot/lib/foundry-create.cjs:13`, parse at `:174`). It runs near-mill and writes `.xray/state/foundry.json` (`:120-130`). near-mill writes `near-mill.json` with Groover steps `register`, `mint_suit`, `pin`, hangar `npx groover-hangar`, and accepts for Base USDC plus NEAR testnet USDC (`grok-bot/lib/near-mill.cjs:28-39`). `hangar-list` reads that record and pays a Clearing pin: unpaid `GET /v1/pin` is 402, then `PAYMENT-SIGNATURE` (`grok-bot/lib/hangar-list.cjs:86-96`). ZigZag is the Base USDC settle named in `grok-bot/AGENTS.md:46`. `near-pay` sends testnet USDC and refuses any other network (`grok-bot/lib/near-tx.cjs:102-104`, called from `near-pay.cjs`). The memo is the quote nonce (`near-pay.cjs:18`). Groover register, `mint_suit`, and ERC-8004 pin are the skill steps (`grok-bot/skills/groover-factory-parity/SKILL.md:16-22`). A live mint needs a Dynamo PASS citation (`SKILL.md:18`). That citation is not a priced persist.

Draft, open PRs, not on this main. `foundry-create --wallet --price` writing `shop/server.mjs`, unpaid `GET /v1/job` 402 x402 exact, and `/health` are xray#1189 (open) on top of xray#1187 (open). Embedded Clearing self-settle to the foundry's own Base wallet is clearing#40 (open) plus `grok-bot/templates/foundry/self-settle.mjs` in #1187. Hosted NEAR relay, payee and relay-gas account `clearing-treasury-0xray.testnet`, and empty `near:mainnet` lists that fail closed, are clearing#41 (open). A paid 0.01 USDC Dynamo persist is not a call in this tree.

Not this. The mill eval keeps NEAR Agent Market as an optional later listing (`house/dist/mill/near-first-build-eval-2026-11.md:147`). xray#1189 says the shop is not deployed. `foundry-create` is the writer of the record; this main does not add a hand-built shop file.

stamped · 0xray 4.2.3
