# Motion registry (factory-blip)

Law: motions are a dynamic registry (`id → renderer`). Rippel names are **imports**, not a frozen enum. Unknown id FAIL. `kapow` is a growth stub (`renderer: null`) until a renderer ships.

On-disk SSOT: `registry.json` next to this file.

## v0 seed

`still` · `orb` · `swirl` · `snap` · `waves` · `spark`

## Phase 1 — Rippel canvas (TICKET-BLIP-RENDERER-UPGRADE)

Default motion path is the Rippel converter spine, not ffmpeg geometry:

- **SSOT** `htafolla/rippel-synapse-flow@e5014cd`
- `animationIcons.ts` → `ANIMATION_TO_VISUALIZATION`
- `types/index.ts` → `ChecksumResponse.visualConfig` (`CircleConfig[]`, `CanvasConfig`, `tlmCommand`)
- `SimplifiedVisualConverter.tsx` → Animation → viz id, canvas **1280×720** @ ~30fps
- `MiniAnimationViewer` / `FiveDimensionalVisualizer` → viz backends

| id | viz id | backend |
|----|--------|---------|
| `orb` | `canvas` | Orb Glow — frequency circles + breathing core |
| `swirl` | `3d-sacred` | same circles on a sacred plate |
| `snap` | `neural` | circles as nodes, traveling pulses |
| `waves` | `waveform` | Wave Flow — one ribbon per circle frequency |
| `spark` | `particles` | Spark Drift — motes from each circle seat |

Motions encode **≥720p**. The old 320×180 ffmpeg wireframe is **`--engine wireframe` only**.

Every Blip muxes a **4.44s audio bed** (`--bed PATH` or auto sound mill). No audio stream = inspect FAIL.

`still` stays the Power Plant plate until Phase 2 (`#08090B` `#F5F7FA` `#3DE0E8` `#F5C518` `#4A7FD4`).
