---
title: Lens gate
sidebar_label: Lens gate
---

# Lens gate

A search returns the current card and does not run.

```
┌────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the tool call and the file path                       │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
             v
┌────────────┼───────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐   │
│   │ which plane the path is on                           │   │
│   └──────────────────────────┬─────────────────────────┘   │
└──────────────────────────────┼─────────────────────────────┘
                               v
┌──────────────────────────────┼─────────────────────────────┐
│ OUTPUT LAYER                 v                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ the card for the plane you are on                    │   │
│   └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

lensBeforeResearch in src/integrations/hooks/goggles-pipeline.mjs looks at the path. A search returns the current card and does not run. Opening a file on the current plane adds nothing. Opening a file on another plane switches and returns that card. A file on no plane stays and returns the current card. The hook does not search the repo.

A session starts on dev. Compact writes that same card back.

stamped · 0xray 4.1.0
