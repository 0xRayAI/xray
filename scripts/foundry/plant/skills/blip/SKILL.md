---
name: blip
description: Factory-blip plant. Brief → checksum seed → still|motion:<id> → 4.44s mp4 → inspect gate. Sibling to mill + sound. Not costume.
---

# Blip

This **factory plant** fastens a tiny-video factory. 4.44 seconds of picture **with a mandatory audio bed**. Sibling to mill + sound — not a mill copy.

**Seat:** `foundry.json` `"plant": "blip"` turns mill off. `"plant": ["mill", "blip"]` wears both. Default stays mill+inspect.

**Motions** live in an on-disk registry (`plant/motions/registry.json`). v0 seed:

`still` · `orb` · `swirl` · `snap` · `waves` · `spark`

Rippel five are **imports**. Each mint wears a seed-unique mesh (family + gait + shells + faces) — 4.44s of unique blip art; receipt `visualConfig.mesh` is the NFT fingerprint. `kapow` is a growth stub (FAIL until a renderer ships). Unknown id FAIL.

`still` is the **Power Plant ident** — hard-cut titlecard / corridor / rain / endcard over 4.44s at ≥720p, not a frozen poster: void `#08090B` · ink `#F5F7FA` · cyan `#3DE0E8` · gold `#F5C518` · agent blue `#4A7FD4`. Motions use that palette as the Rippel `VisualConfig.circles` theme.

**Spine (headless, no browser):**

1. **Brief** → checksum seed → Rippel `VisualConfig` (`CircleConfig[]`).
2. **Mode** → `still` or `motion:<id>` from the registry.
3. **Render** → 4.44s mp4. Motions are Rippel v2 viz at ≥720p (sharp look + tempo/frequency animation on all five). `--engine wireframe` is emergency only.
4. **Bed** → `--bed PATH` or auto sound mill. Auto bed **syncopates** to the motion grid (same seed + tempo + phase; downbeat kick / AND hat). Every mp4 muxes audio. Silent = inspect FAIL.
5. **Inspect gate** → file, duration 4.44s±tol, mode id, **audio stream**, motion ≥720p. Fail-closed.
6. **Receipt** → `.xray/blip/receipt.json` (`PASS` / `FAIL` + pictureMode + motionId + visualConfig).

```bash
npx @0xray/foundry mint --skip-live
npx @0xray/foundry blip render --brief "night alley still" --mode still
npx @0xray/foundry blip render --brief "warehouse floor · Power Plant" --mode motion:orb --bed bed.wav
npx @0xray/foundry blip inspect
npx @0xray/foundry inspect --skip-live
```

Mint fastens `blip` + `blip-inspect`. Chat is not a receipt.

A friend would hear: Blips should look like Rippel living motions with sound, not a silent wireframe box.
