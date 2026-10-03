---
title: Session capture
sidebar_label: Session capture
---

# Session capture

Station writes latest-session.json when HEAD moves, and saveSessionInference writes the same kind of file for a graded session.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────┐    ┌──────────────────────────┐  │
│   │ station HEAD move  │    │ saveSessionInference     │  │
│   └─────────┬──────────┘    └────────────┬─────────────┘  │
│             └──────────────┬─────────────┘                │
└────────────────────────────┼──────────────────────────────┘
                             v
┌────────────────────────────┼──────────────────────────────┐
│ PROCESSING LAYER           v                              │
│   ┌────────────────────────────────────────────────────┐  │
│   │ one JSON · span · problems · approaches            │  │
│   └──────────────────────────┬─────────────────────────┘  │
└──────────────────────────────┼────────────────────────────┘
                               v
┌──────────────────────────────┼────────────────────────────┐
│ OUTPUT LAYER                 v                            │
│   ┌──────────────────────────────────────────────────┐   │
│   │ .xray/inference/latest-session.json              │   │
│   └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

Today that file is `docs/inference/latest-session.json`. The home is `.xray/inference/latest-session.json`. Cycle state is already `.xray/inference/inference-cycle-state.json`.

Station reads the file for heat. The inference accumulator reads `session-*.json` beside it. Do not mint a `session-<date>-<sha>` file for the station note.

stamped · 0xray 4.0.36
