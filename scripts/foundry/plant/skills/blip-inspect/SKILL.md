---
name: blip-inspect
description: Inspect the last factory-blip — duration 4.44s, mode, file present. Fail-closed. Not costume.
---

# Blip inspect

This is the **blip** inspect, not mill inspect. Open the receipt. Quote the numbers. Do not invent a pass.

`npx @0xray/foundry inspect` reports blip plant present plus last blip `PASS`/`FAIL`. `npx @0xray/foundry blip inspect` is the same check.

## Gates (fail-closed)

Missing mp4, unreadable mp4, or a thrown probe is **FAIL**. Never pass on a missing file.

1. **File.** `.xray/blip/blip.mp4` (or receipt `mp4`) exists.
2. **Duration.** 4.44s ± 0.12s.
3. **Mode.** Receipt records `still` or `orb` (MVP). Day-2 modes are FAIL.
4. **Video.** Stream present. Audio required only when a bed was muxed.

Receipt: `.xray/blip/receipt.json`. Mp4 default: `.xray/blip/blip.mp4`.

```bash
npx @0xray/foundry blip render --brief "warm basement still" --mode still
npx @0xray/foundry blip inspect
```

Plant-vs-worn allowlists `blip` + `blip-inspect` when `"plant": "blip"`. They are not a costume dump. Mill may be off on this seat.
