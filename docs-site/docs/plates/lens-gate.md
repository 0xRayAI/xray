---
title: Lens gate
sidebar_label: Lens gate
---

# Lens gate

A search names one plane or it stops.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the tool name and the spoken text                     │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ count card-plane names                                │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ allow on one name, otherwise stop                     │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

lensBeforeResearch in src/integrations/hooks/goggles-pipeline.mjs returns null when the call is not research, and when the spoken text names exactly one card plane. Zero names, or more than one, deny with Name one plane. The plate that belongs here is pre-tool.

stamped · 0xray 4.0.36
