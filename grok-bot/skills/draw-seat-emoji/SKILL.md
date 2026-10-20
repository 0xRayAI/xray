---
name: Draw seat emoji
description: >-
  use this to give a fleet seat its mark on the live fleet map (avatar PNG,
  vector mark, or emoji glyph) without breaking the drawn fallback
---
# Draw seat emoji

Linked from `house/live/docs/fleet-setup.md`.

## How marks render
`house/live/app/public/index.html` `drawNode` picks, in order:
1. avatar image `avatars/<file>.png` (from `L.setAvatars`), drawn as-is about 46 px, no ring;
2. `L.MARK_PATH[node]`: SVG path on a 16 x 16 grid, scaled to 30 px, light fill `#f0f5ff`;
3. `L.GLYPH[node]`: emoji / symbol text, bold 30 px system emoji fonts, centred, glow when hot;
4. drawn letter badge in `L.COLOR[node]`.

## Steps (generic)
1. Pick the seat's emoji (one grapheme; keep the variation selector, e.g. `🎚️`).
2. In the fleet overlay (`house/live/site/public/site-config.js`), add it: `L.GLYPH.<seat> = '<emoji>';` (kit default `L.GLYPH` is `{}`).
3. For a crisp mark without fonts, add a 16 x 16 SVG path to `L.MARK_PATH.<seat>` instead.
4. For an image, ship a square 96 x 96 PNG at `site/public/avatars/<seat>.png` and add it to `L.setAvatars`. An image wins over glyph and mark.
5. Check the map in the browser (Playwright screenshot); a missing PNG must fall back, not 404-break.

## Our 8 seats
| Seat | Mark | Renders as today |
|---|---|---|
| blinky | 🖲️ | avatar `blinky.png` |
| critic | ✶ | avatar `critic.png` |
| forge | 🔥 | avatar `forge.png` |
| arch1 | avatar (minime0x) | avatar `arch1.png` |
| herald | 📡 | avatar `herald.png` |
| magnet | ☄️ | glyph |
| nibbler | 🪱 | glyph |
| sound | 🎚️ | glyph |
