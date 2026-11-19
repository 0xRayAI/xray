---
name: near-audit
description: Use when reviewing a NEAR Rust contract before a deploy.
---

# near-audit

Review a NEAR Rust contract before a deploy. Open every page below first. This file adds the checks those pages do not spell out. It does not replace them.

## Dependencies

Official pages. The checklist is the base pass.

| Page | Use it for |
| --- | --- |
| [Security checklist](https://docs.near.org/smart-contracts/security/checklist) | Access, storage, funds, callbacks, testing, and operations. |
| [Best practices](https://docs.near.org/smart-contracts/anatomy/best-practices) | Release builds set `overflow-checks = true`. `require!` before the action. |
| [One yoctoNEAR](https://docs.near.org/smart-contracts/security/one_yocto) | A sensitive method needs one yoctoNEAR. |
| [Balance deduction](https://docs.near.org/smart-contracts/security/cross-contract-calls/reentrancy) | Debit before a transfer. Credit a deposit only after success. |
| [Callbacks can fail](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures) | A failed callback leaves a safe state. |
| [Private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks) | `#[private]`, or the caller of this receipt is the contract itself. |
| [Storage cost attacks](https://docs.near.org/smart-contracts/security/storage) | The caller pays for state they add. |
| [Duplicate token IDs](https://docs.near.org/smart-contracts/security/duplicate-inputs) | Reject repeated ids before a payout. |
| [Front-running](https://docs.near.org/smart-contracts/security/frontrunning) | Pending actions can be copied or reordered. |
| [Sybil attacks](https://docs.near.org/smart-contracts/security/sybil) | One account is not one person. |

Other files to open.

| Dependency | Use it for |
| --- | --- |
| [near-contract-audit](https://github.com/near/agent-skills/blob/main/skills/near-contract-audit/SKILL.md) | The first pass: automated check, manual review, report. |
| [near-smart-contracts](https://github.com/near/agent-skills/blob/main/skills/near-smart-contracts/SKILL.md) | Rust contract shape: access control, private callbacks, deposits. |
| [nearsc RULES.md](https://github.com/vinibarbosabr/nearsc-auditor/blob/main/docs/RULES.md) | Rule ids. v0.1.2 NS001 is only a missing yocto on an `ft_transfer` or `nft_transfer` implementation. |
| [NEAR reference](https://docs.0xray.dev/near/reference) | The same official pages, collected. |
| [Security sources](https://docs.0xray.dev/near/research) | Courses, scanners, and articles. Not official pages. |
| [near-mill](../near-mill/SKILL.md) | Pay, the spend cap, and escrow. This review does not run those commands. |
| [near-seat](../near-seat/SKILL.md) | Create the NEAR testnet account. This review does not create one. |

## Receipts

The balance rule is the [balance deduction](https://docs.near.org/smart-contracts/security/cross-contract-calls/reentrancy) page.

- `predecessor_account_id` is who called this receipt. `signer_account_id` is the original signer. Access control uses the caller of this receipt.
- Debit or lock before the transfer. Refund only on the failure path.
- Credit a deposit that depends on an external call only after success.
- Do not treat the transfer as successful before the callback. Do not move the debit into the callback.

## Callbacks

Follow [callbacks can fail](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures) and [private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks).

- Every callback is `#[private]` or asserts that the caller of this receipt is the contract itself.
- A failed promise result returns before any hold or transfer.
- A success body of the wrong type returns before any hold or transfer.
- A test names each of those two cases.
- A `require!` after a parsed value is a different branch.

## Checks

- If one global figure is compared with one pending amount, every other pending withdrawal still inside that figure has to finish. A test with one pending withdrawal does not prove a settle that can have two. One in-flight withdraw on the whole contract is a valid fix. Do not assume that equal amounts make the shortfall safe.
- Do not call a callback safe until both failure cases return before a hold, and a test names each case.
- One yoctoNEAR on a sensitive method is the [checklist rule](https://docs.near.org/smart-contracts/security/one_yocto). It is not NS001. Read [RULES.md](https://github.com/vinibarbosabr/nearsc-auditor/blob/main/docs/RULES.md) before writing a rule id. Do not invent an NS id.
- State a caller adds is charged to that caller. Growth the contract pays for is still an issue. See [storage](https://docs.near.org/smart-contracts/security/storage).
- A second call to `new` that panics does not make this a factory contract. Deploy and `new` in separate transactions is still an issue. `#[private]` does not stop a full-access key on the contract account. The deploy must not leave one. If the code does not delete that key, say so.
- If tokens that arrived by a plain transfer, and never through the deposit hook, can change a shortfall, say whether a second withdrawal can finish without those tokens.

## Report

For each issue record severity, file, function, what the code does, impact, and the fix. Name the page above that covers it. Do not write an exploit scenario, a proof-of-concept, or an attack transaction.

## Stops

Do not deploy. Do not transfer. Do not print a key, seed, or mnemonic.
