---
name: foundry-create
description: >-
  Create the person's foundry on a fresh project: shop config plus the NEAR
  receiver from near-seat. grok-bot doctor prints the foundry id and that
  receiver.
---
# foundry-create

`grok-bot foundry-create --id <id> --seat <seat> --account <account> --wallet <0x address> --price <atomic> [--cwd dir] [--force]`

That command creates the foundry on a fresh project. It runs near-mill, which runs near-seat, then records the foundry. The same id and receiver keeps the record. A different id or receiver stops unless you pass `--force`.

`--wallet` is the person's own Base address. `--price` is the atomic USDC amount (6 decimals, so `10000` is $0.01). The command writes `shop/server.mjs`. An unpaid `GET /v1/job` returns 402 with an x402 exact accept for Base USDC paid to that wallet. `GET /health` returns 200. A paid request settles in-process through the self-settle template, and `allowPayTo` is only that wallet. `shop/railway.toml` names the start command. `shop/env.names` lists environment variable names and no values. Mainnet settlement stays off until `FOUNDRY_ALLOW_MAINNET=1`.

The record is `.xray/state/foundry.json`:

- `id` is the foundry id for this project
- `receiver` is the near-seat account
- `shop` carries the hangar step, the Groover register / mint / pin steps, the Base and NEAR testnet USDC accepts from near-mill, plus `payTo` and `price` for the paid route

`grok-bot doctor` prints `Foundry: <id> — receiver <account>`.

`mintAfterWear` stays the mill plant overlay. This step does not call it.

## Do not

Print a private key or a seed phrase. Publish the `0xray` package. Replace the Groover pin or the Open Wallet.
