---
name: draw-stamped-card
description: >-
  use when making any 0xRay stamped X plate — pick one of the 3 bases, pick a
  layout, draw the logo via draw-0xray-logo, draw any suit via draw-me-a-suit
---

## Owner review log (read before every render)
- 2026-10-05 2:22 PM CT, Blaze: "weak, check sources, you are missing the LAYERED look." Flat single panels FAIL. Every base needs plates stacked on plates: background slab, then frame or bezel, then a recessed tray, then raised plaques, then bolts, then stamped type, then glow inlays. Each layer gets its own depth cues (drop shadow, inner shadow, bevel highlight, corner occlusion, overlap). Squint test: at 600px wide you must count at least 4 depth levels, or it fails.
- 2026-10-05 2:30 PM CT test: code-drawn metal plateaued around 60-75% of the ref's grit and depth. A generated BLANK base plate (no text, no logo; refs F01/F01c attached; prompt asks for a layered slab, frame, tray, and blank plaques) got real depth on the first try: `skill-dry-runs/draw-stamped-card/gen-bases/base-A-castiron-blank-gen1.jpg`. Direction pending owner OK: generate the blank base, then draw all type and the logo on top in code so wording and logo stay exact.
- 2026-10-05 ~2:35 PM CT, Blaze: OK'd "make em up" — PRIMARY = house gen-bases (blank layered plates) + code-drawn type/logo via compose_gen_bases.py. Reuse bases for uniformity; new layout needs GenerateImage (main agent) + owner OK. Code-drawn metal = fallback.
- Before rendering, open the source refs in FINAL-REFS/stamped/ and compare a crop of the source against the same region of your render. Never judge from memory.
- Logo is DRAWN via draw-0xray-logo, never pasted. Suits come from Grok Imagine (see draw-me-a-suit). Maximum 3 bases.
- 2026-10-15 04:41 CT, Blaze: "text alignment is off and the words are not sharp." Root cause: `emboss_in` fills each glyph with a noisy `metal()` texture (fill std ~52 vs ~25 for a flat fill) and runs blurred bevel light/dark bands across 1–3 px mono strokes. Terms were centered (`mm`) instead of a column, and `base-B-ledger.boxes.json` rows sat ~20–30 px above the real wells (now re-measured: `row_centers_measured`). Rules:
  - **Final type last, at native 1280×720:** draw it after every metal/plaque/shadow layer with `ImageDraw.text`, using a flat fill and at most a 1 px hard offset shadow beneath. No blur, emboss, texture or overlay over the glyph fill. Don't resize after type. Save **PNG** (not JPEG).
  - `emboss_in` is for titles ≥52 px on cast-iron only; never use it for body or mono text.
  - **Columns:** terms left-aligned at a fixed x (well left + ~40). Definitions left-aligned at a fixed x (divider + ~24). Anchor `lm` on each row's measured well center. Assert that the widest string fits its column.
  - Measure row and well centers from base pixels (grooves) before trusting boxes.json.
  - No type over rivets: shorten the text, or lay a raised nameplate (`raised_plaque`) over the header rivets and set the type and logo on it.
- 2026-10-15 1:50 PM CT, Blaze: Bifrost always appears with its rainbow (6-color rails or underline) on any plate that names Bifrost.

# Draw stamped card

## Source of truth
FINAL-REFS: `/workspace/dist-media/brand/FINAL-REFS/`
Logo: [draw-0xray-logo](sand-workflow:draw-0xray-logo) · Suit: [draw-me-a-suit](sand-workflow:draw-me-a-suit)
Kit: `/workspace/dist-media/release/src/metal_kit.py` · dry-run: `dry_run_stamped.py`


## PRIMARY method (Blaze OK 2026-10-05): generated blank base + code type/logo

