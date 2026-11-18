---
name: live-plate
description: >
  Build a live-text stamped section. Use when a page should show plate
  words as HTML inside the shared metal kit instead of a flat PNG.
---

# Live plate

The page words are HTML. The metal follows the teardown below. The PNG is the raster twin.

## Teardown of site/assets/apex.png

Ground truth is `site/assets/apex.png` at `4f2a733` (1280×720), the stamped-table render on `base-C-console.jpg`. Numbers below are measured on that PNG. The recipe in `grok-bot/skills/draw-stamped-card/recipes/stamped-table/render.py` matches these edges. Reference plates for the family are `recipes/bifrost-storyboard/reference.png` and the base-C console in the draw-stamped-card skill.

- **Canvas.** 1280×720.
- **Outer frame.** Outer shadow lip x 0–13 and y 0–7, lum ~30, sample RGB (30, 31, 33) at (6, 6). Top face y 8–54 (46px), median lum 92–113, sample (124, 120, 119) at (640, 16). Side face x 22–64, median lum 58–70, with a 1px chamfer highlight at x 22 (lum 98). Right face x 1190–1254, outer dark from x 1264.
- **Inner bezel.** A recessed channel, not another row of bolts. Top channel y 55–81 (27px, lum falls to 0). Left channel x 66–77 (lum 2 at x 74), sample (25, 40, 47) at (70, 360). Inner lip then rises x 78–111 into the tray. The tray’s left lip is the lum jump to 206 at x 112.
- **Corner bolts.** Four. No mid-edge bolt passed a circle test on this plate. Dark-socket spans (pixels under lum 8): TL center (66, 55), span x 52–86 and y 37–71, about 34×34. TR (1220, 64), span x 1203–1237, y 47–81. BL (65, 669), span x 48–82, y 654–679. BR (1220, 670), span x 1203–1237, y 654–679. Horizontal center spacing 1154px. Vertical center spacing 614px.
- **Nameplate.** x 124–1156 (1032px), y 82–204 (122px), radius 10. Face median RGB (78, 81, 84). Raised: light top-left, dark bottom-right, drop shadow. Cyan underline y 196–199 (4px) from x 144–1136, paint (120, 225, 255) with glow (40, 170, 230).
- **Logo, title, subtitle.** Drawn logo width 220, left x 152, ink centered on y 140 (logo bitmap 220×96, cap height 66). Title SUIT is Black Ops with cap height 60 (90px face). Ink x 402–628, y 107–186. Fill near (235, 235, 235) plus a 1px shadow (8, 9, 11). A short cyan underline sits under the title only: x 394–627, y 176–181. Subtitle FOR AGENTS is Chakra Petch 29px, ink x 653–823 and y 129–150, fill (120, 225, 255), on the same midline as the title.
- **Tray.** x 98–1182 (1084px), y 214–520 (306px), radius 14. Recessed floor, sample near (34, 35, 37) in the recipe and median (51, 55, 59) where the lip mixes in. Inner shadow on the top-left lip.
- **Table header row.** One plaque, x 112–1168, y 222–262. Width 1056px. Height 40px. Radius 6. Face median (60, 64, 69). Cyan rim glow. Headers TOPIC and WHAT YOU GET are Chakra 28px, fill (120, 225, 255), left inset 22px. Column boundary at x 344.
- **Row cards.** Six plaques. Every one is x 112–1168, width 1056px, height 37px, radius 6, gap 4px. Tops: 266, 307, 348, 389, 430, 471. Bottoms: 303, 344, 385, 426, 467, 508. Face median (84, 87, 90). The top lip is 1px at about (198, 198, 200). The bottom lip falls to about (18, 18, 20). The gap between plaques is about (5, 5, 5). Same raised bevel as the header, plus a drop shadow. They are not separate per-column boxes. The label column and the body column share that one plaque.
- **Label column and divider.** Divider is the dark pair x 343–344 (median lum 29) plus a 1px highlight near x 346, from y 266 to y 508. Label column is x 112–344 (232px). Body column is x 344–1168 (824px). Text inset 22px from each column’s left. Labels: Barlow Condensed Bold 28, fill (236, 236, 232). Body: Barlow Condensed SemiBold 26, fill (214, 222, 226). Both have a 1px shadow (8, 9, 11).
- **Footer banner.** Recessed well x 160–1112 (952px), y 528–608 (80px). Inset shadow, cyan edge glow. Footer type is Chakra 30, fill (120, 225, 255), centered on (640, 568). Glyph ink spans about y 557–581.

