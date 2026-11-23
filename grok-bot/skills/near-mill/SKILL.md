---
name: near-mill
description: >-
  Pay, set a spend cap, and run escrow on NEAR testnet. Creates the testnet
  account with near-seat. Does not publish the 0xray package.
---
# near-mill

Pay, set a spend cap, and run escrow on NEAR testnet. The account comes from `near-seat`. Do not `npm publish` the `0xray` package. Install from this package, `@0xray/grok-bot`.

NEAR testnet USDC is `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`. Base mainnet USDC is `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` on chain `eip155:8453`. They are two different payment choices. Do not treat the Base address as testnet.

Grok CLI, Cursor, Claude Code, and Codex run these commands. Grok Bot runs the same ones.

1. `grok-bot foundry-create --id <id> --seat <seat> --account <account>`
   Creates the foundry record and the NEAR testnet account. `--seat` is the operator id. The account key is stored under that id.
2. `grok-bot hangar-list --agent-id <id> --url <https-shop>`
   Checks that a marketplace listing exists for that https URL. It does not pay.
3. `grok-bot near-pay --receiver <account> --amount <u128> --nonce <nonce> --signer <account> --key <cold.json>`
   Sends testnet USDC with `ft_transfer`. The nonce is the memo. The receiver and the amount come from the quote. The same nonce returns the stored transaction and does not send again. A payment still in flight is kept only when the latest 25 nearblocks token rows show that USDC contract, that receiver, that amount, and that memo. A payment with no per-transaction cap is uncapped. If pay says the payment file is locked, and no pay is running, delete `.xray/state/near-rail.json.lock` and try again.
4. `grok-bot near-cap init|allow|deny|add-agent-key`
   Drives the spend vault. `init` sets `per_tx_cap`. `allow` and `deny` set who can be paid. `add-agent-key` adds a function-call key limited to `pay` and `ping`. The owner signs with the saved full-access key.
5. `grok-bot near-escrow init|open|fund|deliver|accept|refund`
   The escrow account is its own account. It is never the foundry account. `fund` locks testnet USDC. The fund message is the deal id, a nonce, and the client signature. `accept` or `refund`, then `withdraw`, is the transfer that pays the foundry or the payer. `accept` needs `--signer` and `--payout-key`.
6. `grok-bot near-1click init --ledger <file>`
   Creates a ledger for one 1 USDC spend only when that file is absent. It does not overwrite an existing file. A live quote stops if the ledger is missing or incomplete. This command does not send a deposit.
7. `grok-bot near-mailbox post|claim|submit|accept|refund|release|jobs`
   A foundry with no public website can still take a paid job. The buyer funds an escrow deal with testnet USDC, then binds that deal and the brief to the mailbox. A plain `ft_transfer_call` to the mailbox is refunded in full and does not post a job. The mailbox stores the job only when the deal buyer, the USDC token, the foundry key, and the price all match, and that deal is not already a job. Only the foundry account named when the mailbox is created can claim the job, and only that account can turn in the result. If that result is not turned in before the claim deadline, the buyer calls `refund_late` on the escrow. The mailbox records the refund only after the escrow state is Refunded, and it does not return the deposit. The payee is chosen when the mailbox is created. Accept credits the escrow creator. The mailbox does not hold the USDC. A mailbox can name `clearing-treasury-0xray.testnet` when that is the intended payee. Accept calls the escrow. `retry_settle` reads the escrow and marks the job accepted only when the deal is released and the foundry's escrow balance is zero. Accepted means the escrow released the funds and the foundry withdrew. It does not prove the payee was paid. That transfer is a separate step by the client. A read-only page of the jobs is at `https://<mailbox account>.testnet.page`. Testnet only.
8. `grok-bot near-status`
   Prints the NEAR account, foundry id, listing id, and Pay, Cap, and Escrow. An absent value is `pending`. Then it prints the owner summary from `.xray/state/seats/<seat>/near/summary.json` when that file exists: transaction ids and explorer links, amounts, keys by permission, what was verified, and what is pending. No private key and no seed phrase.

`grok-bot doctor` prints that same block and the NEAR account when one has been recorded. It also prints the Ethereum identity steps. Do not change those, and do not edit `~/.ows`.

## Mainnet

These commands stay on testnet. A mainnet contract deploy is outside this skill, and so is a mainnet transfer. Official security pages: https://docs.0xray.dev/near/reference. Other security sources: https://docs.0xray.dev/near/research.