1. **Reuse a house base** from `/workspace/dist-media/brand/skill-dry-runs/draw-stamped-card/gen-bases/` (do **not** regenerate for the same layout — uniformity).
2. Load matching `*.boxes.json` for plaque/well coordinates.
3. Draw type with `metal_kit` emboss (silver emboss cast-iron; cyan/mono for ledger & capsules).
4. Draw logo with [draw-0xray-logo](sand-workflow:draw-0xray-logo) into the header well or header-right — never paste stamp-FINAL; never cover plaque edges awkwardly.
5. Composer: `/workspace/dist-media/release/src/compose_gen_bases.py`

### House base library (1280×720)
| File | Layout | Boxes JSON |
|---|---|---|
| `base-A-dial-kinds.jpg` | dial-kinds | `base-A-dial-kinds.boxes.json` |
| `base-A-two-panel.jpg` | two-panel-edu | `base-A-two-panel.boxes.json` |
| `base-B-tiles.jpg` | riveted-tiles | `base-B-tiles.boxes.json` |
| `base-B-ledger.jpg` | cyan-ledger | `base-B-ledger.boxes.json` |
| `base-C-rows.jpg` | tech-rows | `base-C-rows.boxes.json` |
| `base-C-console.jpg` | console-core | `base-C-console.boxes.json` |

### Generating a **new** layout base (main agent only)
GenerateImage is only reachable from the main agent. Prompt essence:
- Dark cast-iron / brushed steel / tech-console material matching base A/B/C
- Explicit **layer list**: outer frame + bolts, recessed tray, raised plaques/wells (name each blank region), cyan grooves if B/C
- **Blank**: NO text, NO letters, NO logos, NO numbers
- Attach FINAL-REFS stamped refs for style
- Output 16:9; then upscale to 1280×720, measure boxes → JSON, get **owner OK** before adding to the library

### Fallback
Code-drawn metal (`dry_run_stamped.py` / `metal_kit.outer_frame`…) remains available if no gen-base exists yet.


## Canvas / readability (all bases)
- 16:9 · **1280×720**
- Minimum type sizes (legible when the plate is ~600 px wide on X): title ≥ **52 px**, section ≥ **28 px**, body ≥ **26 px**, footer ≥ **18 px**, mono ≥ **20 px**
- Max ~42 chars body lines; friend-test 3 seconds
- `assert_glyphs` + `ban_check` every string
- 200% crop of body type vs previous render: glyph edges crisp, flat fill (see 2026-10-15 log)
- No PROPOSED/date on shipping art; spelling digit **0** only inside the **drawn** logo (never type OxRay / plain-font 0xRay as the brand mark)
- Blaze approves before post; image on every post; vary base+layout across a thread

---


---

## REQUIRED: layer stacks (plates on plates)

Renders that look like one flat panel **fail**. Every card must show **≥4 distinct depth levels** in a squint test at ~600 px wide. Light from **top-left**.

### Base A — Cast-iron (F00/F01/F01b)
| Depth | Layer | Numeric cues |
|---|---|---|
| 0 back | Background slab | metal tone (54,54,55), rough≥1.4, pits≥0.005, scratches≥200 |
| 1 | Raised outer frame band | band ~24 px, radius ~26; bevel depth 3 soft 2.2 hi 0.55 lo 0.7 |
| 1b | Corner tabs + bolts | tab ~34 px overlapping frame; bolt r=8–10 with own shadow dx2 dy3 + AO ring |
| 2 | Recessed tray floor | floor tone ~(48,48,49); recessed emboss depth 4 soft 3; AO soft 6–8 a≥0.5 |
| 3 | Raised sub-plaques / dial / chips | drop shadow dx5 dy7 blur 8–10 a≥0.75; bevel depth 3; rivets on plaques |
| 4 front | Embossed title + needle/orb | title emboss depth 3 inside stone; dial R≥140 with shadow dx6 dy8; needle above dial |

**Squint check A:** slab → frame/bolts → tray → dial/plaques → embossed title (≥5). Fail if tray lip or dial shadow invisible.

