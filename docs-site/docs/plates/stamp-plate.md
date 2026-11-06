---
title: Stamp plate
sidebar_label: Stamp plate
plate_type: domain model
---

# Stamp plate

Goggles look at one plane. Stamp the plate, name the lens, then look opens both.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  GOGGLES     │────►│  STAMP PLATE │────►│  LENS CARD   │────►│  LOOK FLOW   │
│  one plane   │     │  open skill  │     │  write card  │     │  opens both  │
│  one card    │     │  ASCII+PNG   │     │  in LENS.md  │     │  gap→stamp   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

Goggles views one plane and one card. A stamped plate is the ASCII drawing plus the kit PNG that matches it — open the stamp-plate skill, stamp left → right into `docs-site/docs/plates/<id>.md`, then render the X kit. A lens is one card in `.xray/state/LENS.md` that points at that plate. `npx 0xray look` opens the card and its plate. A card with no plate names this skill — stamp that one plate. Do not add a plane.

stamped · 0xray 4.2.1
