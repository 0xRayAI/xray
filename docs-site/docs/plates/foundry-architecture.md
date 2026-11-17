---
title: Foundry architecture
sidebar_label: Foundry architecture
plate_type: domain model
---

# Foundry architecture

The foundry is the pipe. The buyer is the edge that puts a deposit in. Grok Bot and the hangar are not stages on this spine.

```
┌────────────────────┐                               ┌────────────────────┐                               ┌────────────────────┐                               ┌────────────────────┐                               ┌────────────────────┐                               ┌────────────────────┐
│BUYER               │                               │JOB MAILBOX         │                               │NEAR ESCROW         │                               │FOUNDRY AGENT       │                               │CLEARING            │                               │FOUNDRY PAYEE       │
│NEAR testnet USDC   │    ──post_job + deposit──►    │per foundry         │           ──lock──►           │fund locks USDC     │          ──claims──►          │foundry.json        │──release on accept/timeout──► │hosted optional     │           ──pays──►           │receiver account    │
│signs deposit       │                               │post claim result   │                               │accept refund_late  │                               │near-seat identity  │                               │#41 merged          │                               │near:testnet        │
│post_job building   │                               │building            │                               │near:testnet        │                               │poll building       │                               │testnet treasury    │                               │on the record       │
└────────────────────┘                               └────────────────────┘                               └────────────────────┘                               └────────────────────┘                               └────────────────────┘                               └────────────────────┘
result ◄── <acct>.testnet.page
NOT THIS: no hand-built shop, no Railway foundry, NEAR Agent Market only as an optional second listing
```

`foundry-create` writes `.xray/state/foundry.json` with `id`, `receiver`, and `network: near:testnet` (`grok-bot/lib/foundry-create.cjs:120-129`). The receiver is the NEAR account (`:105-106`). `near-mill` sets identity to `near-seat` (`grok-bot/lib/near-mill.cjs:30`). Payments run on NEAR testnet USDC only; NEAR testnet USDC is an accepts entry (`grok-bot/lib/near-mill.cjs:6`, `:10`). NEAR escrow fund is `ft_transfer_call` (`grok-bot/lib/near-escrow.cjs:146-161`). `accept` then `withdraw` pays the creator (`:232-248`). `refund_late` pays the client after the delivery deadline (`:14-15`, `:179-183`). The escrow account is never the foundry (`:13`).

The job mailbox is not in this tree. It is tagged building: the per-foundry NEAR testnet contract (`post_job`, `get_jobs`, `claim`, `submit_result`, `web4_get`) and the status page `<acct>.testnet.page`. The lock from that mailbox into escrow is the same building work. The agent poll and claim are building. The foundry record and the `near-seat` identity are in this tree.

Hosted Clearing is optional. clearing#41 is merged. `NEAR_TESTNET_TREASURY` is `clearing-treasury-0xray.testnet` (clearing `mcp/src/facilitator-http.ts:27`).

The return rail is the status page back to the buyer.

stamped · 0xray 4.2.3
