---
title: Grok compact
sidebar_label: Grok compact
---

# Grok compact

Grok PreCompact runs session-start.js with the pre_compact event.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ a compact is about to happen                       │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ build the session payload                          │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the station card is written                        │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

The hook is `session-start.js --hook-event=pre_compact`. It calls `buildSessionBootPayload`, writes the station card, and prints nothing. It does not match the conversation. Grok ignores hook stdout. The plates that belong here are payload-heat, cursor-compact, and work-fresh.

stamped · 0xray 4.0.41
