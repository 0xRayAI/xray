---
name: goggles
description: Scout-lens plant. One plane, one card, one feed look. Nibbler organ. Not the eng mill. Not Dist beds.
---

# Goggles

This plant **fastens** scout lenses. Nibbler wears it. One plane is in the frame. A search inside that card runs. A search of another plane returns the card.

**Seat:** `foundry.json` `{ "plant": "goggles", "costume": false }` turns mill off. `"plant": "scout"` is the same plant. `"plant": ["mill", "goggles"]` wears both. Default stays mill+inspect.

This is the Nibbler organ. It is not the eng mill catalog. It is not Dist beds. It is not sound. It is not blip. It is not costume.

**Spine:**

1. **Plane** → dev, integration, domain, or ecosystem. One plane is in the frame.
2. **Card** → the lens card for that plane (`.xray/state/LENS.md`).
3. **Feed look** → the plate, the entry, and the exit on that card. Quote the card.
4. **Inspect** → worn skills are the scout set only. An unknown skill fails closed.

```bash
npx @0xray/foundry mint --skip-live
npx @0xray/foundry inspect --skip-live
```

Mint fastens `goggles` + `goggles-look` + `goggles-inspect`. It does not dump mill inspect or the eng catalog onto a scout seat.

Nibbler pin:

```json
{ "plant": "goggles", "costume": false }
```
