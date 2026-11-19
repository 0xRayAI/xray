---
name: near-audit
description: Use when reviewing a NEAR Rust contract before a deploy.
---

# near-audit

Phase-2 addendum. Open every dependency below before a finding. This file does not replace those pages.

## Dependencies

Official pages. The checklist is the base pass.

| Page | Use it for |
| --- | --- |
| [Security checklist](https://docs.near.org/smart-contracts/security/checklist) | Access, storage, funds, callbacks, testing, and operations. |
| [Best practices](https://docs.near.org/smart-contracts/anatomy/best-practices) | Release builds set `overflow-checks = true`. `require!` before the action. |
| [One yoctoNEAR](https://docs.near.org/smart-contracts/security/one_yocto) | A sensitive method needs one yoctoNEAR. |
| [Balance deduction](https://docs.near.org/smart-contracts/security/cross-contract-calls/reentrancy) | Debit before a transfer. Credit a deposit only after success. |
| [Callbacks can fail](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures) | A failed callback leaves a safe state. |
| [Private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks) | `#[private]`, or predecessor equals the current account. |
| [Storage cost attacks](https://docs.near.org/smart-contracts/security/storage) | The caller pays for state they add. |
| [Duplicate token IDs](https://docs.near.org/smart-contracts/security/duplicate-inputs) | Reject repeated ids before a payout. |
| [Front-running](https://docs.near.org/smart-contracts/security/frontrunning) | Pending actions can be copied or reordered. |
| [Sybil attacks](https://docs.near.org/smart-contracts/security/sybil) | One account is not one person. |

Skills and catalogs. Read the catalog before writing an NS id.

| Dependency | Use it for |
| --- | --- |
| [near-contract-audit](https://github.com/near/agent-skills/blob/main/skills/near-contract-audit/SKILL.md) | The predecessor pass: automated check, manual review, report. |
| [near-smart-contracts](https://github.com/near/agent-skills/blob/main/skills/near-smart-contracts/SKILL.md) | Rust contract shape: access control, private callbacks, deposits. |
| [nearsc RULES.md](https://github.com/vinibarbosabr/nearsc-auditor/blob/main/docs/RULES.md) | NS ids. v0.1.2 NS001 is only a missing yocto on an `ft_transfer` or `nft_transfer` implementation. |
| [NEAR reference](https://docs.0xray.dev/near/reference) | The same official pages, collected. |
| [Security sources](https://docs.0xray.dev/near/research) | Courses, scanners, and articles. Not official pages. |
| [near-mill](../near-mill/SKILL.md) | Pay, cap, and escrow commands. This skill does not run them. |
| [near-seat](../near-seat/SKILL.md) | A testnet account for a signer. This skill does not create one. |

## Receipts

The balance rule is the [balance deduction](https://docs.near.org/smart-contracts/security/cross-contract-calls/reentrancy) page.

- `predecessor_account_id` is who called this receipt. `signer_account_id` is the original signer. Access control uses the predecessor.
- Debit or lock before the transfer. Refund only on the failure path.
- Credit a deposit that depends on an external call only after success.
- Do not treat the transfer as successful before the callback. Do not move the debit into the callback.

## Callbacks

Follow [callbacks can fail](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures) and [private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks).

- Every callback is `#[private]` or asserts predecessor == current account.
- A failed promise result returns before any hold or transfer.
- A success body of the wrong type returns before any hold or transfer.
- A test names each of those two cases.
- A `require!` after a parsed value is a different branch.

## Checks

- If one global figure is compared with one pending amount, every other in-flight pending still inside that figure has to finish. A single-pending test does not close a two-pending settle. One in-flight withdraw on the whole contract is a valid fix. Do not guess that equal amounts make the shortfall safe.
- A callback-panic finding stays open until both failure cases return before a hold and a test names each one.
- One yoctoNEAR on a sensitive method is the [checklist rule](https://docs.near.org/smart-contracts/security/one_yocto). It is not NS001. Read [RULES.md](https://github.com/vinibarbosabr/nearsc-auditor/blob/main/docs/RULES.md) before writing an NS id. Do not copy a training table of NS ids.
- State a caller adds is charged to that caller. Growth the contract pays for stays a finding. See [storage](https://docs.near.org/smart-contracts/security/storage).
- `#[init]` plus a second `new` that panics is not a factory. Separate deploy and `new` transactions stay open. `#[private]` does not block a full-access key on the contract account. The deploy must not leave one. If the crate does not delete it, the finding stays partial.
- If units that never entered the receiver hook can change a settle shortfall, say whether a two-credit job sticks without those units.

## Report

For each finding record severity, file, function, what the code does, impact, and the fix. Name the dependency row that covers it. Do not write an exploit scenario, a proof-of-concept, or an attack transaction.

## Stops

Do not deploy. Do not transfer. Do not print a key, seed, or mnemonic.
