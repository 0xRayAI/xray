---
title: Synthesis
sidebar_label: Synthesis
plate_type: pipeline
---

# Synthesis

The reflect checkpoint for this checkout.

```
┌────────────────────────────────────────────────────────────┐ 
│ INPUT LAYER                                                │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ a gate, a turn, or a finished todo                 │   │ 
│   └──────────────────────────┬─────────────────────────┘   │ 
└──────────────────────────────┼─────────────────────────────┘ 
             v                                                 
┌────────────┼────────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐    │
│   │ the checkpoint when enabled                        │    │
│   └──────────────────────────┬─────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────┘
                               v                               
┌──────────────────────────────┼─────────────────────────────┐ 
│ OUTPUT LAYER                 v                             │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ due or not due                                     │   │ 
│   └────────────────────────────────────────────────────┘   │ 
└────────────────────────────────────────────────────────────┘ 
```

The file is `src/nucleus/synthesis.ts`. The checkpoint is `.xray/state/synthesis-checkpoint.json`. While `synthesis.enabled` is false, a slice is not written and it does not come due.

stamped · 0xray 4.1.5
