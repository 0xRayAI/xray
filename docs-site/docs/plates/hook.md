---
title: Hook
sidebar_label: Hook
plate_type: domain model
---

# Hook

A hook sits on a call. It looks at that call and points at the card.

```
┌────────────────────────────────────┐
│ CALL                               │
│ · the moment it sits on            │
└─────────────────┬──────────────────┘
                  │ looks at          
                  v                   
┌────────────────────────────────────┐
│ HOOK                               │
│ · one call                         │
└─────────────────┬──────────────────┘
                  │ points at         
                  v                   
┌────────────────────────────────────┐
│ CARD                               │
│ · the card for that call           │
└────────────────────────────────────┘
                                      
┌────────────────────────────────────┐
│ REFUSED                            │
│ · it does not write the plate      │
└────────────────────────────────────┘
```

A hook sits on a call. It looks at that call and points at the card.

Parts: looks at → watcher, points at → lens

stamped · 0xray 4.2.1
