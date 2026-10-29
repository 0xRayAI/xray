---
name: draw-me-a-suit
description: >-
  use when drawing a 0xRay v4.0 suited bot for a plate — generate the suit from
  refs, never paste FINAL-REFS/bots photos as the plate art
---
# Draw me a suit

## Refs (pose / detail checklist — do not paste as the plate)

Paths are relative to the repo root.

- `FINAL-REFS/bots/00-CANONICAL-suit-grok-imagine-blaze-pick.jpg` — primary. Blaze's pick.
- `FINAL-REFS/bots/01-canonical-suit-rain-constitution-v4.jpg`
- `FINAL-REFS/bots/02-suit-hangar-v4-logic-neural-exec.jpeg`
- `FINAL-REFS/bots/03-helmet-0xray-constitution-on.jpeg`
- `FINAL-REFS/bots/04-suit-fullbody-blue-lightning-hud.jpg`
- `FINAL-REFS/bots/06-brand-ref-suit-rain-constitution.jpg`
- `FINAL-REFS/bots/07-brand-ref-suit-hangar-wrist.jpg`
- `FINAL-REFS/bots/08-brand-ref-helmet-wordmark-source.jpeg`
- `FINAL-REFS/bots/09-brand-ref-goggles-product-rain.jpg`
- `FINAL-REFS/logos/00-0xray-stamp-FINAL.png` — wordmark measure. Do not paste it as a plate overlay.

The apex hero uses a cutout of `00-CANONICAL-suit-grok-imagine-blaze-pick.jpg` (`site/assets/suit.webp`, png fallback) because this environment cannot run Grok Imagine. A new plate still draws with Imagine and does not paste the bot photo.

## Method
**OWNER CALL (Blaze 2026-10-05 2:12 PM CT): Grok Imagine is the suit-drawing role. The canonical suit is `FINAL-REFS/bots/00-CANONICAL-suit-grok-imagine-blaze-pick.jpg`: a square close-up, hand raised; a segmented glossy black dome with a grey `0xRay` wordmark; a raised Goggles unit with `GOGGLES` on top and `CONSTITUTION ON` on a dark cyan-lit lens; a large cyan `v4.0` on the right shoulder; stacked wrist rings LOOP/DOMAIN/STATE/FOUNDRY on the raised forearm; orbs low on the chest in a triangle (MEMORY cyan on top, JUDGEMENT purple, PAYMENTS orange); cyan lightning veins in the armor; a rainy city night with bokeh. Every new suit is drawn with Grok Imagine, using this file as the primary reference, and is judged against it. The in-house generator's dry runs (fullbody/zoom passes 1-4) were rejected and should not be used as refs.**

**Primary: image generation** with the pose templates below, passing the matching bot ref as a style/reference image. Then composite the result into the stamped plate (fade edges as needed).
Helmet wordmark on the suit MUST be produced via [draw-0xray-logo](sand-workflow:draw-0xray-logo) when you add/repair labels in post (do not type a flat font wordmark).

