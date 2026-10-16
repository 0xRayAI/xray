---
name: draw-0xray-logo
description: >-
  use when drawing the 0xRay wordmark or mark on any plate or suit — procedural
  draw from measured recipes, never paste stamp-FINAL.png as an overlay
---
# Draw 0xRay logo

## Ref (measure / checklist only — do not paste onto plates)
`00-0xray-stamp-FINAL.png` is the measure target. It is not in this repo.
Supporting: `0xray-logo-always-on-white.jpg` (light-bg look target), `0xray-logo-mark.png` (mark crop target).

## API
```python
from draw_0xray_logo import draw_0xray_logo, place_drawn_logo, compare_to_ref
logo = draw_0xray_logo(width=320, bg='dark')          # wordmark RGB on void
logo = draw_0xray_logo(320, bg='light')                # dark ink on light
logo = draw_0xray_logo(320, bg='transparent')          # RGBA
mark = draw_0xray_logo(100, variant='mark', bg='transparent')
plate, info = place_drawn_logo(plate, 'top-center', width=320, margin=36)
# info['clear_y'] = first Y where other type may start (logo bottom + 16)
```
Module: `grok-bot/skills/draw-stamped-card/recipes/bifrost-storyboard/lib/draw_0xray_logo.py`
Recipes: `grok-bot/skills/draw-stamped-card/recipes/bifrost-storyboard/lib/logo_glyphs/` (binary ink + orange maps measured from stamp-FINAL).

## Measured facts (from stamp-FINAL)
| Token | Value |
|---|---|
| Orange | `#DC5812` mean / bright `#E45809` |
| Stencil white | `#EBEBEB` |
| Void | `#08090B` |
| Content aspect | ~2.54 : 1 |
| Orange accents | diagonal hazard bands through **x**; small spatters on **0** and **y** |
| Spelling | digit **0** + `xRay` — never OxRay / O×Ray / XRay AI |

## Variants
- **wordmark** (default): full `0xRay` stencil + orange
- **mark**: x-region only (corners / tiny badges ≤120 px)
- **bg dark**: white+orange on void
- **bg light**: dark ink + orange on `#F5F7FA` (do not force the dark stamp onto white — use light variant)
- **transparent**: RGBA for compositing onto plates

## Clear space
≥16 px below logo before any other type (`place_drawn_logo` → `clear_y`). ≥24 px from frame/rivets.

## Checklist (vs ref at same width)
- [ ] Side-by-side `compare_to_ref` saved
- [ ] Orange slash + spatter visible (not white-only)
- [ ] Stencil bridges present on 0 / R / a / y
- [ ] Spelling digit zero
- [ ] No paste of `00-0xray-stamp-FINAL.png` onto the plate

## Ban
Pasting/opening the stamp PNG (or helmet crop) as the plate logo. Typing a plain-font `0xRay` / `OxRay` as a substitute for the drawn mark.
