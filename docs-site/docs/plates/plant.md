---
title: Plant
sidebar_label: Plant
plate_type: domain model
---

# Plant

A plant is the set of jobs a mill fastens on. It snaps onto that mill.

```
┌────────────────────────────────────┐
│ PLANT                              │
│ · the jobs fastened on             │
└─────────────────┬──────────────────┘
                  │ snaps onto        
                  v                   
┌────────────────────────────────────┐
│ MILL                               │
│ · the package that holds them      │
└────────────────────────────────────┘
                                      
┌────────────────────────────────────┐
│ REFUSED                            │
│ · not a second mill                │
└────────────────────────────────────┘
```

A plant is the set of jobs a mill fastens on. It snaps onto that mill.

Parts: snaps onto → mill

stamped · 0xray 4.2.1
