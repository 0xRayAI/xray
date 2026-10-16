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
  │ · a missing card is written into LENS.md                   │
  │ · later passes read that stored card                       │
  ├────────────────────────────────────────────────────────────┤
  │ REFUSED                                                    │
  │ · a look that does not name one plane                      │
  └────────────────────────────────────────────────────────────┘
```

A card views one plane. When Entry and Exit are missing, the named plane is written into `.xray/state/LENS.md`. Later passes read that card. A missing file is a live line and is not stored.

A look that does not name one plane says `Name one plane.`

A checkout named `0xray` records `scripts/mjs/run-goggles-mcp.mjs`. Any other project records `node_modules/0xray/scripts/mjs/run-goggles-mcp.mjs`.

stamped · 0xray 4.1.0
