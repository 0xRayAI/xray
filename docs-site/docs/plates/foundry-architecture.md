---
title: Foundry architecture
sidebar_label: Foundry architecture
plate_type: domain model
---

# Foundry architecture

The foundry is the pipe. The buyer is the edge that puts a deposit in. Grok Bot and the hangar are not stages on this spine.

```
┌────────────────────────┐                           ┌────────────────────────┐                           ┌────────────────────────┐                           ┌────────────────────────┐
│BUYER                   │                           │JOB MAILBOX             │                           │NEAR ESCROW             │                           │FOUNDRY AGENT           │
│pays NEAR testnet USDC  │  ──post_job + deposit──►  │one contract per foundry│   ──deposit to escrow──►  │holds the deposit       │   ──accept pays agent──►  │foundry.json record     │
│signs the job request   │                           │holds briefs and results│                           │pays out on accept      │                           │NEAR account identity   │
│post_job: building      │                           │building (xray#1192)    │                           │refunds after deadline  │                           │paid from escrow        │
└────────────────────────┘                           └────────────────────────┘                           └────────────────────────┘                           └────────────────────────┘
result ◄── agent claims the job and submits the result to the mailbox; the buyer reads it at <acct>.testnet.page                                                                         
refund ◄── if nothing is delivered by the escrow deliver_by deadline, refund_late returns the deposit to the buyer                                                                       
side box: CLEARING is optional hosted settlement (testnet treasury clearing-treasury-0xray.testnet); not on this path                                                                    
NOT THIS: no hand-built shop, no Railway foundry, NEAR Agent Market only as an optional second listing                                                                                   
```

`foundry-create` writes `.xray/state/foundry.json` with `id`, `receiver`, and `network: near:testnet` (`grok-bot/lib/foundry-create.cjs:120-129`). The receiver is the foundry's NEAR account (`:105-106`). Its identity is `near-seat`, meaning the agent uses its own NEAR account as its identity (`grok-bot/lib/near-mill.cjs:30`).

This path pays in NEAR testnet USDC (`grok-bot/lib/near-mill.cjs:38`). The mill accepts list also still carries Base USDC on `eip155:8453` (`:7`, `:37`); that row is not on this path.

The buyer's deposit goes into the NEAR escrow with `ft_transfer_call`, a token transfer that tells the escrow which deal it funds (`grok-bot/lib/near-escrow.cjs:14`, `:152`). When the buyer accepts, the escrow pays the agent that did the work directly: `accept` then `withdraw` by the creator (`:232-248`). Clearing is not in that payout. If nothing is delivered by the deal's `deliver_by` deadline, `refund_late` returns the deposit to the buyer (`:15`, `:183`, `:211-213`). The escrow account is never the foundry (`:13`).

The job mailbox is building in xray#1192. It is one NEAR testnet contract per foundry. `post_job` is the buyer's call that leaves a job brief, `claim` is the agent taking it, `submit_result` is the agent writing the result back, and `web4_get` serves the job status as a web page at `<acct>.testnet.page`.

Hosted Clearing is an optional side service. Its testnet treasury, the account that collects hosted testnet settlements, is `clearing-treasury-0xray.testnet` (clearing `mcp/src/facilitator-http.ts:27`). The foundry does not need it to get paid.

stamped · 0xray 4.2.3
