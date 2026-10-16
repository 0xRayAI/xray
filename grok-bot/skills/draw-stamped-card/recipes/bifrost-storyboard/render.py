"""Bifrost storyboard plate on house base C-console (compose_gen_bases path)."""
# Self-contained recipe: all deps live beside this script (lib/, assets/).
# Usage: python3 render.py --out /path/plate.png [--steps steps.json] [--accent rainbow|cyan]
import sys, json, argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / 'lib'))
import metal_kit
from metal_kit import *
FD = HERE / 'assets' / 'fonts'
metal_kit.FONTS.update({'blackops': str(FD / 'BlackOpsOne-Regular.ttf'), 'barlowc': str(FD / 'BarlowCondensed-Bold.ttf'),
                        'barlowc_sb': str(FD / 'BarlowCondensed-SemiBold.ttf'), 'chakra': str(FD / 'ChakraPetch-Bold.ttf')})
from draw_0xray_logo import draw_0xray_logo
ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--steps', default=str(HERE / 'steps.json'))
ap.add_argument('--accent', choices=['rainbow', 'cyan'], help='override steps.json "accent"; default rainbow if title names BIFROST, else cyan')
ap.add_argument('--previews', action='store_true', help='also write <out>.600.png and <out>.crop200.png')
ARGS = ap.parse_args()
CFG = json.loads(Path(ARGS.steps).read_text())
OUT = Path(ARGS.out)
TITLE, SUB = CFG['title'], CFG['sub']
# rainbow is Bifrost-only (brand rule 2026-10-15); every other plate uses cyan #5AD6DE
ACCENT = ARGS.accent or CFG.get('accent') or ('rainbow' if 'BIFROST' in TITLE.upper() else 'cyan')
assert ACCENT in ('rainbow', 'cyan'), ACCENT
ACCENT_CY = np.array((0x5A, 0xD6, 0xDE), np.float32)
T_TITLE, T_SEC, T_BODY, T_FOOT = 52, 28, 26, 18  # house minimums (compose_gen_bases)
BASES = HERE / 'assets' / 'bases'
def load(name):
    return Image.open(BASES / f'{name}.jpg').convert('RGB'), json.loads((BASES / f'{name}.boxes.json').read_text())
CY = (120, 225, 255); GL = (40, 170, 230); INK = (236, 236, 232)
img, b = load('base-C-console')
a = np.asarray(img, np.float32).copy()

# L3: recessed tray over the module/core region (measured: modules y~238-488 @1280)
a, _ = recessed_tray(a, (98, 214, 1182, 520), radius=14, depth=4, soft=3.0, floor_tone=(34, 35, 37), seed=41)
# L3b raised nameplate over header well (covers header area; no rivets under type)
NP = (124, 82, 1156, 204)
a, npm = raised_plaque(a, NP, 7, tone=(66, 68, 71), radius=10, rivet_r=0)
# cyan inlay groove under nameplate
a = glow(a, rect_mask((NP[0]+20, NP[3]-8, NP[2]-20, NP[3]-5)), GL, 6, 0.9)
a = paint(a, rect_mask((NP[0]+20, NP[3]-8, NP[2]-20, NP[3]-5)), CY, 0.9)

# L4 step plaques: 2 rows x 3, snake (row2 right->left)
PW, PH, GAP = 300, 136, 62
X0 = 112; ROWS = (226, 372)
xs = [X0 + i * (PW + GAP) for i in range(3)]
pos = [(xs[0], ROWS[0]), (xs[1], ROWS[0]), (xs[2], ROWS[0]), (xs[2], ROWS[1]), (xs[1], ROWS[1]), (xs[0], ROWS[1])]
for i, (x, y) in enumerate(pos):
    a, m = raised_plaque(a, (x, y, x + PW, y + PH), 100 + i, tone=(72, 74, 77), radius=10, rivet_r=0)
    a = glow(a, np.clip(m - blur(m, 1.2), 0, 1), GL, 4, 0.55)  # cyan rim glow

# connectors: chevron arrows with glow
def arrow_mask(pts):
    return poly_mask(pts)
arrows = []
for i in range(2):  # row1 right
    gx = xs[i] + PW; cy = ROWS[0] + PH / 2
    arrows.append([(gx+12, cy-10), (gx+34, cy-10), (gx+34, cy-20), (gx+52, cy), (gx+34, cy+20), (gx+34, cy+10), (gx+12, cy+10)])
for i in range(2):  # row2 left
    gx = xs[i] + PW; cy = ROWS[1] + PH / 2
    arrows.append([(gx+50, cy-10), (gx+28, cy-10), (gx+28, cy-20), (gx+10, cy), (gx+28, cy+20), (gx+28, cy+10), (gx+50, cy+10)])
# down connector 3 -> 4 at right of col 3
rx = xs[2] + PW + 20
arrows.append([(rx-4, ROWS[0]+PH/2), (rx+4, ROWS[0]+PH/2), (rx+4, ROWS[1]+PH/2-14), (rx+12, ROWS[1]+PH/2-14),
               (rx, ROWS[1]+PH/2+4), (rx-12, ROWS[1]+PH/2-14), (rx-4, ROWS[1]+PH/2-14)])
