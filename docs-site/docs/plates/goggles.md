---
title: Goggles
sidebar_label: Goggles
plate_type: domain model
---

# Goggles

It views one plane.

```
  ┌────────────────────────────────────────────────────────────┐
  │ GOGGLES                                                    │
  ├────────────────────────────────────────────────────────────┤
  │ · it views one plane                                       │
  │ · not every plane at once                                  │
  │ · a session starts on dev                                  │
  │ · the card is in LENS.md                                   │
  ├────────────────────────────────────────────────────────────┤
  │ REFUSED                                                    │
  │ · a search, until the card is read                         │
  └────────────────────────────────────────────────────────────┘
```

A session starts on dev. The card is in `.xray/state/LENS.md`. The planes are dev, integration, domain, and ecosystem. A search returns the current card and does not run. Opening a file on another plane switches to that card.

A name that is not one of those four says `Name one plane.`

A checkout named `0xray` records `scripts/mjs/run-goggles-mcp.mjs`. Any other project records `node_modules/0xray/scripts/mjs/run-goggles-mcp.mjs`.

stamped · 0xray 4.1.0
