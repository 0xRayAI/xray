# Motion registry (factory-blip)

Law: motions are a dynamic registry (`id → renderer`). Rippel names are **imports**, not a frozen enum. Unknown id FAIL. `kapow` is a growth stub (`renderer: null`) until a renderer ships.

On-disk SSOT: `registry.json` next to this file.

## v0 seed

`still` · `orb` · `swirl` · `snap` · `waves` · `spark`

## Rippel v2 — converter + living motions (TICKET-BLIP-RENDERER-UPGRADE)

Default motion path is the Rippel converter spine, not ffmpeg geometry. Look is **sharp** (opaque body + crisp rim + short glow) on all five. Motion is a **4.44s blip**: fast abstract travel, soft gold tints — no hard strobe. LFOs share the crystal-mill genre tempo + `CircleConfig.frequency` with the audio bed.

- **SSOT** `htafolla/rippel-synapse-flow@e5014cd`
- `animationIcons.ts` → `ANIMATION_TO_VISUALIZATION`
- `types/index.ts` → `ChecksumResponse.visualConfig` (`CircleConfig[]`, `CanvasConfig`, `tlmCommand`)
- `SimplifiedVisualConverter.tsx` → Animation → viz id, canvas **1280×720** @ ~30fps
- `MiniAnimationViewer` / `FiveDimensionalVisualizer` → viz backends

| id | viz id | backend |
|----|--------|---------|
| `orb` | `canvas` | Orb Glow — dual rings, beat tick, frequency flash |
| `swirl` | `3d-sacred` | merkaba + hex plate, counter-spin, beat vertices |
| `snap` | `neural` | dual-ring lattice, hub, skip-links, traveling pulses |
| `waves` | `waveform` | Wave Flow — harmonic ribbons + beat envelope + gold needle |
| `spark` | `particles` | Spark Drift — beat bursts, orbital + radial motes |

Every mint wears a **seed-unique mesh** (12 families · 5 gaits · shells · faces · ghost). Scale fills the 4.44s frame. Receipt `visualConfig.mesh` is the NFT fingerprint.

Motions encode **≥720p**. The old 320×180 ffmpeg wireframe is **`--engine wireframe` only**.

Every Blip muxes a **4.44s audio bed** (`--bed PATH` or auto sound mill). No audio stream = inspect FAIL.

`still` is the **Power Plant ident** — hard-cut titlecard / corridor / rain / endcard over 4.44s at ≥720p. Not a frozen poster. Palette `#08090B` `#F5F7FA` `#3DE0E8` `#F5C518` `#4A7FD4`.