arrows.append([(xs[2]+PW, ROWS[0]+PH/2-4), (rx+4, ROWS[0]+PH/2-4), (rx+4, ROWS[0]+PH/2+4), (xs[2]+PW, ROWS[0]+PH/2+4)])
# Bifrost rainbow (brand rule 2026-10-15): spectrum red -> violet
SPEC = np.array([(235, 52, 52), (245, 140, 30), (245, 220, 40), (60, 200, 90), (50, 140, 245), (150, 70, 230)], np.float32)
def spectrum(t):
    t = np.clip(t, 0, 1) * (len(SPEC) - 1); i = np.minimum(t.astype(int), len(SPEC) - 2); f = (t - i)[..., None]
    return SPEC[i] * (1 - f) + SPEC[i + 1] * f
def rainbow_paint(a, m, axis, lo, hi, glow_r=7, ga=0.9, reverse=False):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    t = ((xx if axis == 'x' else yy) - lo) / max(hi - lo, 1)
    if reverse: t = 1 - t
    col = spectrum(t) if ACCENT == 'rainbow' else np.broadcast_to(ACCENT_CY, t.shape + (3,))
    g = blur(m, glow_r)[..., None] * ga
    a = np.clip(a + g * col, 0, 255)
    return a * (1 - m[..., None]) + col * m[..., None]
for k, p in enumerate(arrows):
    m = arrow_mask(p)
    a = drop_shadow(a, m, 2, 3, 3, 0.6)
    xs_ = [q[0] for q in p]; ys_ = [q[1] for q in p]
    if k == 4:   # down connector: graded top -> bottom
        a = rainbow_paint(a, m, 'y', min(ys_), max(ys_))
    else:        # graded along direction of travel
        a = rainbow_paint(a, m, 'x', min(xs_), max(xs_), reverse=(k in (2, 3)))

img = to_img(a)
# drawn logo on nameplate (left); align logo CAP band (measured ink rows) to nameplate center line
MID = 140  # measured face center of nameplate (82..204 minus bottom cyan groove at 196-199)
logo = draw_0xray_logo(220, bg='transparent')
la = np.asarray(logo)[..., 3]
cap_rows = np.nonzero(la[:, :50].max(1) > 128)[0]  # the '0' glyph = cap height
CAP_T, CAP_B = int(cap_rows.min()), int(cap_rows.max()); CAP_H = CAP_B - CAP_T + 1
img = img.convert('RGBA'); lx = NP[0] + 28; ly = int(MID - (CAP_T + CAP_B) / 2)
img.alpha_composite(logo, (lx, ly))

