---
name: live-plate
description: >
  Build a live-text stamped section. Use when a page should show plate
  words as HTML inside the shared metal kit instead of a flat PNG.
---

# Live plate

The page words are HTML. The metal is the shared kit. The PNG is the raster twin.

## Tokens and parts

- Tokens live in `site/kit/tokens.css`. Plate colors are the `plates/kit.json` palette from `cursor/v5-plates-restamp-72d4` at `ab36db743` (PR #523). That branch stays untouched.
- Board colors (`--bg`, `--panel`, `--line`, `--text`, `--teal`, `--dim`, `--glow`, `--foot`, `--focus`) are the dark theme from `house/live/app/public/index.html`. Do not edit the board.
- Parts live in `site/kit/parts/`. Geometry matches the kit SVGs. `palette:` names are locked to the kit hex because an external SVG cannot see custom properties. Do not redraw the parts.
- This page uses `frame`, `rivet`, `header`, `card`, `footer`, and `accent-rail`. `logo-slot` is vendored for a page that recesses the mark. This plate sets the drawn logo on the metal.
- Faces are Black Ops One (plate title), Chakra Petch (stamp labels), and Barlow Condensed (rows and UI). The board reads in Inter. A stamp page does not load that face, and `site/index.html` does not name it.

## Build a section

1. Paint the frame with `border-image` on `.plate-face` so it shows with CSS alone. Put one rivet SVG on each corner.
2. Put the words in light DOM. One `h1` on the page. A plate title is an `h2`. Rows are `role="table"` with column and row headers.
3. The mark is `site/kit/logo.png` from `draw_0xray_logo`. The first logo on the page has alt `0xRay`. A repeat has empty alt. Do not type a plain-font 0xRay, and do not paste `stamp-FINAL.png`, `favicon`, or `logo.jpg` as the mark. The digit 0 belongs inside the drawn logo.
4. Engrave type with `--engrave` (1px hard shadow). Cyan labels also take `--glow-soft`.
5. `.text-wave` is the board `nm-roll`: a 220% band, 1.2s linear, clipped to the glyphs. The band runs from `--ink` through `--glow`. Under `prefers-reduced-motion`, drop the image and set `--ink`. Both stops pass AA on `--metal` and `--bg`.
6. `.panel` is the board panel (surface, line, 10px radius). Use it for install, links, and FAQ answers.
7. A title that contains BIFROST uses `--rainbow` on rails and edges. Any other title stays `--cyan`.
8. `x-stamp` is a light-DOM custom element (`site/kit/stamp.js`). Zoom clones that element at width 1280 into the overlay. Close with the X button and Escape. Do not close on overlay click. `touch-action` stays pan. Strip ids and buttons from the clone.
9. Layout: the on-page plate wraps under a 700px container. The 1280 clone keeps the wide layout. At 390px nothing overflows. Do not shrink type below the sizes in `plate.css`.

## Do not

- Do not edit `house/live` or the #523 branch.
- Do not invent a claim the plate source does not have.
- Do not put the plate words only in an image. The PNG is the twin, not the page.
- Do not rest a wave on a translucent stop. Reduced motion needs a solid color that passes AA.
- Do not wrap the whole plate in a button. The words stay document text. Enlarge is its own control.

## How this maps to an X PNG

- Same nodes, text, and order as the plate source. For this page that source is `site/apex-table.json`, and the twin is `site/assets/apex.png`.
- An X PNG on the kit branch is assembled from `plates/kit/` with `grok-bot/skills/draw-stamped-card/recipes/layered-flow/render.py`, and it must flow the same as its `.md`. This kit does not add a plate id or a lens.
- The PNG keeps width 1280 and grows in height before a font shrinks. The HTML page wraps at a narrow container instead of shrinking below the kit sizes.
- Banned plate tokens (Dist, Arch1, ARCH1, emergence, preCompact, compaction) stay off the plate rows. A hero line may quote the docs poster.
