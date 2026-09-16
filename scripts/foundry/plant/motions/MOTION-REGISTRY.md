# Motion registry (factory-blip)

Law: motions are a dynamic registry (`id → renderer`). Rippel names are **imports**, not a frozen enum. Unknown id FAIL. `kapow` is a growth stub (`renderer: null`) until a renderer ships.

On-disk SSOT: `registry.json` next to this file.

## v0 seed

`still` · `orb` · `swirl` · `snap` · `waves` · `spark`

## Rippel v2 — converter + living motions (TICKET-BLIP-RENDERER-UPGRADE)

Default motion path is the Rippel converter spine, not ffmpeg geometry. Look is **sharp** (opaque body + crisp rim + short glow) on all five. Motion is a **4.44s blip**: fast abstract travel, soft gold tints — no hard strobe. LFOs share the crystal-mill genre tempo + `CircleConfig.frequency` with the audio bed.

One mill suit on every body: Wu hairline, Power Plant satellites, short glow, hook → turn → tag on the shared motion grid. Picture and bed seed-pick the same genre. Rippel geo stays (petals / N-gons / synapse / cosmos / aurora) and wears that suit — not a second CAD look.

- **SSOT** `htafolla/rippel-synapse-flow@e5014cd`
- `animationIcons.ts` → `ANIMATION_TO_VISUALIZATION`
- `types/index.ts` → `ChecksumResponse.visualConfig` (`CircleConfig[]`, `CanvasConfig`, `tlmCommand`)
- `SimplifiedVisualConverter.tsx` → Animation → viz id, canvas **1280×720** @ ~30fps
- `MiniAnimationViewer` / `FiveDimensionalVisualizer` → viz backends

| id | viz id | mill body | rippel body |
|----|--------|-----------|-------------|
| `orb` | `canvas` | `focus` disc **or** `cage` Wu + nucleus | `mandala` |
| `swirl` | `3d-sacred` | platonic `mesh` | `sacred-flow` |
| `snap` | `neural` | `strike` (quantized) | `synapse` |
| `waves` | `waveform` | sharp `ribbons` | `liquid-waves` |
| `spark` | `particles` | `embers` | `cosmic-dance` |

Every mint wears a **sparse seed mesh** (12 families · 5 gaits) plus a **field** (stars · grids `floor`/`none` · gradients · blinkers) **under** the drawing. No outer-edge tick ruler or meridian box. Receipt `visualConfig.mesh` + `visualConfig.field` + `organ` are the NFT fingerprints.

Motions encode **≥720p**. The old 320×180 ffmpeg wireframe is **`--engine wireframe` only**.

Every Blip muxes a **4.44s audio bed** (`--bed PATH` or auto sound mill). No audio stream = inspect FAIL.

`still` is the **Power Plant ident** — titlecard / corridor / rain / endcard dissolve over 4.44s at ≥720p. Not a frozen poster. Palette `#08090B` `#F5F7FA` `#3DE0E8` `#F5C518` `#4A7FD4`.
