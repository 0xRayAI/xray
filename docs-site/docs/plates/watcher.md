---
title: Watcher
sidebar_label: Watcher
plate_type: domain model
---

# Watcher

A watcher looks at one stream. When the stream changes, it points at the board.

```
┌────────────────────────────────────┐
│ STREAM                             │
│ · what it watches                  │
└─────────────────┬──────────────────┘
                  │ looks at          
                  v                   
┌────────────────────────────────────┐
│ WATCHER                            │
│ · one stream only                  │
└─────────────────┬──────────────────┘
                  │ points at         
                  v                   
┌────────────────────────────────────┐
│ BOARD                              │
│ · where the change shows           │
└────────────────────────────────────┘
                                      
┌────────────────────────────────────┐
│ REFUSED                            │
│ · it does not do the work          │
└────────────────────────────────────┘
```

A watcher looks at one stream. When the stream changes, it points at the board.

Parts: looks at → hook, points at → board

stamped · 0xray 4.2.1
