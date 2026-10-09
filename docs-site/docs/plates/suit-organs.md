---
title: Suit organs
sidebar_label: Suit organs
---

# Suit organs

Reporting, station, and the inference cycle are the organs that read or write the activity log and the session file.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌──────────────────┐    ┌────────────────────────────┐  │
│   │ activity log     │    │ latest-session.json        │  │
│   └────────┬─────────┘    └─────────────┬──────────────┘  │
│            └──────────────┬─────────────┘                 │
└───────────────────────────┼───────────────────────────────┘
                            v
┌───────────────────────────┼───────────────────────────────┐
│ PROCESSING LAYER          v                               │
│   ┌────────────┐ ┌────────────┐ ┌──────────────────────┐ │
│   │ reporting  │ │ station    │ │ inference cycle      │ │
│   └─────┬──────┘ └─────┬──────┘ └──────────┬───────────┘ │
└─────────┴──────────────┴───────────────────┴─────────────┘
                          v
┌────────────────────────────────────────────────────────────┐
│ OUTPUT LAYER                                               │
│   ┌────────────┐ ┌────────────┐ ┌──────────────────────┐  │
│   │ report     │ │ heat line  │ │ cycle state          │  │
│   └────────────┘ └────────────┘ └──────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

Reporting reads the activity log and may write a report. Station reads `latest-session.json` and writes the next one. The inference cycle writes `.xray/inference/inference-cycle-state.json` and the history beside it.

Repertoire already keeps `inference-state.json` and the day log under `.xray/state/repertoire/`. Goggles does not write these files. It reads a plate when one plane is named.

stamped · 0xray 4.0.42