The HTML plate uses this grid at 1280×720 and scales with the container. It does not restack the rows. A row box that is not 1056px wide at native size is wrong.

## Tokens and parts

- Tokens live in `site/kit/tokens.css`. Plate colors are the `plates/kit.json` palette from `cursor/v5-plates-restamp-72d4` at `ab36db743` (PR #523). That branch stays untouched.
- Board colors (`--bg`, `--panel`, `--line`, `--text`, `--teal`, `--dim`, `--glow`, `--foot`, `--focus`) are the dark theme from `house/live/app/public/index.html`. Do not edit the board.
- Parts live in `site/kit/parts/`. Geometry matches the kit SVGs. `palette:` names are locked to the kit hex because an external SVG cannot see custom properties. Do not redraw the parts.
- This page uses `frame`, `rivet`, `header`, `card`, `footer`, and `accent-rail`. `logo-slot` is vendored for a page that recesses the mark. This plate sets the drawn logo on the metal.
- Faces are Black Ops One (plate title), Chakra Petch (stamp labels), and Barlow Condensed (rows and UI). The board reads in Inter. A stamp page does not load that face, and `site/index.html` does not name it.

## Build a section

1. Build the apex plate from the teardown. The stage is 1280×720. The outer frame, four corner bolts, and the footer well are the console photograph `site/assets/console.jpg` (the same `base-C-console.jpg` the PNG is stamped on). HTML paints the recessed tray, the nameplate, one header plaque, six row plaques that are each 1056×37 with a 4px gap, the divider, and the type. Scale that stage with the container. Do not give each column its own box.
2. Put the words in light DOM. One `h1` on the page. A plate title is an `h2`. Rows are `role="table"` with column and row headers.
3. The mark is `site/kit/logo.png` from `draw_0xray_logo`. The first logo on the page has alt `0xRay`. A repeat has empty alt. Do not type a plain-font 0xRay, and do not paste `stamp-FINAL.png`, `favicon`, or `logo.jpg` as the mark. The digit 0 belongs inside the drawn logo.
4. Engrave type with `--engrave` (1px hard shadow). Cyan labels also take `--glow-soft`.
5. `.text-wave` is the board `nm-roll`: a 220% band, 1.2s linear, clipped to the glyphs. The band runs from `--ink` through `--glow`. Under `prefers-reduced-motion`, drop the image and set `--ink`. Both stops pass AA on `--metal` and `--bg`.
6. `.panel` is the board panel (surface, line, 10px radius). Use it for install, links, and FAQ answers.
7. A title that contains BIFROST uses `--rainbow` on rails and edges. Any other title stays `--cyan`.
8. `x-stamp` is a light-DOM custom element (`site/kit/stamp.js`). Zoom clones that element at width 1280 into the overlay. Close with the X button and Escape. Do not close on overlay click. `touch-action` stays pan. Strip ids and buttons from the clone.
9. Scale the whole 1280×720 plate to the viewport. `site/kit/stamp.js` measures `document.documentElement.clientWidth / 1280` on load and on resize. The stage is `position: absolute` because `transform: scale` does not change its layout box. The fit wrapper's layout width is that viewport width, its height is `720 * scale`, and `margin-left` / `margin-right` are `auto`. Do not use `zoom` or `cqw` for the scale. The row boxes stay 1056px wide in plate coordinates, so they stay equal. The lightbox clone clears the transform and the absolute position.

## Do not

- Do not edit `house/live` or the #523 branch.
- Do not invent a claim the plate source does not have.
- Do not put the plate words only in an image. The PNG is the twin, not the page.
- Do not rest a wave on a translucent stop. Reduced motion needs a solid color that passes AA.
- Do not wrap the whole plate in a button. The words stay document text. Enlarge is its own control.

## How this maps to an X PNG

- Same nodes, text, and order as the plate source. For this page that source is `site/apex-table.json`, and the twin is `site/assets/apex.png`.
- An X PNG on the kit branch is assembled from `plates/kit/` with `grok-bot/skills/draw-stamped-card/recipes/layered-flow/render.py`, and it must flow the same as its `.md`. This kit does not add a plate id or a lens.
- The PNG keeps width 1280 and grows in height before a font shrinks. The HTML stage stays 1280×720 and scales with the container. It does not restack the rows.
- Banned plate tokens (Dist, Arch1, ARCH1, emergence, preCompact, compaction) stay off the plate rows. A hero line may quote the docs poster.
