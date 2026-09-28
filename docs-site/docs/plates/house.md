---
title: House
sidebar_label: House
plate_type: state flow
---

# House

A state flow plate: the stages a house goes through before doctor says House: PASS.

```
  ┌──────────────────────────────┐
  │ EMPTY                        │
  ├──────────────────────────────┤
  │ · no house/ folder yet       │
  └──────────────────────────────┘
                  │  house init
                  v
  ┌──────────────────────────────┐
  │ STARTER FILES COPIED         │
  ├──────────────────────────────┤
  │ · copy starter               │
  │ · HOUSE.md, WAVEBOARD.md,    │
  │   ATTENTION_STATE.md         │
  └──────────────────────────────┘
                  │
                  v
  ┌──────────────────────────────┐
  │ HEADINGS FILLED              │ <──────────┐
  ├──────────────────────────────┤            │
  │ · fill six headings          │            │
  │ · owner, seats, public voice │            │
  │   allowed, ask first, board  │            │
  └──────────────────────────────┘            │
                  │                           │
                  v                           │
  ┌──────────────────────────────┐            │  not yet
  │ OWNER APPROVES               │            │
  ├──────────────────────────────┤            │
  │ · owner approves Allowed     │            │
  │ · doctor cannot check this   │            │
  └──────────────────────────────┘            │
                  │                           │
                  v                           │
  ┌──────────────────────────────┐            │
  │ DOCTOR · House: PASS?        │ ───────────┘
  ├──────────────────────────────┤
  │ · doctor checks it           │
  │ · yes: House: PASS           │
  └──────────────────────────────┘
```

stamped · 0xray · @0xray/grok-bot 0.1.7
