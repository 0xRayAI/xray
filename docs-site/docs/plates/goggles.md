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
  │ · a search outside the card does not run                   │
  └────────────────────────────────────────────────────────────┘
```

A session starts on dev. The card is in `.xray/state/LENS.md`. The planes are dev, integration, domain, and ecosystem. A search inside the current card runs. Any other search returns the card and does not run. Opening a file on another plane switches to that card.

A thing on that plane has its own card. A card with no plate names the stamp-plate skill. Stamp one plate for that card.

A name that is not a plane or a card says `Name one plane.`

One named card fills that card's files. Two names stay quiet. Bifrost and grokbot are cards on the ecosystem plane. Worn-turn is the card for the Cursor and Grok pre-tool hooks.

A checkout named `0xray` records `scripts/mjs/run-goggles-mcp.mjs`. Any other project records `node_modules/0xray/scripts/mjs/run-goggles-mcp.mjs`.

stamped · 0xray 4.1.0
