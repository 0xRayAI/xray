---
name: blip-inspect
description: Inspect the last factory-blip — duration 4.44s, registry mode id, file present. Fail-closed. Not costume.
---

# Blip inspect

This is the **factory-blip** inspect, not mill inspect. Open the receipt. Quote the numbers. Do not invent a pass. File / duration / mode / streams. Not vibe density. Not the friend hitting replay.

`npx @0xray/foundry inspect` reports blip plant present, live registry ids, plus last blip `PASS`/`FAIL`. `npx @0xray/foundry blip inspect` is the same check.

## Gates (fail-closed)

Missing mp4, unreadable mp4, or a thrown probe is **FAIL**. Never pass on a missing file.

1. **File.** `.xray/blip/blip.mp4` (or receipt `mp4`) exists.
2. **Duration.** 4.44s ± 0.12s.
3. **Mode.** Receipt records a registry id (`still` or `motion:<id>`). Unknown id is FAIL.
4. **Video.** Stream present.
5. **Audio.** Stream present. Silent mp4 = FAIL. `--bed` or auto sound mill.
6. **Resolution.** Every live blip ≥720p (`1280×720`), including the Power Plant ident (`still`).

v0 ids: `still` · `orb` · `swirl` · `snap` · `waves` · `spark`. `kapow` is a design opt (two-tier stamp on the stanza). Unknown id FAIL. Receipt records the Power Plant palette.

Receipt: `.xray/blip/receipt.json`. Mp4 default: `.xray/blip/blip.mp4`.

```bash
npx @0xray/foundry blip render --brief "warm basement swirl" --mode motion:swirl --bed bed.wav
npx @0xray/foundry blip inspect
```

Plant-vs-worn allowlists `blip` + `blip-inspect` + `blip-vibe` + `blip-looker` when `"plant": "blip"`. They are not a costume dump. Mill may be off on this seat.
