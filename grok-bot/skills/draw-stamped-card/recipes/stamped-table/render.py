"""Stamped table plate on house base C-console: nameplate (drawn 0xRay logo + stamped title + sub)
+ header row + 4-7 raised row plaques, fixed-x columns, footer. Reuses ../bifrost-storyboard lib/assets."""
# Usage: python3 render.py --out /path/plate.png --table table.json [--accent cyan|rainbow] [--previews]
# More than MAX_ROWS rows -> split into <out>-1.png, <out>-2.png ... (footer gets " 1/2").
import sys, json, argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
HERE = Path(__file__).resolve().parent
SB = HERE.parent / 'bifrost-storyboard'
sys.path.insert(0, str(HERE.parent.parent / 'lib'))
sys.path.insert(0, str(SB / 'lib'))
import metal_kit
from metal_kit import *
FD = SB / 'assets' / 'fonts'
metal_kit.FONTS.update({'blackops': str(FD / 'BlackOpsOne-Regular.ttf'), 'barlowc': str(FD / 'BarlowCondensed-Bold.ttf'),
                        'barlowc_sb': str(FD / 'BarlowCondensed-SemiBold.ttf'), 'chakra': str(FD / 'ChakraPetch-Bold.ttf')})
from draw_0xray_logo import draw_0xray_logo, WHITE, ORANGE
from accent import resolve_accent

ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--table', default=str(HERE / 'table.json'))
ap.add_argument('--accent', choices=['rainbow', 'cyan'], help='accent request; resolved by draw-stamped-card/lib/accent.py')
ap.add_argument('--previews', action='store_true')
ARGS = ap.parse_args()
CFG = json.loads(Path(ARGS.table).read_text())
TITLE, SUB, FOOT, COLS, ROWS = CFG['title'], CFG['sub'], CFG['footer'], CFG['columns'], CFG['rows']
ACCENT = resolve_accent(TITLE, ARGS.accent or CFG.get('accent'))
assert 2 <= len(COLS) <= 3 and all(len(r) == len(COLS) for r in ROWS), 'columns: 2-3, every row same width'
MIN_ROWS, MAX_ROWS = 4, 7
T_HEAD, T_TERM, T_BODY, T_FOOT = 28, 28, 26, 30   # >= house minimums (section 28, body 26, footer 18)
CY = (120, 225, 255); GL = (40, 170, 230); INK = (236, 236, 232); ACC = (0x5A, 0xD6, 0xDE)
SPEC = np.array([(235, 52, 52), (245, 140, 30), (245, 220, 40), (60, 200, 90), (50, 140, 245), (150, 70, 230)], np.float32)

# geometry: tray 98..1182 x 214..520 (measured base), footer well 160..1112 x 528..608
TX0, TX1, TY0, TY1 = 112, 1168, 222, 512
# column x: fractions of the table width (default 2-col 0.27 / 0.73, 3-col 0.24 / 0.38 / 0.38)
FR = CFG.get('col_fracs') or ([0.27, 0.73] if len(COLS) == 2 else [0.24, 0.38, 0.38])
assert abs(sum(FR) - 1) < 1e-6
CX = [TX0 + int(sum(FR[:i]) * (TX1 - TX0)) for i in range(len(COLS))] + [TX1]
PAD = 22  # text inset from column/divider x

def spectrum(t):
    t = np.clip(t, 0, 1) * (len(SPEC) - 1); i = np.minimum(t.astype(int), len(SPEC) - 2); f = (t - i)[..., None]
    return SPEC[i] * (1 - f) + SPEC[i + 1] * f
def accent_paint(a, m, lo, hi, glow_r=4, ga=1.1):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    col = spectrum((xx - lo) / max(hi - lo, 1)) if ACCENT == 'rainbow' else np.broadcast_to(np.array(ACC, np.float32), (H, W, 3))
    a = np.clip(a + blur(m, glow_r)[..., None] * ga * col, 0, 255)
    return a * (1 - m[..., None]) + col * m[..., None]

def stamped_word(text, cap_h, seed=5):  # same stamp as the storyboard title
    sz = 20
    while font('blackops', sz + 1).getbbox('B')[3] - font('blackops', sz + 1).getbbox('B')[1] <= cap_h: sz += 1
    f = font('blackops', sz); bb = f.getbbox(text); w, h = bb[2] - bb[0] + 8, bb[3] - bb[1] + 8
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).text((4 - bb[0], 4 - bb[1]), text, font=f, fill=255)
    m = np.asarray(m, np.float32) / 255; rng = np.random.default_rng(seed)
    ink = m * (1 - (rng.random((h, w)) < 0.02))
    for _ in range(6):
        x0, y0, L = rng.integers(0, w), rng.integers(0, h), rng.integers(10, 40)
        for k in range(L):
            if 0 <= x0 + k < w and 0 <= y0 + k // 4 < h: ink[y0 + k // 4, x0 + k] *= 0.35
    ora = np.zeros_like(ink); yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(14):
        cx, cy, r = rng.integers(0, w), rng.integers(0, h), rng.uniform(1, 2.6); ora = np.maximum(ora, (np.hypot(xx - cx, yy - cy) <= r) * m)
    rgb = np.array(WHITE, np.float32) * (1 - ora[..., None]) + np.array(ORANGE, np.float32) * ora[..., None]
    return Image.fromarray(np.dstack([rgb, np.clip(np.maximum(ink, ora), 0, 1)[..., None] * 255]).astype(np.uint8), 'RGBA'), 4

