---
title: Station card
sidebar_label: Station card
---

# Station card

The station card is the one-line ticket at .xray/state/STATION.md.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the card on disk                                   │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ keep the intent · put the body in notes            │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the same job continues                             │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

Read it after a compact. Leave Intent alone. The plan is the next cut. The long body belongs in notes.

The station module writes this card. Heat adds `Cascade: record-map · notes N current`. The count is the current index. The body stays on the notes page.
stamped · 0xray 4.0.41
