---
title: Asides
sidebar_label: Asides
plate_type: pipeline
---

# Asides

A user aside is one parallel track.

```
┌────────────────────────────────────────────────────────────┐ 
│ INPUT LAYER                                                │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ a named track                                      │   │ 
│   └──────────────────────────┬─────────────────────────┘   │ 
└──────────────────────────────┼─────────────────────────────┘ 
             v                                                 
┌────────────┼────────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐    │
│   │ read the aside file                                │    │
│   └──────────────────────────┬─────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────┘
                               v                               
┌──────────────────────────────┼─────────────────────────────┐ 
│ OUTPUT LAYER                 v                             │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ that track, or the main line                       │   │ 
│   └────────────────────────────────────────────────────┘   │ 
└────────────────────────────────────────────────────────────┘ 
```

State is `.xray/state/asides/{id}.json` and `_active.json`. A todo id looks like `{asideId}.a.1.1`. The code is `src/nucleus/user-aside.ts`. The guides aside-context, user-asides, and parallel-work-tracks describe this one thing.

stamped · 0xray 4.1.4