### Base B — Riveted cyan-steel (F02/F04)
| Depth | Layer | Numeric cues |
|---|---|---|
| 0 | Dark slab bg | tone (34,34,35), vignette OK, scratches |
| 1 | Raised plaques (header/tiles/footer) | shadow dx5 dy7 blur 8–10 a 0.78; bevel 3/1.6/0.55/0.7; edge wear on TL rim |
| 2 | Rivets on each plaque | r=6–8; bolt shadow + AO; 4 per plaque |
| 3 | Embossed Playfair / cyan rules | text emboss depth 2; cyan rule 2 px engraved or glow |
| (ledger) | Chamfered plate + screws on slab | outer chamfer plate raised; table well recessed depth 3 |

**Squint check B:** bg → plaques floating → rivets → stamped type (≥4). Fail if plaques look painted-on (no shadow/bevel).

### Base C — Tech-console (F05/F06)
| Depth | Layer | Numeric cues |
|---|---|---|
| 0 | Brushed slab | tone (40,41,43) |
| 1 | Outer chamfer/bezel band | band ≥32 px; chamfer cut ~44; cyan light strip in recessed channel |
| 1b | Corner hex/bolts on bezel | recessed or raised bolts with AO |
| 2 | Inner lip / nested frame | second raised rim inside bezel |
| 3 | Recessed wells / capsules / core circle | inner shadow; cyan glow on rim; seat modules as raised_plaque |
| 4 | Drawn logo + hero type | logo via draw-0xray-logo; optional drop shadow under logo |

**Squint check C:** slab → bezel → inner lip → recessed wells/modules → logo/title (≥4). Fail if cyan boxes look flat stickers.

### Implementation
Use `metal_kit.outer_frame`, `recessed_tray`, `raised_plaque`, `bolt`, `corner_tab`, `ao_in_mask`. Do not skip drop shadows on raised pieces.


## The 3 bases (only)

### Base A — Cast-iron
**Why:** Strongest master family (F00/F01/F01b/F01c). Heavy, embossed, monochrome industrial — the house default for edu + dial explainers.
| Spec | Value |
|---|---|
| Metal | tone `(54,54,55)`, rough 1.25, pits 0.004, scratches |
| Frame | rounded outer ~26 px radius, raised border band ~24 px, rivets at corners (+ mid-top/bottom) |
| Type | **Black Ops One** embossed silver `(170,168,162)` titles; Chakra / Barlow body ink `#E4E4E0` |
| Accent | optional cyan subtitle only `#5AD6DE` — no cyan frame lights |
| Light | top-left emboss |
| Logo | draw-0xray-logo wordmark **top-right** width **200–240**, margin 36; OR top-center 280 if no large title competing |
| Clear | text starts at `clear_y` from place_drawn_logo |

Layouts on A: `dial-kinds` · `two-panel-edu` · `kinds-table`

### Base B — Riveted cyan-steel
**Why:** F02 tiles + F04 ledger share dark steel + cyan accent without cast-iron emboss titles. Best for kits four-up and glossary tables.
| Spec | Value |
|---|---|
| Metal | bg `(34,34,35)`; plaque `(70–78,69–77,67–74)` riveted tiles |
| Frame | **floating plaques** (no single outer cast frame) OR chamfered ledger plate with corner screws |
| Type | **Playfair Black** embossed on tiles/headers; OR Allerta/Black Ops cyan stencil title for ledger; IBM Plex Mono table |
| Accent | cyan `#5AD6DE` rules / terms / glow |
| Logo | draw-0xray-logo **top-right** on void / header edge, width **220–280**; mark variant OK on tile corner |
| Clear | ≥16 px under logo |

Layouts on B: `riveted-tiles` · `cyan-ledger`

### Base C — Tech-console
**Why:** F05 bezel + F06 tech-frame are the cyan-lit HUD family for release flows and suit-core callouts.
| Spec | Value |
|---|---|
| Metal | `(40,41,43)` brushed bezel / chamfer band `(66,68,71)` |
| Frame | chamfer cut ~44 px **or** thick rounded bezel ~36–48 px; cyan corner light strips; rivets/hex bolts |
| Type | Russo / Barlow Condensed rows; distressed hero title OK; cyan glow accents |
| Accent | cyan paint `(120,225,255)` glow `(40,170,230)` |
| Logo | draw-0xray-logo **top-center** width **300–360**; first text ≥ `clear_y` (no overlap with version line) |
| Suit | optional: draw-me-a-suit pose on left/right/band |

