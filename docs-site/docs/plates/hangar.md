---
title: Hangar
sidebar_label: Hangar
plate_type: domain model
---

# Hangar

A hangar is the shop that shows what a mill made. It points at that mill.

```
┌────────────────────────────────────┐
│ HANGAR                             │
│ · the shop                         │
└─────────────────┬──────────────────┘
                  │ points at         
                  v                   
┌────────────────────────────────────┐
│ MILL                               │
│ · what it shows                    │
└────────────────────────────────────┘
                                      
┌────────────────────────────────────┐
│ REFUSED                            │
│ · not the mill itself              │
└────────────────────────────────────┘
```

A hangar is the shop that shows what a mill made. It points at that mill.

Parts: points at → mill

stamped · 0xray 4.2.1
