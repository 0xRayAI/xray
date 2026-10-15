"""Draw the 0xRay logo from measured glyph recipes (not by pasting stamp-FINAL onto plates).

Recipes in logo_glyphs/ were measured once from
FINAL-REFS/logos/00-0xray-stamp-FINAL.png (binary ink + orange maps).
draw_0xray_logo paints through those maps at any size; plates MUST call this
(or place_drawn_logo) and must never Image.open the stamp PNG for overlay.
"""
from __future__ import annotations
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

GLYPHS = Path(__file__).parent / 'logo_glyphs'
REF = Path('/workspace/dist-media/brand/FINAL-REFS/logos/00-0xray-stamp-FINAL.png')
ON_WHITE_REF = Path('/workspace/dist-media/brand/FINAL-REFS/logos/0xray-logo-always-on-white.jpg')

ORANGE = (220, 88, 18)
ORANGE_BRIGHT = (228, 88, 9)
WHITE = (235, 235, 235)
VOID = (8, 9, 11)
INK_DARK = (18, 18, 20)  # for light backgrounds


def _load_maps():
    ink = np.asarray(Image.open(GLYPHS / 'word_ink_crop.png').convert('L'), np.float32) / 255.0
    ora = np.asarray(Image.open(GLYPHS / 'word_orange_crop.png').convert('L'), np.float32) / 255.0
    meta = json.loads((GLYPHS / 'meta.json').read_text())
    return ink, ora, meta


def draw_0xray_logo(
    width: int = 360,
    *,
    bg: str = 'dark',
    variant: str = 'wordmark',
    pad_frac: float = 0.04,
) -> Image.Image:
    """Draw logo at width px.
    bg: 'dark' | 'light' | 'transparent'
    variant: 'wordmark' | 'mark'  (mark = x-region crop of recipes)
    """
    ink, ora, meta = _load_maps()
    if variant == 'mark':
        # x glyph region relative to content crop (content_box 60,60,732,325)
        # x box absolute (127,60,323,276) -> crop-relative
        cx0, cy0, _, _ = meta['content_box']
        # use glyph file for x
        ink = np.asarray(Image.open(GLYPHS / 'glyph_1_x.png').convert('L'), np.float32) / 255.0
        ora = np.asarray(Image.open(GLYPHS / 'orange_1_x.png').convert('L'), np.float32) / 255.0

    h0, w0 = ink.shape
    pad = int(width * pad_frac)
    target_w = max(8, width - 2 * pad)
    target_h = max(8, int(h0 * target_w / w0))
    ink_i = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).resize((target_w, target_h), Image.LANCZOS), np.float32) / 255.0
    ora_i = np.asarray(Image.fromarray((ora * 255).astype(np.uint8)).resize((target_w, target_h), Image.LANCZOS), np.float32) / 255.0
    # slight threshold clean
    ink_i = np.clip(ink_i * 1.05, 0, 1)
    ora_i = np.clip(ora_i * 1.1, 0, 1)

    height = target_h + 2 * pad
    if bg == 'transparent':
        canvas = np.zeros((height, width, 4), np.float32)
    elif bg == 'light':
        canvas = np.zeros((height, width, 3), np.float32)
        canvas[:] = (245, 247, 250)
    else:
        canvas = np.zeros((height, width, 3), np.float32)
        canvas[:] = VOID

    y0 = pad
    x0 = (width - target_w) // 2
    # white (or dark on light) where ink, but orange wins where ora
    if bg == 'light':
        base_ink = np.array(INK_DARK, np.float32)
    else:
        base_ink = np.array(WHITE, np.float32)
    org = np.array(ORANGE, np.float32)

    if bg == 'transparent':
        # RGB + alpha
        region = canvas[y0:y0 + target_h, x0:x0 + target_w]
        alpha = np.clip(ink_i + ora_i, 0, 1)
        rgb = base_ink[None, None, :] * ink_i[..., None] * (1 - ora_i[..., None]) + org[None, None, :] * ora_i[..., None]
        # where only orange, still visible
        region[..., :3] = rgb
        region[..., 3] = alpha * 255
        canvas[y0:y0 + target_h, x0:x0 + target_w] = region
        return Image.fromarray(canvas.astype(np.uint8), 'RGBA')

    region = canvas[y0:y0 + target_h, x0:x0 + target_w]
    a_ink = ink_i[..., None]
    a_ora = ora_i[..., None]
    # paint ink then orange on top
    region[:] = region * (1 - a_ink) + base_ink * a_ink
    region[:] = region * (1 - a_ora) + org * a_ora
    canvas[y0:y0 + target_h, x0:x0 + target_w] = region
    return Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), 'RGB')


