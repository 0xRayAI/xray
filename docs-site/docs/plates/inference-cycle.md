---
title: Inference cycle
sidebar_label: Inference cycle
plate_type: pipeline
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

The corpus directory is `docs/inference` (`:164`). The state directory is `.xray/inference` (`:165`). Flag off: the local matrix, and Dynamo is not called (`:406-407`, `:445-460`). `XRAY_FORCE_MCP_GOVERNANCE` forces MCP only when it is the string `true` (`:403`). A missing `enabled` also prefers MCP (`isGovernanceMcpPreferred`, `:464-468`). When that path runs, MCP `govern_proposals` is called with `require_external: true` (`:403-423`). On the CLI cycle, apply and verify run only when something was approved (`:310-323`). `govern-and-apply` calls `governExternalProposals` only (`src/mcps/orchestrator/server.ts:594-607`). That path does not apply (`inference-cycle.ts:170-216`).

stamped · 0xray 4.1.4
