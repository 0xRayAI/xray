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
  │ · HOUSE.md                   │
  │ · ATTENTION_STATE.md         │
  │ · hand-kept WAVEBOARD.md     │
  │   when LIVE_URL is unset     │
  │ · GET /cards when it is set  │
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

When `LIVE_URL` is unset, open cards are hand-kept in `house/WAVEBOARD.md`. When `LIVE_URL` is set, the board is Bifrost at https://bifrost.0xray.dev (`GET /cards`). `ATTENTION_STATE.md` is read in either case.

`HOUSE.md` carries `name:` under `## Owner` and `OP-PROC:`. Doctor warns, and House stays PASS, when that `name:` line is missing, when the profile lacks the station hook, when the station card is older than NOTES, or when `Skills:` or `Keys:` is missing. Adoption is `templates/house/STATION-BOOT.md`.

stamped · 0xray 4.1.0 · @0xray/grok-bot 0.1.11