Layouts on C: `tech-rows` · `console-core` · `suit-split`

---

## Layout catalog
| Layout | Base | Structure | Posts |
|---|---|---|---|
| `dial-kinds` | A | Title + left numbered kinds + right scope dial | Goggles / organ scope |
| `two-panel-edu` | A | Title + cyan sub + 2 recessed panels + flow bar | Edu explainers |
| `kinds-table` | A | Title + 3×2 engraved table | Spec tables |
| `riveted-tiles` | B | Header plaque + 4 riveted tiles + footer plaque | Kits / four-up release |
| `cyan-ledger` | B | Cyan stencil title + mono 2-col table | Glossary / lexicon |
| `tech-rows` | C | Drawn logo top-center + 4 chamfered/capsule rows | Release flows |
| `console-core` | C | Bezel + pill + hero title + core circle + 4 seat modules | Suit core / host pack |
| `suit-split` | C | draw-me-a-suit left (~50%) + stamped panel right | Edu intros (≤1/thread) |
| `storyboard-snake` | C | Nameplate (logo + stamped title + sub) + 2×3 snake of step plaques + rainbow arrows + footer | Flow / "how it works" (Bifrost) |

Dropped as own bases: brass nameplate (fold into A with brass ink only if Blaze asks — default off); old F09-as-default overuse.

## Storyboard layout (C / storyboard-snake)
**Use when** a plate explains a 6-step flow ("how X works"); the Bifrost storyboard is the approved reference.
Recipe (self-contained: lib, fonts, base, glyphs all inside): `recipes/bifrost-storyboard/`

```bash
cd /home/box/agent-data/workflows/draw-stamped-card/recipes/bifrost-storyboard
python3 render.py --out /path/plate.png                       # approved Bifrost plate (byte-identical to reference.png)
python3 render.py --out /path/new.png --steps my-steps.json    # new storyboard: copy steps.json, swap title/sub/footer/steps
# add --previews for a 600px preview and a 200% crop beside the output
```
`steps.json` = `title`, `sub`, `footer`, and 6 `steps` of `[HEADING, line1, line2]` in snake order (row 1 L→R, row 2 R→L). Icons are fixed per slot (card, bolt, chevrons, bomb, packet, cloud); the script asserts every string fits its plaque — shorten text, never shrink fonts.

**Mandatory rules**
- Bifrost always carries its rainbow: 3 px red→violet underline with glow under the title, and rainbow-graded flow arrows.
- Stamped title cap height ≤ the drawn 0xRay logo's cap height (60 vs 66 px) and centered on the logo midline (nameplate y=140).
- Arrows + icons show order — no number badges.
- 3-second read at 600 px wide; type last, flat fill, PNG out (see review log).
- Compare your render with `recipes/bifrost-storyboard/reference.png` before handing it off.

## Renderer map
| Layout | Function |
|---|---|
| dial-kinds / two-panel-edu | `dry_run_stamped.py` / adapt `plate_4040` |
| riveted-tiles | `plate_029` + drawn logo |
| tech-rows | `plate_4039` path + drawn logo + clear_y |
| cyan-ledger / console-core / suit-split | `dry_run_stamped.py` |
| storyboard-snake | `recipes/bifrost-storyboard/render.py` |

## Pass/fail (every card)
- [ ] Exactly one of bases A/B/C
- [ ] Logo from draw-0xray-logo (orange visible); no typed brand wordmark
- [ ] Suit from draw-me-a-suit if any (no pasted bot JPEG)
- [ ] Min type sizes; no tofu; no Arch1; no old suit; no PROPOSED
- [ ] Clear space under logo; 1280×720
- [ ] Type drawn last, flat fill, ≤1 px hard shadow, PNG out; no type over rivets
- [ ] Terms/defs on fixed-x columns, rows centered on measured wells
