---
title: Goggles
sidebar_label: Goggles
plate_type: domain model
---

# Goggles

It views one plane. The lens check is the one look that spans planes.

```
  ┌────────────────────────────────────────────────────────────┐
  │ GOGGLES                                                    │
  ├────────────────────────────────────────────────────────────┤
  │ · it views one plane                                       │
  │ · not every plane at once                                  │
  │ · the lens check sweeps every card plane for shipped files │
  │ · it names the first drift, or stays quiet on a match      │
  ├────────────────────────────────────────────────────────────┤
  │ REFUSED                                                    │
  │ · an empty look                                            │
  │ · kind and outer together                                  │
  │ · a plane on an outer that has no card                     │
  └────────────────────────────────────────────────────────────┘
```

A card views one plane. The lens check reads every card plane, but only the files the package ships (`package.json` `files`), so a packed install and the repo read the same. A file that does not ship is triage's job, one plane at a time.

The refusals read: `Name a kind, one outer, or one plane.` · `Send kind or outer, not both.` · `plane goes with digest or triage only.`

A checkout named `0xray` records `scripts/mjs/run-goggles-mcp.mjs`. Any other project records `node_modules/0xray/scripts/mjs/run-goggles-mcp.mjs`.

stamped · 0xray 4.1.0
