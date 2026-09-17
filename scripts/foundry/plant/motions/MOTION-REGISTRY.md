# Motion registry (factory-blip)

Law: motions are a dynamic registry (`id → renderer`). Rippel names are **imports**, not a frozen enum. Unknown id FAIL. `kapow` is a design opt — two-tier stamp on hook → turn → tag.

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

Every mint wears a **sparse seed mesh** (12 families · 5 gaits · 6 cameras) plus a **field** (stars · grids `floor`/`none` · gradients · blinkers) **under** the drawing. No outer-edge tick ruler or meridian box. Phrase eases spin: hook crawl → turn whip → tag hold. Camera is a seed shot (`front` `three-quarter` `top` `low` `dutch` `side`) with a turn push-in — same organ, different silhouette. Turn ruptures cage (gold lantern) and snap (held gold slash). Focus wears one large eclipse moon the noun eats. Mill swirl is a cyan/gold jewel, snap is a ghost hull + 2–3 strikes, spark is coals on verts and midpoints. Receipt `visualConfig.mesh` + `visualConfig.field` + `organ` are the NFT fingerprints.

Motions encode **≥720p**. The old 320×180 ffmpeg wireframe is **`--engine wireframe` only**.

Every Blip muxes a **4.44s audio bed** (`--bed PATH` or auto sound mill). No audio stream = inspect FAIL.

`still` is the **Power Plant ident** — titlecard / corridor / rain / endcard dissolve over 4.44s at ≥720p. Not a frozen poster. Palette `#08090B` `#F5F7FA` `#3DE0E8` `#F5C518` `#4A7FD4`.

## Design opt — `kapow`

Not a Rippel import and not a `--look`. `--mode motion:kapow` paints a bigger cyan burst with a gold inner burst, ink outline, gold speed lines, and a readable `KAPOW!`. Hook winds the outer ring. The jewel cut slams the inner burst and the word. Tag holds. One noun sits under the word. `blip-vibe` scores still + Rippel five + kapow on the same organ — every type must hit **8** to ship. Same seed camera / genre grid / 4.44s bed as the five.
