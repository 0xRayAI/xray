---
name: blip
description: Factory-blip plant. Brief → checksum seed → still|motion:<id> → 4.44s mp4 → inspect gate. Sibling to mill + sound. Not costume.
---

# Blip

This **factory plant** fastens a tiny-video factory. 4.44 seconds of picture **with a mandatory audio bed**. Sibling to mill + sound — not a mill copy.

**Seat:** `foundry.json` `"plant": "blip"` turns mill off. `"plant": ["mill", "blip"]` wears both. Default stays mill+inspect.

**Motions** live in an on-disk registry (`plant/motions/registry.json`). v0 seed:

`still` · `orb` · `swirl` · `snap` · `waves` · `spark`

Rippel five are **imports**. Four seed + flag axes: `--look focus|cage`, `--body mill|rippel`, `--genre ambient|techno|phonk|jazz|rock|timeless`, `--camera front|three-quarter|top|low|dutch|side` (unknown camera FAIL). Suit is void + five hexes + Wu + hook → turn → tag — not a circle pack on every organ. Focus keeps the disc + one large eclipse moon the noun eats. Cage and snap rupture on the turn (gold lantern / held slash). Mill swirl is Wu mesh, snap is strike, spark is embers. Same organ, different shot — top flattens, low lifts, dutch slashes the floor. Turn dollies in. Cage recoils then whips. Receipt `lookKind` + `bodyKind` + `genre` + `organ` + `camera` + `stereoImage`. `kapow` is a growth stub. Unknown id FAIL.

`still` is the **Power Plant ident** — titlecard / corridor / rain / endcard dissolve over 4.44s at ≥720p, not a frozen poster: void `#08090B` · ink `#F5F7FA` · cyan `#3DE0E8` · gold `#F5C518` · agent blue `#4A7FD4`. Motions use that palette as the Rippel `VisualConfig.circles` theme. The mill is the renderer — no LLM in the pixel/audio loop.

**Spine (headless, no browser):**

1. **Brief** → checksum seed → Rippel `VisualConfig` (`CircleConfig[]`).
2. **Mode** → `still` or `motion:<id>` from the registry.
3. **Render** → 4.44s mp4. Motions are Rippel v2 viz at ≥720p (`--look focus|cage --body mill|rippel`, seed picks if omitted). `--engine wireframe` is emergency only.
4. **Bed** → `--bed PATH` or auto sound mill. Auto bed **syncopates** to the motion grid (same seed + tempo + phase; downbeat kick / AND hat). The crash + motif answer land on the jewel cut. Every mp4 muxes **stereo AAC**. Missing stream or inaudible bed = inspect FAIL.
5. **Inspect gate** → file, duration 4.44s±tol, mode id, **audio stream**, motion ≥720p. Fail-closed.
6. **Receipt** → `.xray/blip/receipt.json` (`PASS` / `FAIL` + pictureMode + motionId + visualConfig).

```bash
npx @0xray/foundry mint --skip-live
npx @0xray/foundry blip render --brief "night alley still" --mode still
npx @0xray/foundry blip render --brief "warehouse floor · Power Plant" --mode motion:orb --look focus
npx @0xray/foundry blip inspect
npx @0xray/foundry inspect --skip-live
```

Mint fastens `blip` + `blip-inspect`. Chat is not a receipt.

A friend would hear: Blips should look like Rippel living motions with sound, not a silent wireframe box.
