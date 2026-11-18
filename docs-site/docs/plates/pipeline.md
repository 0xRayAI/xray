---
title: Pipeline
sidebar_label: Pipeline
plate_type: domain model
---

# Pipeline

A pipeline is the path one piece of work takes from what arrives to what leaves.

```
┌────────────────────────────────────┐
│ START                              │
│ · what arrives                     │
└─────────────────┬──────────────────┘
                  │ looks through     
                  v                   
┌────────────────────────────────────┐
│ STEPS                              │
│ · the named work                   │
└─────────────────┬──────────────────┘
                  │ hands off         
                  v                   
┌────────────────────────────────────┐
│ FINISH                             │
│ · what leaves                      │
└────────────────────────────────────┘
                                      
┌────────────────────────────────────┐
│ REFUSED                            │
│ · not every path at once           │
└────────────────────────────────────┘
```

A pipeline is the path one piece of work takes from what arrives to what leaves.

Parts: looks through → component, hands off → artifact

stamped · 0xray 4.2.1
