---
title: Inference cycle
sidebar_label: Inference cycle
---

# Inference cycle

The inference cycle turns a corpus into a proposal.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ a session corpus                                   │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ propose, then the codex votes                      │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ a governed proposal, or no change                  │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

The class is `InferenceCycle` in `src/inference/inference-cycle.ts`. The phases are collect, propose, govern, apply, deploy, and verify. Nearby files keep their own cards.

stamped · 0xray 4.1.0
