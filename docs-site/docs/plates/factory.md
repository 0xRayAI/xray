---
title: Factory
sidebar_label: Factory
plate_type: domain model
---

# Factory

A factory is the place that builds the suit. It points at the mill that does one job.

```
┌────────────────────────────────────┐
│ FACTORY                            │
│ · where the suit is built          │
└─────────────────┬──────────────────┘
                  │ points at         
                  v                   
┌────────────────────────────────────┐
│ MILL                               │
│ · one job                          │
└────────────────────────────────────┘
                                      
┌────────────────────────────────────┐
│ REFUSED                            │
│ · not the live board               │
└────────────────────────────────────┘
```

A factory is the place that builds the suit. It points at the mill that does one job.

Parts: points at → mill

stamped · 0xray 4.2.1
