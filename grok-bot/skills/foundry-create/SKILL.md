---
name: foundry-create
description: >-
  Create the person's foundry on a fresh project: shop config plus the NEAR
  receiver from near-seat. grok-bot doctor prints the foundry id and that
  receiver.
---
# foundry-create

`grok-bot foundry-create --id <id> --seat <seat> --account <account>`

That command creates the foundry on a fresh project. It runs near-mill, which runs near-seat, then records the foundry. The same id and receiver keeps the record. A different id or receiver stops unless you pass `--force`.

The record is `.xray/state/foundry.json`:

- `id` is the foundry id for this project
- `receiver` is the near-seat account
- `shop` carries the hangar step, the Groover register / mint / pin steps, and the Base and NEAR testnet USDC accepts from near-mill

`grok-bot doctor` prints `Foundry: <id> — receiver <account>`.

The command also prints an owner summary and writes `.xray/state/seats/<seat>/near/summary.json` at mode `0600`. The summary names the account, the foundry, the seat, each transaction id with a testnet explorer link, the `view_account` balance, the function-call key allowance, gas and fees when the CLI printed them, keys by permission, what was verified, and Listing, Pay, Cap, and Escrow as pending. `near-status` prints that file. No private key and no seed phrase. Every file under `~/.near-credentials` is mode `0600` and every directory there is mode `0700`.

`mintAfterWear` stays the mill plant overlay. This step does not call it.

## Do not

Print a private key or a seed phrase. Publish the `0xray` package. Replace the Groover pin or the Open Wallet.
