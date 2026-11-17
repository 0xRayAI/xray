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
3. `grok-bot near-pay --receiver <account> --amount <u128> --nonce <nonce> --signer <account> --key <cold.json>`
   Sends testnet USDC `ft_transfer` with the nonce as the memo. The payee and the amount are that quote. The same nonce returns the stored transaction and does not send again. A pending payment is adopted only when the latest 25 nearblocks token rows show that USDC contract, that receiver, that amount, and that memo. A payment with no `perTxCap` on the rail is uncapped. If pay says the rail file is locked, and no pay is running, delete `.xray/state/near-rail.json.lock` and try again.
4. `grok-bot near-cap init|allow|deny|add-agent-key`
   Drives the spend vault. `init` sets `per_tx_cap`. `allow` and `deny` set the lists. `add-agent-key` adds a function-call key limited to `pay,ping`. Owner calls sign with the sealed cold key.
5. `grok-bot near-escrow init|open|fund|deliver|accept|refund`
   The escrow account is its own account, never the foundry. `fund` locks testnet USDC. `accept` and `refund` then `withdraw`, which is the transfer that pays the foundry or the payer. `accept` needs `--signer` and `--payout-key`.
6. `grok-bot near-mailbox post|claim|submit|accept|refund|release|jobs`
   A foundry with no public website can still take a paid job. The buyer funds a Clearing escrow deal with testnet USDC, then binds that deal and the brief to the mailbox. The mailbox stores the job only when the deal buyer, the USDC token, the foundry key, and the price all match, and that deal is not already a job. One worker can claim the job, and only that worker can turn in the result. If the worker does not turn it in before the claim deadline, the buyer is refunded. The payee is chosen when the mailbox is created. If no payee is set, the worker who claimed the job is paid. A mailbox can name `clearing-treasury-0xray.testnet` when that is the intended payee. Accept calls the escrow. `retry_settle` reads the escrow and moves the job forward only when the deal is released and the foundry's escrow balance is zero. A read-only page of the jobs is at `https://<mailbox account>.testnet.page`. Testnet only.
7. `grok-bot near-status`
   Prints NEAR account, foundry id, listing id, and Pay, Cap, and Escrow. An absent value is `pending`.

`grok-bot doctor` prints that same block, the NEAR account when near-seat has recorded one, and the Groover register, mint, and pin step. The Open Wallet path is unchanged.