def stamped_word(text, cap_h, seed=5):
    """Stencil stamp in the logo's family: same white/orange inks, alpha-holed wear,
    stencil bridges, orange spatter (logo recipes are baked maps, so wear is procedural)."""
    from draw_0xray_logo import WHITE, ORANGE
    sz = 20
    while True:  # largest size whose cap height <= cap_h
        bbn = font('blackops', sz + 1).getbbox('B')
        if bbn[3] - bbn[1] > cap_h: break
        sz += 1
    f = font('blackops', sz)
    bb = f.getbbox(text); w, h = bb[2] - bb[0] + 8, bb[3] - bb[1] + 8
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).text((4 - bb[0], 4 - bb[1]), text, font=f, fill=255)
    m = np.asarray(m, np.float32) / 255
    rng = np.random.default_rng(seed)
    n = fbm(h, w, seed, 5, 6); n = (n - n.min()) / (np.ptp(n) + 1e-6)
    holes = (n > 0.95).astype(np.float32) * 0.0  # big holes broke letter shapes; pitting only               # worn-off patches
    speck = (rng.random((h, w)) < 0.02).astype(np.float32)  # pitting
    wear = np.clip(holes + speck, 0, 1)
    # stencil bridges: a thin horizontal cut through each letter at mid height (like logo bridges)
    ink = m * (1 - wear)
    
    # scratches
    for _ in range(6):
        x0 = rng.integers(0, w); y0 = rng.integers(0, h); L = rng.integers(10, 40)
        for k in range(L):
            xx, yy = x0 + k, y0 + k // 4
            if 0 <= xx < w and 0 <= yy < h: ink[yy, xx] *= 0.35
    ora = np.zeros_like(ink)
    for _ in range(14):  # orange spatter, as on logo 0 / y
        cx, cy, r = rng.integers(0, w), rng.integers(0, h), rng.uniform(1, 2.6)
        yy, xx = np.mgrid[0:h, 0:w]; ora = np.maximum(ora, (np.hypot(xx - cx, yy - cy) <= r) * m)
    rgb = np.array(WHITE, np.float32) * (1 - ora[..., None]) + np.array(ORANGE, np.float32) * ora[..., None]
    alpha = np.clip(np.maximum(ink, ora), 0, 1)
    out = np.dstack([rgb, alpha[..., None] * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA'), 4  # 4 = top pad to cap top

TITLE_CAP = CAP_H - 6
word, pad = stamped_word(TITLE, TITLE_CAP, seed=23)
tx = lx + logo.width + 22
wy = int(MID - TITLE_CAP / 2) - pad
assert tx + word.width <= NP[2] - 24
img.alpha_composite(word, (tx, wy)); img = img.convert('RGB')
TW = word.width
# rainbow underline under BIFROST: one smooth L->R spectrum hairline with soft glow (hero-image style)
uy = wy + pad + TITLE_CAP + 7
ua = np.asarray(img, np.float32).copy()
um = rect_mask((tx, uy, tx + TW - 8, uy + 3), radius=1)
ua = rainbow_paint(ua, um, 'x', tx, tx + TW - 8, glow_r=4, ga=1.1)
img = to_img(ua)
d = ImageDraw.Draw(img)

# icons (simple shapes, cyan) next to badge
def icon(k, x, y):  # box x..x+30, y..y+30
    c = CY; w = 3
    if k == 0:  # card
        d.rounded_rectangle((x, y+3, x+30, y+27), 4, outline=c, width=w)
        d.line((x+6, y+11, x+24, y+11), fill=c, width=w); d.line((x+6, y+18, x+18, y+18), fill=c, width=w)
    elif k == 1:  # wake: lightning bolt
        d.polygon([(x+18, y), (x+5, y+17), (x+14, y+17), (x+10, y+30), (x+26, y+11), (x+16, y+11)], fill=c)
    elif k == 2:  # nudge: double chevron
        for o in (0, 12):
            d.line((x+o+2, y+5, x+o+13, y+15, x+o+2, y+25), fill=c, width=4, joint='curve')
    elif k == 3:  # tripwire: bomb
        d.ellipse((x+1, y+8, x+23, y+30), fill=c); d.line((x+18, y+10, x+24, y+4), fill=c, width=3)
        d.line((x+24, y+4, x+29, y+1), fill=(255, 180, 60), width=3)
    elif k == 4:  # handoff: packet box + arrow
        d.rectangle((x, y+8, x+18, y+26), outline=c, width=w); d.line((x, y+14, x+18, y+14), fill=c, width=2)
        d.polygon([(x+20, y+11), (x+30, y+17), (x+20, y+23)], fill=c)
    elif k == 5:  # cloud
        d.ellipse((x, y+12, x+16, y+28), fill=c); d.ellipse((x+8, y+4, x+26, y+22), fill=c)
        d.ellipse((x+16, y+12, x+30, y+28), fill=c); d.rectangle((x+8, y+20, x+22, y+28), fill=c)

STEPS = [tuple(x) for x in CFG['steps']]
FOOT = CFG['footer']
ban_check([TITLE, SUB, FOOT] + [s for t in STEPS for s in t])

def t(xy, s, k, sz, fill, anchor='lm'):
    assert_glyphs(k, s); f = font(k, sz)
    d.text((xy[0]+1, xy[1]+1), s, font=f, fill=(8, 9, 11), anchor=anchor)
    d.text(xy, s, font=f, fill=fill, anchor=anchor)
    return d.textlength(s, font=f)

for i, (x, y) in enumerate(pos):
    icon(i, x + 18, y + 21)
    assert d.textlength(STEPS[i][0], font=font('barlowc', 32)) <= PW - 62 - 18
    for ln in STEPS[i][1:]:
        assert d.textlength(ln, font=font('barlowc_sb', T_BODY)) <= PW - 36, ln

# --- TYPE LAST, flat fill, native size ---
# SUB: 'lm' centers on font ascent/descent, so center on measured cap box instead
fs = font('chakra', 29); sb = fs.getbbox(SUB, anchor='ls')
sx = tx + TW + 16
assert sx + d.textlength(SUB, font=fs) <= NP[2] - 22, (sx, d.textlength(SUB, font=fs), TW, tx)
t((sx, MID - (sb[1] + sb[3]) / 2), SUB, 'chakra', 29, CY, 'ls')
for i, (x, y) in enumerate(pos):
    t((x + 62, y + 36), STEPS[i][0], 'barlowc', 32, INK)
    t((x + 18, y + 84), STEPS[i][1], 'barlowc_sb', T_BODY, (214, 222, 226))
    t((x + 18, y + 113), STEPS[i][2], 'barlowc_sb', T_BODY, (214, 222, 226))
# footer in measured base footer well (~160-1112 x 528-608)
assert d.textlength(FOOT, font=font('chakra', 30)) <= 1112 - 160 - 40
t((640, 568), FOOT, 'chakra', 30, CY, 'mm')
img.save(OUT)
if ARGS.previews:
    img.resize((600, 338), Image.LANCZOS).save(OUT.with_suffix('.600.png'))
    img.crop((100, 200, 500, 400)).resize((800, 400), Image.NEAREST).save(OUT.with_suffix('.crop200.png'))
print('saved', OUT)
