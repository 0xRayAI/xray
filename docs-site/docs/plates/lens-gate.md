---
title: Lens gate
sidebar_label: Lens gate
plate_type: pipeline
---

# Lens gate

A search inside the current card runs.

```
┌───────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                   │
│   ┌───────────────────────────────────────────────────────┐   │
│   │ the tool call and the file path                       │   │
│   └──────────────────────────┬────────────────────────────┘   │
└──────────────────────────────┼────────────────────────────────┘
             v                                                   
┌────────────┼─────────────────────────────────────────────────┐ 
│ PROCESSING LAYER                                             │ 
│   ┌──────────────────────────────────────────────────────┐   │ 
│   │ which plane the path is on                           │   │ 
│   └──────────────────────────┬───────────────────────────┘   │ 
└──────────────────────────────┼───────────────────────────────┘ 
                               v                                 
┌──────────────────────────────┼───────────────────────────────┐ 
│ OUTPUT LAYER                 v                               │ 
│   ┌──────────────────────────────────────────────────────┐   │ 
│   │ the card for the plane you are on                    │   │ 
│   └──────────────────────────────────────────────────────┘   │ 
└──────────────────────────────────────────────────────────────┘ 
```

lensBeforeResearch in src/integrations/hooks/goggles-pipeline.mjs looks at the path. A search inside the current card runs. A search of another plane returns the current card and does not run. A path on no plane runs. A path outside this checkout runs, including inside a terminal command. Opening a file on the current plane adds nothing. Opening a file on another plane switches and returns that card. A file on no plane stays, and the open proceeds. The hook does not search the repo.

A session starts on dev. Compact writes that same card back.

stamped · 0xray 4.1.5
