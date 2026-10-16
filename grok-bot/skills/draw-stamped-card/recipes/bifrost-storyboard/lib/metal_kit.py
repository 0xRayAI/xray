"""Procedural stamped-metal toolkit (PIL + numpy only). Used by render_release_plates_v2.py."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np
from fontTools.ttLib import TTFont

W, H = 1280, 720
G = '/usr/share/fonts/truetype/sand-box/google/'
FONTS = {
    'blackops': G + 'Black Ops One/BlackOpsOne-Regular.ttf',
    'oswald': G + 'Oswald/Oswald-VariableFont_wght.ttf',
    'barlowc': G + 'Barlow Condensed/BarlowCondensed-Bold.ttf',
    'barlowc_sb': G + 'Barlow Condensed/BarlowCondensed-SemiBold.ttf',
    'barlowc_md': G + 'Barlow Condensed/BarlowCondensed-Medium.ttf',
    'chakra': G + 'Chakra Petch/ChakraPetch-Bold.ttf',
    'chakra_md': G + 'Chakra Petch/ChakraPetch-Medium.ttf',
    'plexmono': G + 'IBM Plex Mono/IBMPlexMono-Bold.ttf',
    'plexmono_md': G + 'IBM Plex Mono/IBMPlexMono-Medium.ttf',
    'playfair': G + 'Playfair Display/PlayfairDisplay-VariableFont_wght.ttf',
    'russo': G + 'Russo One/RussoOne-Regular.ttf',
}
CYAN = (90, 214, 222)
_cmaps = {}


def font(key, size, var=None):
    f = ImageFont.truetype(FONTS[key], size)
    if var:
        try:
            f.set_variation_by_name(var)
        except Exception:
            pass
    f._key = key
    return f


def assert_glyphs(key, text):
    """Fail loudly if any char would render as a tofu box."""
    if key not in _cmaps:
        _cmaps[key] = set(TTFont(FONTS[key], lazy=True).getBestCmap().keys())
    missing = [c for c in text if c not in ' ' and ord(c) not in _cmaps[key]]
    assert not missing, f'tofu risk in {key}: {missing!r} in {text!r}'


def fbm(h, w, seed, octaves=6, base=4):
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        n = base * (2 ** o)
        small = rng.random((max(2, n * h // w), n)).astype(np.float32)
        im = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += amp * (np.asarray(im, np.float32) / 255.0)
        tot += amp
        amp *= 0.55
    return out / tot


def metal(h, w, seed, tone=(58, 58, 60), rough=1.0, brushed=False, pits=0.0):
    """Return float32 HxWx3 metal texture."""
    rng = np.random.default_rng(seed)
    n = fbm(h, w, seed) - 0.5
    fine = rng.normal(0, 1, (h, w)).astype(np.float32)
    if brushed:
        im = Image.fromarray(np.clip(fine * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(0))
        im = im.resize((w // 8, h), Image.BILINEAR).resize((w, h), Image.BILINEAR)
        fine = (np.asarray(im, np.float32) - 128) / 40
    lum = 1.0 + n * 0.55 * rough + fine * 0.06 * rough
    if pits:
        p = rng.random((h, w)) < pits
        pm = Image.fromarray((p * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
        lum -= np.asarray(pm, np.float32) / 255.0 * 1.8
    blot = fbm(h, w, seed + 7, octaves=3, base=3)
    lum *= 0.82 + 0.36 * blot
    t = np.array(tone, np.float32)[None, None, :]
    return np.clip(t * lum[..., None], 0, 255)


def scratches(arr, seed, count=160, alpha=0.10):
    rng = np.random.default_rng(seed)
    h, w = arr.shape[:2]
    lay = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(lay)
    for _ in range(count):
        x, y = rng.integers(0, w), rng.integers(0, h)
        ang = rng.normal(0.2, 0.9)
        ln = rng.integers(10, 90)
        d.line((x, y, x + ln * np.cos(ang), y + ln * np.sin(ang)), fill=int(rng.integers(90, 255)), width=1)
    s = np.asarray(lay, np.float32)[..., None] / 255.0
    return np.clip(arr + s * 255 * alpha, 0, 255)


def vignette(arr, strength=0.45):
    h, w = arr.shape[:2]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
    v = 1 - strength * np.clip(r - 0.35, 0, 1) ** 1.5
    return arr * v[..., None]


def blur(m, r):
    return np.asarray(Image.fromarray(np.clip(m * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0


def shift(m, dx, dy):
    return np.roll(np.roll(m, dy, axis=0), dx, axis=1)


def emboss(arr, mask, depth=3, soft=2.0, hi=0.55, lo=0.6, inside=None, raised=True):
    """Light from top-left. mask: float 0..1 HxW. inside: optional HxWx3 fill texture."""
    m = blur(mask, soft)
    d = shift(m, depth, depth) - shift(m, -depth, -depth)  # >0 on top-left edges
    if not raised:
        d = -d
    out = arr.copy()
    if inside is not None:
        out = out * (1 - mask[..., None]) + inside * mask[..., None]
    light = np.clip(-d, 0, 1) * hi   # top-left edges brighten
    dark = np.clip(d, 0, 1) * lo
    # flip sign: shift(m,+d) is mask moved down-right, so where it's higher we are on bottom-right edge
    out = out * (1 + light[..., None] * 1.4) * (1 - dark[..., None])
    return np.clip(out, 0, 255)


def drop_shadow(arr, mask, dx=4, dy=5, r=5, a=0.6):
    s = blur(shift(mask, dx, dy), r)
    return arr * (1 - s[..., None] * a)


def text_mask(text, f, xy, anchor='la', size=(W, H), spacing=0):
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    assert_glyphs(f._key, text)
    if spacing:
        x, y = xy
        if anchor[0] == 'm':
            tot = sum(d.textlength(c, font=f) for c in text) + spacing * (len(text) - 1)
            x -= tot / 2
        for c in text:
            d.text((x, y), c, font=f, fill=255, anchor='l' + anchor[1])
            x += d.textlength(c, font=f) + spacing
    else:
        d.text(xy, text, font=f, fill=255, anchor=anchor)
    return np.asarray(m, np.float32) / 255.0


def rect_mask(box, radius=0, size=(W, H)):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=255)
    return np.asarray(m, np.float32) / 255.0


def poly_mask(pts, size=(W, H)):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.asarray(m, np.float32) / 255.0


def paint(arr, mask, color, a=1.0):
    c = np.array(color, np.float32)[None, None, :]
    k = (mask * a)[..., None]
    return arr * (1 - k) + c * k


def glow(arr, mask, color, r=8, a=0.9):
    g = blur(mask, r)[..., None] * a
    c = np.array(color, np.float32)[None, None, :]
    return np.clip(arr + g * c, 0, 255)


def rivet(arr, x, y, r=9, tone=150):
    h, w = arr.shape[:2]
    arr = drop_shadow(arr, rect_mask((x - r, y - r, x + r, y + r), radius=r), 2, 3, 3, 0.7)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dist = np.sqrt((xx - x) ** 2 + (yy - y) ** 2)
    inside = dist <= r
    hx, hy = x - r * 0.35, y - r * 0.4
    hd = np.sqrt((xx - hx) ** 2 + (yy - hy) ** 2) / (r * 1.4)
    shade = np.clip(1.25 - hd, 0.25, 1.3)
    rim = np.clip((dist - (r - 1.5)) / 1.5, 0, 1)
    val = tone * shade * (1 - 0.5 * rim)
    arr[inside] = np.clip(val[inside][:, None] * np.array([1.0, 1.0, 1.02]), 0, 255)
    return arr


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


BANNED = ('Dist', 'Arch1', 'ARCH1', 'emergence', 'preCompact', 'compaction')


def ban_check(strings):
    hay = ' '.join(strings)
    for b in BANNED:
        assert b not in hay, f'banned token on plate: {b}'


REFS = '/workspace/dist-media/brand/FINAL-REFS/bots/'


def ref_crop(name, box, size):
    """Crop a suited-bot ref (src px box) and resize to size=(w,h). Returns float array."""
    im = Image.open(REFS + name).convert('RGB').crop(box).resize(size, Image.LANCZOS)
    return np.asarray(im, np.float32)


def place(a, img_arr, x, y, fade=None, fw=120):
    """Composite img_arr at (x,y) on a; fade: 'l','r','t','b' or combination string."""
    h, w = img_arr.shape[:2]
    m = np.ones((h, w), np.float32)
    ramp = lambda n: np.clip(np.arange(n) / fw, 0, 1)
    if fade:
        if 'l' in fade:
            m *= ramp(w)[None, :]
        if 'r' in fade:
            m *= ramp(w)[::-1][None, :]
        if 't' in fade:
            m *= ramp(h)[:, None]
        if 'b' in fade:
            m *= ramp(h)[::-1][:, None]
    m = m ** 1.3
    sub = a[y:y + h, x:x + w]
    a[y:y + h, x:x + w] = sub * (1 - m[..., None]) + img_arr * m[..., None]
    return a


# ---- logo stamp (pixel-true; never redraw) ----
STAMP_FINAL = '/workspace/dist-media/brand/FINAL-REFS/logos/00-0xray-stamp-FINAL.png'
STAMP_ON_WHITE = '/workspace/dist-media/brand/FINAL-REFS/logos/0xray-logo-always-on-white.jpg'
STAMP_MARK = '/workspace/dist-media/brand/FINAL-REFS/logos/0xray-logo-mark.png'
STAMP_ALWAYS = '/workspace/dist-media/brand/FINAL-REFS/logos/0xray-logo-always.png'


def stamp_rgba(path=STAMP_FINAL, width=None):
    """Load stamp with black keyed out (luma threshold). Keeps white + orange pixels true."""
    im = Image.open(path).convert('RGBA')
    arr = np.asarray(im).astype(np.float32)
    rgb = arr[..., :3]
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    # keep anything meaningfully brighter than void, or strong orange
    orange = (rgb[..., 0] > 160) & (rgb[..., 1] < 150) & (rgb[..., 0] > rgb[..., 2] + 40)
    alpha = np.clip((lum - 18) / 40.0, 0, 1)
    alpha = np.maximum(alpha, orange.astype(np.float32))
    out = arr.copy()
    out[..., 3] = alpha * 255
    im2 = Image.fromarray(out.astype(np.uint8), 'RGBA')
    if width:
        h = int(im2.height * width / im2.width)
        im2 = im2.resize((width, h), Image.LANCZOS)
    return im2


def place_stamp(base_img, xy='top-center', width=320, path=STAMP_FINAL, margin=36, opacity=1.0):
    """Composite pixel-true stamp onto a PIL RGB/RGBA image. xy: 'top-center'|'top-left'|'top-right'|'bottom-left'|'bottom-right'| (x,y)."""
    if base_img.mode != 'RGBA':
        base = base_img.convert('RGBA')
    else:
        base = base_img.copy()
    stamp = stamp_rgba(path, width=width)
    if opacity < 1.0:
        a = np.asarray(stamp).astype(np.float32)
        a[..., 3] *= opacity
        stamp = Image.fromarray(a.astype(np.uint8), 'RGBA')
    bw, bh = base.size
    sw, sh = stamp.size
    if isinstance(xy, tuple):
        x, y = xy
    elif xy == 'top-center':
        x, y = (bw - sw) // 2, margin
    elif xy == 'top-left':
        x, y = margin, margin
    elif xy == 'top-right':
        x, y = bw - sw - margin, margin
    elif xy == 'bottom-left':
        x, y = margin, bh - sh - margin
    elif xy == 'bottom-right':
        x, y = bw - sw - margin, bh - sh - margin
    else:
        raise ValueError(xy)
    base.alpha_composite(stamp, (int(x), int(y)))
    return base.convert('RGB')


# ============================================================ LAYERED DEPTH
# Light from top-left. Depth levels must pass squint test (>=4 visible at 600px).
# Conventions: drop shadow offset (dx,dy) down-right; bevel hi on top-left, lo on bottom-right.


def ao_in_mask(arr, mask, soft=6.0, a=0.45):
    """Darken near the inner perimeter of mask (ambient occlusion in corners/creases)."""
    m = blur(mask, soft)
    rim = np.clip(mask - m, 0, 1)  # soft falloff inside
    # also darken just outside into the tray
    outer = np.clip(blur(mask, soft * 1.4) - mask, 0, 1)
    k = np.clip(rim * 0.35 + outer, 0, 1)
    return arr * (1 - k[..., None] * a)


def bevel_edge(arr, mask, hi=0.55, lo=0.65, soft=1.2, depth=2):
    """Raised bevel: top-left bright, bottom-right dark."""
    return emboss(arr, mask, depth=depth, soft=soft, hi=hi, lo=lo, raised=True)


def recessed_tray(arr, box, radius=12, depth=4, soft=3.0, floor_tone=None, seed=0):
    """Cut a recessed tray into arr. Returns (arr, tray_mask).
    Layers: outer lip AO + inner floor darker + bevel (recessed = inverted emboss).
    """
    m = rect_mask(box, radius)
    # drop the floor
    if floor_tone is None:
        floor = arr * 0.78
    else:
        floor = metal(arr.shape[0], arr.shape[1], seed, floor_tone, 1.15, pits=0.004)
        floor = scratches(floor, seed + 1, 80, 0.05)
    arr = arr * (1 - m[..., None]) + floor * m[..., None]
    # recessed bevel: shadow on top-left lip, highlight on bottom-right (raised=False)
    arr = emboss(arr, m, depth=depth, soft=soft, hi=0.35, lo=0.55, raised=False)
    # AO around tray perimeter
    arr = ao_in_mask(arr, m, soft=soft * 2.2, a=0.55)
    return arr, m


def raised_plaque(arr, box, seed, tone=(72, 71, 69), radius=6, rivet_r=7,
                  shadow=(5, 7, 9, 0.78), bevel=(3, 1.6, 0.55, 0.7), ao=0.4,
                  brushed=False, pits=0.003):
    """Raised plaque with drop shadow, bevel, AO, optional corner rivets.
    shadow=(dx,dy,blur,alpha); bevel=(depth,soft,hi,lo)
    """
    m = rect_mask(box, radius)
    dx, dy, sb, sa = shadow
    arr = drop_shadow(arr, m, dx, dy, sb, sa)
    inside = scratches(metal(arr.shape[0], arr.shape[1], seed, tone, 1.2, brushed=brushed, pits=pits), seed + 1, 50, 0.05)
    # slightly cleaner/lighter than floor
    inside = inside * 1.05
    bd, bs, bhi, blo = bevel
    arr = emboss(arr, m, bd, bs, bhi, blo, inside=inside)
    arr = crisp_bevel(arr, m)
    arr = ao_in_mask(arr, m, soft=4.0, a=ao)
    # edge wear: brighten top-left rim
    rim = np.clip(m - blur(m, 1.5), 0, 1)
    # directional wear: more on top-left
    yy, xx = np.mgrid[0:arr.shape[0], 0:arr.shape[1]].astype(np.float32)
    cx = (box[0] + box[2]) / 2; cy = (box[1] + box[3]) / 2
    wear = rim * np.clip(1.2 - ((xx - box[0]) + (yy - box[1])) / (max(box[2] - box[0], 1) + max(box[3] - box[1], 1)), 0, 1)
    arr = np.clip(arr + wear[..., None] * 35, 0, 255)
    x0, y0, x1, y1 = box
    inset = max(12, rivet_r + 6)
    if rivet_r > 0:
        for (x, y) in [(x0 + inset, y0 + inset), (x1 - inset, y0 + inset),
                       (x0 + inset, y1 - inset), (x1 - inset, y1 - inset)]:
            arr = bolt(arr, x, y, rivet_r)
    return arr, m


def bolt(arr, x, y, r=9, tone=145):
    """Domed bolt with own drop shadow + AO ring (stronger than plain rivet)."""
    arr = drop_shadow(arr, rect_mask((x - r, y - r, x + r, y + r), radius=r), 2, 3, 3, 0.75)
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dist = np.sqrt((xx - x) ** 2 + (yy - y) ** 2)
    inside = dist <= r
    # AO ring just outside
    ring = ((dist > r) & (dist < r + 3)).astype(np.float32)
    arr = arr * (1 - ring[..., None] * 0.35)
    hx, hy = x - r * 0.35, y - r * 0.4
    hd = np.sqrt((xx - hx) ** 2 + (yy - hy) ** 2) / (r * 1.4)
    shade = np.clip(1.3 - hd, 0.2, 1.35)
    rim = np.clip((dist - (r - 1.8)) / 1.8, 0, 1)
    val = tone * shade * (1 - 0.55 * rim)
    arr[inside] = np.clip(val[inside][:, None] * np.array([1.02, 1.02, 1.05]), 0, 255)
    # socket dark center
    sock = dist <= r * 0.28
    arr[sock] = arr[sock] * 0.35
    return arr


def corner_tab(arr, corner, size=36, bolt_r=8):
    """Small overlapping reinforcement tab at a corner of the outer frame.
    corner: 'tl'|'tr'|'bl'|'br'
    """
    h, w = arr.shape[:2]
    s = size
    if corner == 'tl':
        box = (14, 14, 14 + s, 14 + s); bx, by = 14 + s // 2, 14 + s // 2
    elif corner == 'tr':
        box = (w - 14 - s, 14, w - 14, 14 + s); bx, by = w - 14 - s // 2, 14 + s // 2
    elif corner == 'bl':
        box = (14, h - 14 - s, 14 + s, h - 14); bx, by = 14 + s // 2, h - 14 - s // 2
    else:
        box = (w - 14 - s, h - 14 - s, w - 14, h - 14); bx, by = w - 14 - s // 2, h - 14 - s // 2
    arr, _ = raised_plaque(arr, box, seed=hash(corner) % 10000, tone=(68, 68, 70), radius=4,
                           rivet_r=0, shadow=(3, 4, 5, 0.7), bevel=(2, 1.2, 0.5, 0.65), ao=0.35)
    arr = recessed_bolt(arr, bx, by, bolt_r, well=3, tone=155)
    return arr


def outer_frame(arr, inset=6, band=24, radius=26, bolts=True):
    """Raised outer frame band around the plate + recessed tray inside.
    Returns (arr, tray_mask). Depth: slab < tray floor; frame > slab.
    """
    h, w = arr.shape[:2]
    outer = rect_mask((inset, inset, w - inset, h - inset), radius)
    inner = rect_mask((inset + band, inset + band, w - inset - band, h - inset - band), max(4, radius - 10))
    band_m = np.clip(outer - inner, 0, 1)
    # frame is raised brushed metal
    frame_tex = metal(h, w, 77, (62, 62, 64), 1.1, brushed=True, pits=0.002)
    arr = drop_shadow(arr, band_m, 0, 0, 1, 0.0)  # noop keep
    arr = emboss(arr, band_m, 3, 2.2, 0.55, 0.7, inside=frame_tex)
    arr = crisp_bevel(arr, band_m)
    # tray
    arr, tray = recessed_tray(arr,
                              (inset + band, inset + band, w - inset - band, h - inset - band),
                              radius=max(4, radius - 10), depth=4, soft=3.0,
                              floor_tone=(48, 48, 49), seed=88)
    if bolts:
        for c in ('tl', 'tr', 'bl', 'br'):
            arr = corner_tab(arr, c, size=34, bolt_r=9)
        # mid-edge bolts
        for (x, y) in [(w // 2, inset + band // 2), (w // 2, h - inset - band // 2)]:
            arr = bolt(arr, x, y, 8, 150)
    return arr, tray


def count_depth_levels_proxy(arr, sample_boxes):
    """Rough proxy: variance of mean luminance across sample regions (higher = more depth contrast)."""
    means = []
    for box in sample_boxes:
        x0, y0, x1, y1 = box
        patch = arr[y0:y1, x0:x1]
        lum = 0.2126 * patch[..., 0] + 0.7152 * patch[..., 1] + 0.0722 * patch[..., 2]
        means.append(float(lum.mean()))
    return means


def crisp_bevel(arr, mask, hi_color=(210, 210, 212), lo_color=(12, 12, 14), hi_a=0.95, lo_a=0.85):
    """1px-class bevel lines: bright on top-left of raised mask, dark on bottom-right."""
    m = (mask > 0.5).astype(np.float32)
    # edge = mask XOR shift
    e_l = np.clip(m - np.roll(m, 1, axis=1), 0, 1)   # left edge of raised
    e_t = np.clip(m - np.roll(m, 1, axis=0), 0, 1)   # top edge
    e_r = np.clip(m - np.roll(m, -1, axis=1), 0, 1)
    e_b = np.clip(m - np.roll(m, -1, axis=0), 0, 1)
    hi = np.clip(e_l + e_t, 0, 1)
    lo = np.clip(e_r + e_b, 0, 1)
    arr = paint(arr, hi, hi_color, hi_a)
    arr = paint(arr, lo, lo_color, lo_a)
    return arr


def recessed_bolt(arr, x, y, r=9, well=4, tone=150):
    """Bolt sitting in a recessed circular well (AO cup + domed bolt)."""
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dist = np.sqrt((xx - x) ** 2 + (yy - y) ** 2)
    well_m = (dist <= r + well).astype(np.float32)
    # darken well floor
    arr = arr * (1 - well_m[..., None] * 0.35)
    arr = emboss(arr, well_m, depth=2, soft=1.2, hi=0.25, lo=0.45, raised=False)
    return bolt(arr, x, y, r, tone)


def hex_bolt(arr, x, y, r=8, tone=40):
    """Dark hex-head bolt for tech frames."""
    lay = Image.new('L', (arr.shape[1], arr.shape[0]), 0)
    d = ImageDraw.Draw(lay)
    # hex
    import math
    pts = [(x + r * math.cos(math.pi / 6 + i * math.pi / 3),
            y + r * math.sin(math.pi / 6 + i * math.pi / 3)) for i in range(6)]
    d.polygon(pts, fill=255)
    m = np.asarray(lay, np.float32) / 255
    arr = drop_shadow(arr, m, 2, 3, 3, 0.7)
    arr = paint(arr, m, (tone, tone + 2, tone + 4), 0.95)
    arr = crisp_bevel(arr, m, hi_color=(90, 92, 94), lo_color=(10, 10, 12), hi_a=0.7, lo_a=0.8)
    # allen socket
    sock = Image.new('L', (arr.shape[1], arr.shape[0]), 0)
    ImageDraw.Draw(sock).regular_polygon((x, y, r * 0.35), 6, fill=255)
    arr = paint(arr, np.asarray(sock, np.float32) / 255, (8, 8, 10), 0.9)
    return arr


def heavy_pits(arr, seed, amount=0.018, dark=0.65):
    """Extra cast-iron pitting blotches (fine + medium)."""
    rng = np.random.default_rng(seed)
    h, w = arr.shape[:2]
    fine = rng.random((h, w)) < amount
    med = rng.random((max(2, h // 6), max(2, w // 6))) < amount * 3
    med = np.asarray(Image.fromarray((med * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32) / 255.0
    pm = Image.fromarray((fine * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    k = np.clip(np.asarray(pm, np.float32) / 255.0 + med * 0.7, 0, 1)
    return arr * (1 - k[..., None] * dark)
