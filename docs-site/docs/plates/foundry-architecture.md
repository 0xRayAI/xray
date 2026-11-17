---
title: Foundry architecture
sidebar_label: Foundry architecture
plate_type: domain model
---

# Foundry architecture

The foundry, and what sits inside it. The buyer and the NEAR escrow sit outside the foundry. Clearing and the hangar listing are outside it too.

```
                                     ┌──────────────────────────────────────────────────────────────────┐                                        
                                     │ FOUNDRY                                                          │                                        
┌──────────────────┐                 │ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │                    ┌──────────────────┐
│BUYER             │                 │ │JOB MAILBOX       │  │foundry.json      │  │FOUNDRY AGENT     │ │                    │NEAR ESCROW       │
│NEAR testnet USDC │  ──bind_job──►  │ │briefs and results│  │id · receiver     │  │NEAR identity     │ │  ◄──accept pays──  │holds the deposit │
│signs bind_job    │                 │ │web4 status page  │  │near:testnet      │  │claims and submits│ │                    │pays on accept    │
│                  │                 │ └──────────────────┘  └──────────────────┘  └──────────────────┘ │                    │refunds late      │
│                  │                 │ ┌──────────────────┐  ┌──────────────────┐                       │                    │                  │
│                  │                 │ │SKILLS            │  │TOOLS             │                       │                    │                  │
└──────────────────┘                 │ │near-seat         │  │grok-bot CLI      │                       │                    └──────────────────┘
                                     │ │near-mill         │  │foundry-create    │                       │                                        
                                     │ └──────────────────┘  └──────────────────┘                       │                                        
                                     └──────────────────────────────────────────────────────────────────┘                                        
deposit ──► the buyer funds NEAR ESCROW directly, then calls bind_job on the JOB MAILBOX                                                         
result ◄── the agent claims the job and submits the result; the buyer reads it at <acct>.testnet.page                                            
refund ◄── if nothing is delivered by the deadline, refund_expired returns the deposit to the buyer                                              
outside: CLEARING is optional hosted settlement; HANGAR LISTING is pending (hangar-list)                                                         
```

**Inside the foundry.**
- **Job mailbox:** one NEAR testnet contract per foundry (`grok-bot/near/mailbox/src/lib.rs:1`). `bind_job` posts a job only after the buyer has funded the escrow (`:2`, `:299`). `claim_job` is the agent taking the job (`:150`), and `submit_result` writes the result back (`:162`). `web4_get` serves the job status as a web page at `<acct>.testnet.page` (`:389`). A plain USDC transfer to the mailbox is refunded in full and doesn't post a job (`:3`, `:122`).
- **`foundry.json`:** the foundry's record, written by `foundry-create` to `.xray/state/foundry.json` with `id`, `receiver` and `network: near:testnet` (`grok-bot/lib/foundry-create.cjs:120-129`). The receiver is the foundry's NEAR account (`:105-106`).
- **Foundry agent:** uses its own NEAR account as its identity, called `near-seat` (`grok-bot/lib/near-mill.cjs:30`). It claims jobs and submits results.
- **Skills:** the two NEAR skills `near-seat` and `near-mill` (`grok-bot/skills/near-seat/SKILL.md`, `grok-bot/skills/near-mill/SKILL.md`).
- **Tools:** the `grok-bot` command line, including `foundry-create` and `near-mailbox` (`grok-bot/bin/grok-bot.js:20`, `:56`).

**Outside the foundry.**
- **Buyer:** pays in NEAR testnet USDC (`grok-bot/lib/near-mill.cjs:38`). The buyer funds the escrow directly with `ft_transfer_call`, a token transfer that tells the escrow which deal it funds (`grok-bot/lib/near-escrow.cjs:14`, `:152`), and then calls `bind_job` on the mailbox.
- **NEAR escrow:** holds the deposit. On accept, it pays the agent directly: `accept` then `withdraw` by the creator (`grok-bot/lib/near-escrow.cjs:244-262`). If nothing is delivered by the deadline, the deposit goes back to the buyer: `refund_expired` on the mailbox (`grok-bot/near/mailbox/src/lib.rs:173`) and `refund_late` on the escrow (`grok-bot/lib/near-escrow.cjs:15`, `:195`). The escrow account is never the foundry (`:13`, `:89`).
- **Clearing:** an optional hosted settlement service. Its testnet treasury is `clearing-treasury-0xray.testnet` (clearing `mcp/src/facilitator-http.ts:27`). The foundry doesn't need it to get paid.
- **Hangar listing:** pending. `hangar-list` checks for and pins the foundry's Clearing hangar listing (`grok-bot/lib/hangar-list.cjs`, `grok-bot/bin/grok-bot.js:78`).

The mill accepts list also still carries Base USDC on `eip155:8453` (`grok-bot/lib/near-mill.cjs:7`, `:37`). That row isn't on this path.

stamped · 0xray 4.2.3
