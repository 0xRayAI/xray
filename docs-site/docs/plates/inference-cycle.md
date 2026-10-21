---
title: Inference cycle
sidebar_label: Inference cycle
---

# Inference cycle

`InferenceCycle` (`src/inference/inference-cycle.ts:129`) walks six phases, then `complete` or `failed` (`:53-62`). The shipped flag leaves Dynamo off.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ a session corpus                                     │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v
┌──────────────────────────────┼───────────────────────────────┐
│ PROCESSING LAYER             v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ collecting                                           │   │
│   │ proposing                                            │   │
│   │ governing                                            │   │
│   │ applying                                             │   │
│   │ deploying                                            │   │
│   │ verifying                                            │   │
│   └──────────────────────────┬───────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────┘
                               v
┌──────────────────────────────┼───────────────────────────────┐
│ OUTPUT LAYER                 v                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ a vote                                               │   │
│   │ CLI apply and verify only when approved              │   │
│   └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

The corpus directory is `docs/inference` (`:164`). The state directory is `.xray/inference` (`:165`). Flag off: the local matrix, and Dynamo is not called (`:406-407`, `:445-460`). Flag on, or `XRAY_FORCE_MCP_GOVERNANCE` set: MCP `govern_proposals` with `require_external: true` (`:403-423`). The flag read is `isGovernanceMcpPreferred` (`:464-468`). On the CLI cycle, apply and verify run only when something was approved (`:310-318`). `govern-and-apply` calls `governExternalProposals` only (`src/mcps/orchestrator/server.ts:594-607`). That path does not apply (`inference-cycle.ts:170-216`).

stamped · 0xray 4.1.3
