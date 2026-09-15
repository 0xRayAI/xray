---
name: blip
description: Factory-blip plant. Brief → checksum seed → still|motion:<id> → 4.44s mp4 → inspect gate. Sibling to mill + sound. Not costume.
---

# Blip

This **factory plant** fastens a tiny-video factory. 4.44 seconds of picture, optional bed mux. Sibling to mill + sound — not a mill copy.

**Seat:** `foundry.json` `"plant": "blip"` turns mill off. `"plant": ["mill", "blip"]` wears both. Default stays mill+inspect.

**Motions** live in an on-disk registry (`plant/motions/registry.json`). v0 seed:

`still` · `orb` · `swirl` · `snap` · `waves` · `spark`

Rippel five are **imports**. `kapow` is a Blips original on the same registry. Unknown id FAIL.

**Spine (headless, no browser):**

1. **Brief** → checksum seed.
2. **Mode** → `still` or `motion:<id>` from the registry.
3. **Render** → 4.44s mp4 via ffmpeg. Optional `--bed` wav/mp3 mux.
4. **Inspect gate** → file present, duration 4.44s±tol, mode id recorded. Fail-closed.
5. **Receipt** → `.xray/blip/receipt.json` (`PASS` / `FAIL` + pictureMode + motionId).

```bash
npx @0xray/foundry mint --skip-live
npx @0xray/foundry blip render --brief "night alley still" --mode still
npx @0xray/foundry blip render --brief "night alley orb" --mode motion:orb
npx @0xray/foundry blip inspect
npx @0xray/foundry inspect --skip-live
```

Mint fastens `blip` + `blip-inspect`. Chat is not a receipt.

A friend would hear: build the tiny-video factory that makes 4.44s Blips next to the sound foundry.
