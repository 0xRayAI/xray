---
name: near-audit
description: Use when reviewing a NEAR Rust contract before a deploy.
---

# near-audit

Phase-2 addendum to `near-contract-audit`. Do not replace that skill, the official NEAR checklist, or `near-mill` / `near-seat`.

## Receipts

- `predecessor_account_id` is who called this receipt. `signer_account_id` is the original signer. Access control uses the predecessor.
- Debit or lock before the transfer. Refund only on the failure path.
- Credit a deposit that depends on an external call only after success.
- Do not treat the transfer as successful before the callback. Do not move the debit into the callback.

## Callbacks

- Every callback is `#[private]` or asserts predecessor == current account.
- A failed promise result returns before any hold or transfer.
- A success body of the wrong type returns before any hold or transfer.
- A test names each of those two cases.
- A `require!` after a parsed value is a different branch.

## Checks

- If one global figure is compared with one pending amount, every other in-flight pending still inside that figure has to finish. A single-pending test does not close a two-pending settle. One in-flight withdraw on the whole contract is a valid fix. Do not guess that equal amounts make the shortfall safe.
- A callback-panic finding stays open until both failure cases return before a hold and a test names each one.
- One yoctoNEAR on a sensitive method is the checklist rule. nearsc NS001, in `docs/RULES.md` v0.1.2, is only an `ft_transfer` or `nft_transfer` implementation. Read that catalog before writing an NS id. Do not copy a training table of NS ids.
- `#[init]` plus a second `new` that panics is not a factory. Separate deploy and `new` transactions stay open. `#[private]` does not block a full-access key on the contract account. The deploy must not leave one. If the crate does not delete it, the finding stays partial.
- If units that never entered the receiver hook can change a settle shortfall, say whether a two-credit job sticks without those units.

## Report

For each finding record severity, file, function, what the code does, impact, and the fix. Do not write an exploit scenario, a proof-of-concept, or an attack transaction.

## Stops

Do not deploy. Do not transfer. Do not print a key, seed, or mnemonic.
