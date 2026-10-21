---
title: Trail state
sidebar_label: Trail state
---

# Trail state

The suit writes its trail under .xray.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ a wake starts                                      │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the suit writes state                              │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ state under .xray                                  │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

Session boot and the station card are state. `.xray/state/LENS.md` is the plane cards. A named plane whose Entry and Exit are missing is written there, and later passes read that card. Commit `.xray/state/LENS.md`. Do not commit the rest of `.xray/state`.

stamped · 0xray 4.1.3
