---
title: Memory recall
sidebar_label: Memory recall
---

# Memory recall

Intent names one plate. Equal top scores recall nothing. A missing worn copy is stamped from the docs plate. An edited copy stays.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ intent                                               │  │
│   └──────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               v
┌──────────────────────────────┼──────────────────────────────┐
│ PROCESSING LAYER             v                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ score cues                                           │  │
│   │ one winner loads that plate                          │  │
│   │ a tie returns nothing                                │  │
│   └──────────────────────────┬───────────────────────────┘  │
│                              v                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ stampPlateIfMissing                                  │  │
│   │ writes .xray/state/plates only when that file        │  │
│   │ is missing                                           │  │
│   └──────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               v
┌──────────────────────────────┼──────────────────────────────┐
│ OUTPUT LAYER                 v                              │
│   ┌────────────────────┐        ┌────────────────────────┐ │
│   │ plate line         │        │ stamp file             │ │
│   └────────────────────┘        └────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

A look returns the named plane, the matched law names, and the current lines from the session-note index. It does not write a law.

stamped · 0xray 4.0.42