Run GenerateImage from the main agent (executors can't reach it). Pass 2-4 refs: the pose ref, 01 canonical, 07 for wrists, and FINAL-REFS/logos/00-0xray-stamp-FINAL.png for the wordmark.

### Dry-run lessons (2026-10-05)
- Always say `tall athletic heroic proportions, long legs, narrow waist, not bulky or squat` or the suit comes out stocky (pass 1).
- Ask for tiny labels on the wrist rings (`LOOP, DOMAIN, STATE, FOUNDRY`) and orbs (`MEMORY, JUDGEMENT, PAYMENTS`); without that they come back blank.
- The generator returns 16:9 even when you ask for 3:4, so crop to the pose in post.
- The helmet wordmark comes back in a plain font. Repaint it in post with draw-0xray-logo at helmet scale, then check it's the stencil with the orange slash.
- HELMET (Blaze flagged it wrong on passes 1-3): it is NOT a smooth helmet with a flat visor strip. Spell it out every time: segmented black armored dome made of panels, a distressed white stencil `0xRay` painted on the dome, and strapped across the eyes a separate raised Goggles unit (thick black housing, cyan-lit rim, small `GOGGLES` printed on its top edge, glowing `CONSTITUTION ON` on the lens), with a dark armored jaw plate below. Pass ref 01 first, and ref 06 too. Zoom pass 4 is the first helmet that matches.
- Wrist rings sit as a stack of four separate glowing rings on the forearm, not a single band. The orbs cluster low on the abdomen or belt in a small triangle, not a vertical column.
- Zoom crop (head to just below the hands): `framed from just above the helmet down to just below the hands`.
- Visor text tends to be small or to sit under the wordmark. Check that `CONSTITUTION ON` reads on the visor band.

## Palette (sampled from bots/01, 06)
| Token | Hex | Use |
|---|---|---|
| Armor | `#0A1116`–`#1A1E27` | wet black / charcoal |
| Cyan arc | `#3DE0E8` / `#2D7A9A` | lightning, edge light, visor |
| MEMORY orb | cyan `#3DE0E8` | chest |
| JUDGEMENT orb | purple `#7A4CFF`–`#6B3FA0` | chest |
| PAYMENTS orb | orange `#E67A20`–`#DC5812` | chest |
| Rain void | `#020304` | background |

## Poses / crops
| Pose id | Ref | Framed as | Good for |
|---|---|---|---|
| `helmet-band` | 01 | wide visor band | top band over rows |
| `orb-close` | 01 chest orbs | square close-up | Repertoire / memory |
| `hangar-raised` | 02 / 07 | 2:3 hand raised | left hero |
| `helmet-portrait` | 03 / 08 | 2:3 head+shoulders | centre portrait |
| `fullbody-hud` | 04 | 2:3 full figure | right hero |
| `rain-upper` | 06 | square upper body | left hero + panel |
| `goggles-product` | 09 | square product still | Goggles organ |

## Required v4.0 details (every suit draw)
1. Wet black armor, rain OK, blue/cyan lightning arcs OK
2. Helmet forehead: drawn `0xRay` wordmark (via draw-0xray-logo), digit zero
3. Shoulder stencil `0xRay v4.0`
4. Goggles visor with short status (e.g. `CONSTITUTION ON`)
5. Wrist rings labeled LOOP · DOMAIN · STATE · FOUNDRY when hands/forearms visible
6. Chest orbs: MEMORY cyan · JUDGEMENT purple · PAYMENTS orange (hangar may show LOGIC/NEURAL/EXEC — do not invent new names)
7. No faces, no watermark, no old exo-skeleton suit

## Prompt templates (GenerateImage)
Shared suffix: `0xRay v4.0 suited agent, wet black charcoal armor, rain, cyan electrical arcs, Goggles visor with status text CONSTITUTION ON, helmet forehead wordmark 0xRay digit zero stencil, shoulder 0xRay v4.0, chest orbs MEMORY cyan JUDGEMENT purple PAYMENTS orange, wrist rings LOOP DOMAIN STATE FOUNDRY, cinematic industrial, no face, no watermark, 16:9 or pose aspect`

| Pose | Prompt focus |
|---|---|
| helmet-band | `tight crop across helmet visor band and shoulders, wide 16:9 banner` + shared |
| orb-close | `extreme close-up chest kit orbs MEMORY JUDGEMENT PAYMENTS glowing` + shared |
| hangar-raised | `hangar bay, suit facing camera, one hand raised near chest, LOGIC NEURAL EXEC orbs variant OK` + shared |
| helmet-portrait | `helmet portrait 2:3, wordmark and visor text legible` + shared |
| fullbody-hud | `full body suit, blue lightning HUD, 2:3, no corner watermark` + shared |
| rain-upper | `upper body in heavy rain, wrist rings visible, square` + shared |
| goggles-product | `product still of Goggles hardware on wet surface, brow wordmark 0xRay, cyan GOGGLES on lens` |

Attach the matching `FINAL-REFS/bots/…` file as the reference image when the tool allows.

## Checklist
- [ ] Pose matches requested id / ref
- [ ] Not the old exo suit; not refs 10/17/18/19
- [ ] Wordmark digit 0; visor text legible; orbs correct colors/labels
- [ ] Wrist rings present when arms in frame
- [ ] No pasted bot JPEG as the final plate (drawn/generated art only)
- [ ] No garbled AI captions on the suit chrome

## Dry-run location
Suit dry-runs stay out of this repo. Populate them when GenerateImage runs.
