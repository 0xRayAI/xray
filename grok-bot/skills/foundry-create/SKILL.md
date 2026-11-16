---
name: foundry-create
description: >-
  Create the person's foundry on a fresh project: shop config plus the NEAR
  receiver from near-seat. grok-bot doctor prints the foundry id and that
  receiver.
---
# foundry-create

One step on a fresh project. It runs near-mill, which runs near-seat, then records the foundry.

The record is `.xray/state/foundry.json`:

- `id` is the foundry id for this project
- `receiver` is the near-seat account
- `shop` carries the hangar step, the Groover register / mint / pin steps, and the Base and NEAR testnet USDC accepts from near-mill

`grok-bot doctor` prints `Foundry: <id> — receiver <account>`.

`mintAfterWear` stays the mill plant overlay. This step does not call it.

## Do not

Print a private key or a seed phrase. Publish the `0xray` package. Replace the Groover pin or the Open Wallet.
