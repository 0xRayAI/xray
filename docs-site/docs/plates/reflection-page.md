---
title: Reflection page
sidebar_label: Reflection page
plate_type: pipeline
---

# Reflection page

A reflection is one episode written under docs/reflections.

```
┌────────────────────────────────────────────────────────────┐ 
│ INPUT LAYER                                                │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ a session ends                                     │   │ 
│   └──────────────────────────┬─────────────────────────┘   │ 
└──────────────────────────────┼─────────────────────────────┘ 
             v                                                 
┌────────────┼────────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐    │
│   │ write what the session learned                     │    │
│   └──────────────────────────┬─────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────┘
                               v                               
┌──────────────────────────────┼─────────────────────────────┐ 
│ OUTPUT LAYER                 v                             │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ one file in the seat suit                          │   │ 
│   └────────────────────────────────────────────────────┘   │ 
└────────────────────────────────────────────────────────────┘ 
```

The loader is `loadReflectionInferences` in `src/inference/inference-accumulator.ts`. A reflection is not a repertoire law.

Automatic reflections are a different write. Grok session start, Cursor preCompact, Hermes session start, and the seat wake run the no-model generator. The file lands in the seat suit at `.xray/state/repertoire/feedback`. It is due when commits since the `head:` in the last file are at least 25. `synthesis.enabled` stays false and Confer stays off; this writer does not call them. npm pack excludes that folder. Annals already committed under `docs/reflections/` stay the corpus the loader reads.

stamped · 0xray 4.1.3
