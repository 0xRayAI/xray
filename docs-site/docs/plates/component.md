---
title: Component
sidebar_label: Component
plate_type: domain model
---

# Component

A component is one named part. It sits in a pipeline and points at the next part.

```
┌────────────────────────────────────┐
│ COMPONENT                          │
│ · one named part                   │
└─────────────────┬──────────────────┘
                  │ sits in           
                  v                   
┌────────────────────────────────────┐
│ PIPELINE                           │
│ · the path it belongs to           │
└─────────────────┬──────────────────┘
                  │ points at         
                  v                   
┌────────────────────────────────────┐
│ NEXT                               │
│ · the following part               │
└────────────────────────────────────┘
                                      
┌────────────────────────────────────┐
│ REFUSED                            │
│ · not the whole path               │
└────────────────────────────────────┘
```

A component is one named part. It sits in a pipeline and points at the next part.

Parts: sits in → pipeline, points at → artifact

stamped · 0xray 4.2.1