def place_drawn_logo(base: Image.Image, xy='top-center', width=320, margin=36,
                     variant='wordmark', clear_below=True) -> Image.Image:
    """Composite drawn logo onto plate. Returns RGB.
    clear_below: callers should keep text below y = margin + logo_height + 16.
    """
    logo = draw_0xray_logo(width, bg='transparent', variant=variant)
    out = base.convert('RGBA')
    bw, bh = out.size
    sw, sh = logo.size
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
    out.alpha_composite(logo, (int(x), int(y)))
    return out.convert('RGB'), {'logo_box': (int(x), int(y), int(x + sw), int(y + sh)), 'clear_y': int(y + sh + 16)}


def compare_to_ref(drawn: Image.Image, out_path: Path | None = None) -> dict:
    ref = Image.open(REF).convert('RGB')
    w = drawn.width
    ref_r = ref.resize((w, max(1, int(ref.height * w / ref.width))), Image.LANCZOS)
    dh = max(drawn.height, ref_r.height)

    def pad(im, h):
        c = Image.new('RGB', (im.width, h), VOID)
        c.paste(im.convert('RGB'), (0, (h - im.height) // 2))
        return c

    d = pad(drawn, dh)
    r = pad(ref_r, dh)
    sheet = Image.new('RGB', (w * 2 + 24, dh + 40), (20, 20, 22))
    sheet.paste(r, (8, 32))
    sheet.paste(d, (w + 16, 32))
    dr = ImageDraw.Draw(sheet)
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/Chakra Petch/ChakraPetch-Bold.ttf', 14)
    except Exception:
        f = ImageFont.load_default()
    dr.text((8 + w // 2, 16), 'REF stamp-FINAL', font=f, fill=(180, 180, 180), anchor='mm')
    dr.text((w + 16 + w // 2, 16), 'DRAWN', font=f, fill=(90, 214, 222), anchor='mm')
    da, ra = np.asarray(d), np.asarray(r)
    def ocount(a):
        return int(((a[:,:,0]>180)&(a[:,:,1]<140)&(a[:,:,0]>a[:,:,2]+40)).sum())
    dl = 0.2126*da[:,:,0]+0.7152*da[:,:,1]+0.0722*da[:,:,2]
    rl = 0.2126*ra[:,:,0]+0.7152*ra[:,:,1]+0.0722*ra[:,:,2]
    ink = (dl > 40) | (rl > 40)
    mad = float(np.abs(dl - rl)[ink].mean()) if ink.any() else 999.0
    scores = {'orange_px_drawn': ocount(da), 'orange_px_ref': ocount(ra), 'mad_ink': round(mad, 2)}
    if out_path:
        sheet.save(out_path, quality=92)
    return scores


if __name__ == '__main__':
    out = Path('/workspace/dist-media/brand/skill-dry-runs/draw-0xray-logo')
    out.mkdir(parents=True, exist_ok=True)
    for n, w in [(3, 360), (4, 360), (5, 520)]:
        img = draw_0xray_logo(w, bg='dark')
        img.save(out / f'pass-{n}.jpg', quality=92)
        s = compare_to_ref(img, out / ('vs-ref.jpg' if n == 5 else f'vs-ref-pass-{n}.jpg'))
        print('pass', n, s)
    # light + mark demos
    draw_0xray_logo(320, bg='light').save(out / 'pass-5-light.jpg', quality=92)
    draw_0xray_logo(120, bg='dark', variant='mark').save(out / 'pass-5-mark.jpg', quality=92)
