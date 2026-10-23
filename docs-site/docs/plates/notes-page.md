---
title: Notes page
sidebar_label: Notes page
plate_type: pipeline
---

# Notes page

Notes are the body the station card cannot hold.

```
┌────────────────────────────────────────────────────────────┐ 
│ INPUT LAYER                                                │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ the pickup line                                    │   │ 
│   └──────────────────────────┬─────────────────────────┘   │ 
└──────────────────────────────┼─────────────────────────────┘ 
             v                                                 
┌────────────┼────────────────────────────────────────────────┐
│ PROCESSING LAYER                                            │
│   ┌────────────────────────────────────────────────────┐    │
│   │ write the working notes at full depth              │    │
│   └──────────────────────────┬─────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────┘
                               v                               
┌──────────────────────────────┼─────────────────────────────┐ 
│ OUTPUT LAYER                 v                             │ 
│   ┌────────────────────────────────────────────────────┐   │ 
│   │ the next seat continues                            │   │ 
│   └────────────────────────────────────────────────────┘   │ 
└────────────────────────────────────────────────────────────┘ 
```

The page is `.xray/state/NOTES.md`. The pickup line equals the station intent. The default depth is the working notes: the point, the coverage, the library, the open pull requests, the rituals, and the next cut. A pickup line alone does not survive a compact. Where a PreCompact hook exists it calls `stampNotesPickup`, which updates only that line and leaves the body alone. On Grok there is no pre-compact signal, so the seat writes the body after every beat, with evidence. A compaction is a wake: read the station, then the notes, then resume. Do not commit this file. Do not feed it to Repertoire.

The station module writes this page. Heat keeps the current lines in `.xray/state/repertoire/session-notes.json` beside the laws. The wake cascade reads that index and does not write a law. A replaced note stays in that index as history. The short index returns the current line.
stamped · 0xray 4.1.3
