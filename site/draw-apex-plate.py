#!/usr/bin/env python3
"""Draw the apex hero as a stamped 0xRay plate.

Pipeline base (one of the three stamp bases: pipeline, state flow, domain model).
The hexagon mark is engraved from docs-site/static/img/favicon.png.
The 0xRay wordmark is drawn into the metal. logo.jpg is not pasted on top.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FAVICON = ROOT / "docs-site" / "static" / "img" / "favicon.png"
OUT = Path(__file__).resolve().parent / "assets" / "apex.png"

W, H = 1280, 720
VOID = np.array([8, 9, 11], dtype=np.float32)
CYAN = np.array([61, 224, 232], dtype=np.float32)
PAPER = np.array([245, 247, 250], dtype=np.float32)
GOLD = np.array([245, 197, 24], dtype=np.float32)
BLUE = np.array([74, 127, 212], dtype=np.float32)

FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/macos/Inter-Bold.ttf",
    "/usr/share/fonts/truetype/inter/Inter-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
)


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).is_file():
            return ImageFont.truetype(path, size)
    raise FileNotFoundError("no bold sans font for the wordmark")


def rounded_mask(w: int, h: int, box: tuple[int, int, int, int], radius: int) -> np.ndarray:
    image = Image.new("L", (w, h), 0)
    ImageDraw.Draw(image).rounded_rectangle(box, radius=radius, fill=255)
    return np.asarray(image).astype(np.float32) / 255.0


def text_mask(text: str, size: int, tracking: int = 0) -> Image.Image:
    face = font(size)
    # Measure with tracking so the wordmark is drawn, not a pasted bitmap.
    widths = []
    height = 0
    for ch in text:
        bbox = face.getbbox(ch)
        widths.append(bbox[2] - bbox[0])
        height = max(height, bbox[3] - bbox[1])
    width = sum(widths) + tracking * (len(text) - 1) + 8
    image = Image.new("L", (width, height + 8), 0)
    draw = ImageDraw.Draw(image)
    x = 4
    for ch, ch_w in zip(text, widths):
        bbox = face.getbbox(ch)
        draw.text((x - bbox[0], 2 - bbox[1]), ch, font=face, fill=255)
        x += ch_w + tracking
    return image


def metal(h: int, w: int) -> np.ndarray:
    rng = np.random.default_rng(413)
    yy = np.linspace(0.0, 1.0, h)[:, None]
    xx = np.linspace(0.0, 1.0, w)[None, :]
    shade = 0.62 - 0.22 * yy + 0.08 * np.sin(yy * math.pi)
    shade = shade * (0.92 + 0.08 * np.sin(xx * math.pi))
    brush = 0.018 * np.sin(yy * h * 0.71) + 0.01 * np.sin(yy * h * 2.15 + 0.6)
    grain = rng.normal(0.0, 0.018, (h, w))
    fine = rng.normal(0.0, 0.008, (h, w // 2))
    fine = np.repeat(fine, 2, axis=1)[:, :w]
    tone = np.clip(shade + brush + grain + fine, 0.0, 1.0)
    # Cool silver, a little cyan in the low lights.
    rgb = np.zeros((h, w, 3), dtype=np.float32)
    rgb[..., 0] = 42 + tone * 150
    rgb[..., 1] = 46 + tone * 154
    rgb[..., 2] = 50 + tone * 158
    return rgb


def blit_mask(canvas: np.ndarray, mask: np.ndarray, x: int, y: int, color: np.ndarray, depth: float) -> None:
    mh, mw = mask.shape
    h, w = canvas.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(w, x + mw), min(h, y + mh)
    if x0 >= x1 or y0 >= y1:
        return
    sl = mask[y0 - y : y1 - y, x0 - x : x1 - x].astype(np.float32) / 255.0
    if sl.max() <= 0:
        return
    # Engrave: shadow down-right, highlight up-left, face tinted. Not a photo paste.
    shadow = np.zeros_like(sl)
    highlight = np.zeros_like(sl)
    shadow[2:, 2:] = sl[:-2, :-2]
    highlight[:-2, :-2] = sl[2:, 2:]
    region = canvas[y0:y1, x0:x1]
    face = sl[..., None]
    region *= 1.0 - face * (0.55 * depth)
    region += color * face * (0.82 * depth)
    region -= np.array([18, 16, 14], dtype=np.float32) * shadow[..., None] * 0.45 * depth
    region += np.array([36, 42, 46], dtype=np.float32) * highlight[..., None] * 0.55 * depth
    np.clip(region, 0, 255, out=region)


def paste_centered(canvas: np.ndarray, mask: Image.Image, cx: int, cy: int, color: np.ndarray, depth: float) -> None:
    arr = np.asarray(mask)
    blit_mask(canvas, arr, cx - arr.shape[1] // 2, cy - arr.shape[0] // 2, color, depth)


def favicon_die() -> np.ndarray:
    fav = Image.open(FAVICON).convert("RGB")
    arr = np.asarray(fav).astype(np.float32)
    lum = arr.mean(axis=2)
    # Keep the cyan strokes. Drop the dark square so it cannot sit on the plate as a tile.
    mask = np.clip((lum - 28.0) / 70.0, 0.0, 1.0)
    mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((86, 86), Image.Resampling.LANCZOS)).astype(np.float32)
    return mask


def rivet(canvas: np.ndarray, cx: int, cy: int, radius: int = 11) -> None:
    yy, xx = np.ogrid[-radius : radius + 1, -radius : radius + 1]
    dist = np.sqrt(xx * xx + yy * yy)
    body = np.clip(1.0 - dist / radius, 0.0, 1.0)
    hole = np.clip(1.0 - dist / (radius * 0.42), 0.0, 1.0)
    blit_mask(canvas, (body * 255).astype(np.float32), cx - radius, cy - radius, np.array([170, 176, 180], dtype=np.float32), 0.9)
    blit_mask(canvas, (hole * 255).astype(np.float32), cx - radius, cy - radius, np.array([20, 22, 24], dtype=np.float32), 1.0)


def panel(canvas: np.ndarray, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    mask = rounded_mask(canvas.shape[1], canvas.shape[0], box, 16)
    canvas *= 1.0 - mask[..., None] * 0.28
    canvas += np.array([12, 16, 20], dtype=np.float32) * mask[..., None] * 0.35
    # Cyan lip along the top inner edge.
    lip = rounded_mask(canvas.shape[1], canvas.shape[0], (x0, y0, x1, y0 + 10), 8)
    canvas += CYAN * lip[..., None] * 0.22


def draw() -> Image.Image:
    plate = metal(H, W)
    outer = rounded_mask(W, H, (16, 12, W - 17, H - 13), 36)
    inner_shadow = rounded_mask(W, H, (28, 24, W - 29, H - 25), 28)
    void = np.broadcast_to(VOID, (H, W, 3)).copy()
    # Bevel: bright rim where outer exceeds the inset.
    rim = np.clip(outer - inner_shadow, 0, 1)
    body = plate * outer[..., None]
    body += np.array([210, 220, 224], dtype=np.float32) * rim[..., None] * 0.55
    canvas = void * (1.0 - outer[..., None]) + body

    for cx, cy in ((54, 48), (W - 55, 48), (54, H - 49), (W - 55, H - 49)):
        rivet(canvas, cx, cy)

    logo = favicon_die()
    blit_mask(canvas, logo, W // 2 - logo.shape[1] // 2, 28, CYAN, 1.0)

    word = text_mask("0xRay", 78, tracking=4)
    paste_centered(canvas, word, W // 2, 168, PAPER, 1.0)
    kicker = text_mask("THE SUIT IS THE WEAR", 18, tracking=3)
    paste_centered(canvas, kicker, W // 2, 214, CYAN, 0.85)

    rule = np.zeros((2, 360), dtype=np.float32)
    rule[:] = 255
    blit_mask(canvas, rule, W // 2 - 180, 236, CYAN, 0.45)

    columns = (
        (70, "INPUT", "The host you\nalready run", PAPER),
        (450, "PROCESSING", "Inference remembers\nGovernance judges\nEngine runs the work", CYAN),
        (860, "OUTPUT", "The next session\nwakes with the job", GOLD),
    )
    for x, title, body, accent in columns:
        panel(canvas, (x, 268, x + 350, 600))
        title_img = text_mask(title, 22, tracking=2)
        blit_mask(canvas, np.asarray(title_img), x + 28, 292, accent, 1.0)
        y = 348
        for line in body.split("\n"):
            line_img = text_mask(line, 26, tracking=0)
            blit_mask(canvas, np.asarray(line_img), x + 28, y, PAPER, 0.95)
            y += 40

    left = text_mask("0xray 4.1.3", 18, tracking=1)
    right = text_mask("apex", 18, tracking=2)
    blit_mask(canvas, np.asarray(left), 70, 652, PAPER, 0.8)
    right_arr = np.asarray(right)
    blit_mask(canvas, right_arr, W - 70 - right_arr.shape[1], 652, BLUE, 0.9)

    image = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), "RGB")
    return image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    draw().save(OUT, "PNG", optimize=True)
    print(OUT)


if __name__ == "__main__":
    main()
