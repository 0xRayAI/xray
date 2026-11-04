---
name: goggles-inspect
description: Scout-seat inspect. Unknown skill fails closed. Not mill inspect. Not a Dist bed.
---

# Goggles inspect

This is the **scout seat** inspect, not mill inspect of AI work. Open the worn skills. Quote the names. Do not invent a pass.

`npx @0xray/foundry inspect` reports the goggles plant present. An unknown skill on the seat fails closed (costume dump). Mill may be off.

## Gates (fail-closed)

1. **Set.** Worn skills are `goggles`, `goggles-look`, and `goggles-inspect` when the pin is `goggles` or `scout`.
2. **Unknown skill.** A name outside that set fails. Do not widen the set in chat.
3. **Mill off.** The eng catalog is not fastened on this seat.
4. **Same plant.** `scout` and `goggles` fasten one plant.

Receipt: `.xray/foundry-inventory.json` → `plants.goggles.skills`.

```bash
npx @0xray/foundry mint --skip-live
npx @0xray/foundry inspect --skip-live
```

Plant-vs-worn allowlists `goggles` + `goggles-look` + `goggles-inspect` when `"plant": "goggles"` or `"plant": "scout"`. They are not a costume dump. They are not sound, not blip, and not Dist beds.
