---
title: Memory recall
sidebar_label: Memory recall
---

# Memory recall

Speech becomes a lesson. Intent names one plate. Compact points at the station card. The card names the stamp. The stamp file is the schematic.

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                  │
│                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│   │ speech       │   │ intent       │   │ compact cut    │  │
│   └──────┬───────┘   └──────┬───────┘   └───────┬────────┘  │
└──────────┼──────────────────┼───────────────────┼───────────┘
           v                  v                   v
┌──────────┼──────────────────┼───────────────────┼───────────┐
│ PROCESSING LAYER             │                   │           │
│          v                  v                   v           │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────────┐ │
│   │ speech grades│   │ intent       │   │ compact says   │ │
│   │ to a lesson  │   │ recalls one  │   │ Read STATION.md│ │
│   │ on a signal  │   │ plate        │   │                │ │
│   └──────┬───────┘   └──────┬───────┘   └───────┬────────┘ │
│          │                  │                   │          │
│          │                  v                   │          │
│          │     ┌────────────────────────────┐   │          │
│          │     │ card keeps the short       │   │          │
│          │     │ subsystem table            │   │          │
│          │     │ card names Plate: <id>     │   │          │
│          │     └─────────────┬──────────────┘   │          │
└──────────┼───────────────────┼──────────────────┼──────────┘
           v                   v                  v
┌──────────┴───────────────────┴──────────────────┴──────────┐
│ OUTPUT LAYER                                               │
│                                                            │
│   ┌────────────────────────────┐  ┌─────────────────────┐ │
│   │ lesson on the signal       │  │ stamp file          │ │
│   │ an episode of what happened│  │ the schematic       │ │
│   └────────────────────────────┘  │ docs-site/docs/     │ │
│                                   │ plates/<id>.md      │ │
│                                   │ worn copy only when │ │
│                                   │ .xray/state/plates/ │ │
│                                   │ <id>.md is missing  │ │
│                                   └─────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```
