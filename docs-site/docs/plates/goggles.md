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
  │ · an empty look                                            │
  │ · kind and outer together                                  │
  │ · a plane on an outer that has no card                     │
  └────────────────────────────────────────────────────────────┘
```

A card views one plane. When Entry and Exit are missing, the named plane is written into `.xray/state/LENS.md`. Later passes read that card. A missing file is a live line and is not stored.

The refusals read: `Name one outer or one plane.` · `Send kind or outer, not both.` · `plane goes with digest or triage only.`

A checkout named `0xray` records `scripts/mjs/run-goggles-mcp.mjs`. Any other project records `node_modules/0xray/scripts/mjs/run-goggles-mcp.mjs`.

stamped · 0xray 4.1.0
