---
name: blip
description: Factory-blip plant. Brief → checksum seed → still|orb → 4.44s mp4 → inspect gate. Not mill. Not costume.
---

# Blip

This plant **fastens** a tiny-video factory. 4.44 seconds of picture, optional bed mux. Not code-mill skills on a blip seat.

**Seat:** `foundry.json` `"plant": "blip"` turns mill off. `"plant": ["mill", "blip"]` wears both. Default stays mill+inspect.

**Picture modes** (Rippel `Animation` plus still — do not invent names):

`still` | `orb` | `swirl` | `snap` | `waves` | `spark`

MVP: `still` + `orb` (`orb` → vis `canvas`). Day-2: swirl / snap / waves / spark reject.

**Spine (headless, no browser):**

1. **Brief** → checksum seed (stable hash lineage).
2. **Mode** → `still` (seeded image looped) or `orb` (named-type frames).
3. **Render** → 4.44s mp4 via ffmpeg. Optional `--bed` wav/mp3 mux.
4. **Inspect gate** → file present, duration 4.44s±tol, mode recorded. Fail-closed.
5. **Receipt** → `.xray/blip/receipt.json` (`PASS` / `FAIL` + mode + durationSec).

```bash
npx @0xray/foundry mint --skip-live
npx @0xray/foundry blip render --brief "night alley still" --mode still
npx @0xray/foundry blip render --brief "night alley orb" --mode orb
npx @0xray/foundry blip inspect
npx @0xray/foundry inspect --skip-live
```

Mint fastens `blip` + `blip-inspect`. It does not dump mill inspect onto a blip-only seat. Chat is not a receipt.

A friend would hear: build the tiny-video factory that makes 4.44s Blips next to the sound foundry.