def render(rows, foot, out):
    n = len(rows); assert MIN_ROWS <= n <= MAX_ROWS, n
    img = Image.open(SB / 'assets' / 'bases' / 'base-C-console.jpg').convert('RGB')
    a = np.asarray(img, np.float32).copy()
    a, _ = recessed_tray(a, (98, 214, 1182, 520), radius=14, depth=4, soft=3.0, floor_tone=(34, 35, 37), seed=41)
    NP = (124, 82, 1156, 204)
    a, _ = raised_plaque(a, NP, 7, tone=(66, 68, 71), radius=10, rivet_r=0)
    g = rect_mask((NP[0]+20, NP[3]-8, NP[2]-20, NP[3]-5)); a = glow(a, g, GL, 6, 0.9); a = paint(a, g, CY, 0.9)
    # header + row plaques (raised, cyan rim on header); row centers are computed here = the wells
    HH, GAP = 40, 4
    RH = (TY1 - TY0 - HH - GAP * (n + 1)) // n
    assert RH >= T_BODY + 8, RH
    boxes = [(TX0, TY0, TX1, TY0 + HH)] + [(TX0, TY0 + HH + GAP * (i + 1) + RH * i, TX1, TY0 + HH + GAP * (i + 1) + RH * (i + 1)) for i in range(n)]
    for i, bx in enumerate(boxes):
        a, m = raised_plaque(a, bx, 200 + i, tone=(58, 61, 66) if i == 0 else (72, 74, 77), radius=6, rivet_r=0)
        if i == 0: a = glow(a, np.clip(m - blur(m, 1.2), 0, 1), GL, 4, 0.6)
    # engraved column dividers through the rows
    for x in CX[1:-1]:
        dm = rect_mask((x - 1, TY0 + HH + GAP, x + 1, TY1 - GAP)); a = paint(a, dm, (20, 21, 23), 0.85)
        a = paint(a, rect_mask((x + 1, TY0 + HH + GAP, x + 2, TY1 - GAP)), (110, 114, 120), 0.5)
    img = to_img(a).convert('RGBA')
    MID = 140
    logo = draw_0xray_logo(220, bg='transparent'); la = np.asarray(logo)[..., 3]
    cr = np.nonzero(la[:, :50].max(1) > 128)[0]; CT, CB = int(cr.min()), int(cr.max())
    lx = NP[0] + 28; img.alpha_composite(logo, (lx, int(MID - (CT + CB) / 2)))
    TC = CB - CT + 1 - 6
    word, pad = stamped_word(TITLE, TC, seed=23); tx = lx + logo.width + 22; wy = int(MID - TC / 2) - pad
    assert tx + word.width <= NP[2] - 24, 'title too long'
    img.alpha_composite(word, (tx, wy)); img = img.convert('RGB'); TW = word.width
    ua = np.asarray(img, np.float32).copy(); uy = wy + pad + TC + 7
    ua = accent_paint(ua, rect_mask((tx, uy, tx + TW - 8, uy + 3), radius=1), tx, tx + TW - 8)
    img = to_img(ua); d = ImageDraw.Draw(img)
    ban_check([TITLE, SUB, foot] + COLS + [s for r in rows for s in r])

    def t(xy, s, k, sz, fill, anchor='lm'):
        assert_glyphs(k, s); f = font(k, sz)
        d.text((xy[0] + 1, xy[1] + 1), s, font=f, fill=(8, 9, 11), anchor=anchor); d.text(xy, s, font=f, fill=fill, anchor=anchor)
    def fits(s, k, sz, c):
        w = d.textlength(s, font=font(k, sz)); lim = CX[c + 1] - CX[c] - 2 * PAD
        assert w <= lim, f'too long ({w:.0f}>{lim}px), shorten: {s!r}'
    def cap_mid(k, sz, yc):  # baseline y that centers cap height on yc
        bb = font(k, sz).getbbox('H', anchor='ls'); return yc - (bb[1] + bb[3]) / 2
    # --- TYPE LAST, flat fill, native 1280x720 ---
    fs = font('chakra', 29); sb = fs.getbbox(SUB, anchor='ls'); sx = tx + TW + 16
    assert sx + d.textlength(SUB, font=fs) <= NP[2] - 22, 'sub too long'
    t((sx, MID - (sb[1] + sb[3]) / 2), SUB, 'chakra', 29, CY, 'ls')
    for c, h in enumerate(COLS):
        fits(h, 'chakra', T_HEAD - 6 + 6, c)
        t((CX[c] + PAD, cap_mid('chakra', T_HEAD, (boxes[0][1] + boxes[0][3]) / 2)), h, 'chakra', T_HEAD, CY, 'ls')
    for r, row in enumerate(rows, 1):
        yc = (boxes[r][1] + boxes[r][3]) / 2
        for c, s in enumerate(row):
            k, sz, col = ('barlowc', T_TERM, INK) if c == 0 else ('barlowc_sb', T_BODY, (214, 222, 226))
            fits(s, k, sz, c); t((CX[c] + PAD, cap_mid(k, sz, yc)), s, k, sz, col, 'ls')
    assert d.textlength(foot, font=font('chakra', T_FOOT)) <= 1112 - 160 - 40, 'footer too long'
    t((640, 568), foot, 'chakra', T_FOOT, CY, 'mm')
    img.save(out)
    if ARGS.previews:
        img.resize((600, 338), Image.LANCZOS).save(out.with_suffix('.600.png'))
        img.crop((100, 210, 500, 410)).resize((800, 400), Image.NEAREST).save(out.with_suffix('.crop200.png'))
    print('saved', out)

OUT = Path(ARGS.out)
if len(ROWS) <= MAX_ROWS:
    render(ROWS, FOOT, OUT)
else:
    k = -(-len(ROWS) // MAX_ROWS); per = -(-len(ROWS) // k)
    for i in range(k):
        render(ROWS[i * per:(i + 1) * per], f'{FOOT} {i + 1}/{k}', OUT.with_name(f'{OUT.stem}-{i + 1}{OUT.suffix}'))
