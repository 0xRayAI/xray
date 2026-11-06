---
title: Stamp plate
sidebar_label: Stamp plate
plate_type: domain model
---

# Stamp plate

Goggles views one plane. A lens is a card that points at a plate. Look opens both.

```
  ┌──────────────────────────────────────────────────────────────────┐
  │ GOGGLES · views one plane                                        │
  ├──────────────────────────────────────────────────────────────────┤
  │ · one card at a time                                             │
  │ · the card is in LENS.md                                         │
  └─────────────┬────────────────────────────────────────────────────┘
                │ looks through                                       
                v                                                     
  ┌─────────────┬────────────┐ points at ┌───────────────────────────┐
  │ LENS                     │──────────►│ STAMPED PLATE             │
  ├──────────────────────────┤           ├───────────────────────────┤
  │ · write one card         │           │ · open the stamp-plate    │
  │   in LENS.md             │           │   skill                   │
  │ · name that plate        │           │ · ASCII into plates/id.md │
  │                          │           │ · kit PNG matches ASCII   │
  └────────────┬─────────────┘           └─────────────┬─────────────┘
               │                                       │              
               └───────────────────┬───────────────────┘              
                                   │ look opens both                  
                                   v                                  
  ┌──────────────────────────────────────────────────────────────────┐
  │ LOOK · the card and its plate                                    │
  ├──────────────────────────────────────────────────────────────────┤
  │ · a card with no plate names the stamp-plate skill               │
  │ · stamp that one plate · do not add a plane                      │
  └──────────────────────────────────────────────────────────────────┘
```

Goggles views one plane and one card. The card lives in `.xray/state/LENS.md`. A lens is that card, written for the plane in view, and it names one plate. A stamped plate is the ASCII drawing in `docs-site/docs/plates/<id>.md` plus the kit PNG that matches it — open the stamp-plate skill to write that drawing. `npx 0xray look` opens the card and its plate. A card with no plate names this skill — stamp that one plate. Do not add a plane.

stamped · 0xray 4.2.1
