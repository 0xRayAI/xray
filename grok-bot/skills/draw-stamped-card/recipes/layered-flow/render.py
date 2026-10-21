"""layered-flow X copy of an ASCII plate.

Each outer box is a recessed band. Each inner box is a plaque in the same
place. Each connector (v, arrow, tee) is a drawn arrow. Every fence line is
drawn word for word. Width stays 1280. Height grows before the font shrinks.
A line is never cut.

Usage:
  python3 render.py --plate docs-site/docs/plates/routing.md --out docs-site/static/plates/x/routing.png
  python3 render.py --all
"""
from __future__ import annotations

import argparse
import struct
import subprocess
import sys
import zlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
SB = HERE.parent / "bifrost-storyboard"
sys.path.insert(0, str(HERE.parent.parent / "lib"))
sys.path.insert(0, str(SB / "lib"))
import metal_kit  # noqa: E402
from metal_kit import (  # noqa: E402
    glow,
    metal as _METAL,
    outer_frame,
    paint,
    raised_plaque,
    recessed_tray,
    rect_mask as _RECT,
    scratches as _SCRATCHES,
    to_img,
)
from accent import resolve_accent  # noqa: E402
from draw_0xray_logo import draw_0xray_logo  # noqa: E402

ROOT = HERE.parents[4]
PLATES = ROOT / "docs-site/docs/plates"
OUT_DIR = ROOT / "docs-site/static/plates/x"
SKIP = {"review", "goggles", "suit", "kits", "host-pack", "glossary", "index"}
DEJAVU = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
BLACKOPS = str(SB / "assets/fonts/BlackOpsOne-Regular.ttf")
W = 1280
PREFERRED = 26
INK = (236, 238, 236)
SHADOW = (16, 16, 18)
CYAN = (90, 214, 222)
LEFT_SIDE = set("│├┼")
TEXT_KEY = "xray-plate-ascii"
_POLY = metal_kit.poly_mask


def bind_canvas(width: int, height: int) -> None:
    """rect_mask defaults to 1280x720. Tall plates need the real size.

    Grain stays in the palette, but a quieter field is what lets a 256-color
    PNG stay near the stamped-plate size once the height grows.
    """
    size = (width, height)

    def rect_mask(box, radius=0, size=size):
        return _RECT(box, radius, size)

    def poly_mask(pts, size=size):
        return _POLY(pts, size)

    def metal(h, w, seed, tone=(58, 58, 60), rough=1.0, brushed=False, pits=0.0):
        return _METAL(h, w, seed, tone, min(rough, 0.16), brushed, 0.0)

    def scratches(arr, seed, count=160, alpha=0.10):
        return arr

    metal_kit.rect_mask = rect_mask
    metal_kit.poly_mask = poly_mask
    metal_kit.metal = metal
    metal_kit.scratches = scratches
    metal_kit.W, metal_kit.H = width, height


def fence_payload(text: str) -> str:
    start = text.find("```")
    nl = text.find("\n", start)
    end = text.find("```", nl + 1)
    return text[nl + 1:end]


def frontmatter(text: str) -> dict[str, str]:
    end = text.find("\n---", 3)
    body = text[4:end]
    out: dict[str, str] = {}
    for line in body.splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            out[key.strip()] = val.strip()
    return out


def footer_line(text: str) -> str:
    for line in reversed(text.splitlines()):
        if line.startswith("stamped"):
            return line
    return ""


def find_boxes(lines: list[str]) -> list[dict]:
    boxes = []
    for r, line in enumerate(lines):
        c = 0
        while c < len(line):
            if line[c] == "┌":
                k = c + 1
                while k < len(line) and line[k] not in "┐┌":
                    k += 1
                if k < len(line) and line[k] == "┐":
                    rr = r + 1
                    while rr < len(lines) and c < len(lines[rr]) and lines[rr][c] in LEFT_SIDE:
                        rr += 1
                    if rr < len(lines) and c < len(lines[rr]) and lines[rr][c] == "└":
                        boxes.append({"top": r, "bot": rr, "left": c, "right": k})
                        c = k
                        continue
            c += 1
    return boxes


def contains(outer: dict, inner: dict) -> bool:
    return (
        outer["top"] < inner["top"]
        and outer["bot"] > inner["bot"]
        and outer["left"] < inner["left"]
        and outer["right"] > inner["right"]
    )


def fit_font(lines: list[str], max_w: float) -> tuple[ImageFont.FreeTypeFont, int, float]:
    """Shrink only when the longest line does not fit. Never drop a character."""
    cols = max(len(line) for line in lines)
    size = PREFERRED
    while size > 4:
        font = ImageFont.truetype(DEJAVU, size)
        advance = float(font.getlength("M"))
        widest = max(float(font.getlength(line)) for line in lines)
        if advance * cols <= max_w + 0.5 and widest <= max_w + 0.5:
            return font, size, advance
        size -= 1
    raise RuntimeError("no font size fits the plate width")


def fit_title(title: str, max_w: float) -> ImageFont.FreeTypeFont:
    size = 52
    while size > 18:
        font = ImageFont.truetype(BLACKOPS, size)
        if float(font.getlength(title)) <= max_w:
            return font
        size -= 1
    return ImageFont.truetype(BLACKOPS, 18)


def accent_color(y: int, height: int, rainbow: bool) -> tuple[int, int, int]:
    if not rainbow:
        return CYAN
    spec = (
        (235, 52, 52),
        (245, 140, 30),
        (245, 220, 40),
        (60, 200, 90),
        (50, 140, 245),
        (150, 70, 230),
    )
    t = y / max(height - 1, 1) * (len(spec) - 1)
    i = min(int(t), len(spec) - 2)
    f = t - i
    a, b = spec[i], spec[i + 1]
    return tuple(int(a[k] * (1 - f) + b[k] * f) for k in range(3))


def is_connector_v(line: str, index: int) -> bool:
    if line[index] != "v":
        return False
    prev = line[index - 1] if index else " "
    nxt = line[index + 1] if index + 1 < len(line) else " "
    return not prev.isalpha() and not nxt.isalpha()


def draw_arrow(draw: ImageDraw.ImageDraw, kind: str, cx: float, cy: float, cw: float, pitch: float, color) -> None:
    if kind == "right":
        s = cw * 0.42
        pts = [(cx - s, cy - s * 0.55), (cx + s * 0.15, cy - s * 0.55), (cx + s * 0.15, cy - s),
               (cx + s, cy), (cx + s * 0.15, cy + s), (cx + s * 0.15, cy + s * 0.55), (cx - s, cy + s * 0.55)]
    elif kind == "up":
        s = min(cw, pitch) * 0.42
        pts = [(cx - s * 0.55, cy + s * 0.2), (cx - s, cy + s * 0.2), (cx, cy - s),
               (cx + s, cy + s * 0.2), (cx + s * 0.55, cy + s * 0.2), (cx + s * 0.35, cy + s), (cx - s * 0.35, cy + s)]
    else:
        s = min(cw, pitch) * 0.42
        pts = [(cx - s * 0.55, cy - s * 0.2), (cx - s, cy - s * 0.2), (cx, cy + s),
               (cx + s, cy - s * 0.2), (cx + s * 0.55, cy - s * 0.2), (cx + s * 0.35, cy - s), (cx - s * 0.35, cy - s)]
    draw.polygon(pts, fill=color)


def write_itxt(path: Path, text: str) -> None:
    payload = TEXT_KEY.encode("latin1") + b"\x00\x00\x00\x00\x00" + text.encode("utf8")
    chunk = struct.pack(">I", len(payload)) + b"iTXt" + payload
    chunk += struct.pack(">I", zlib.crc32(b"iTXt" + payload) & 0xFFFFFFFF)
    raw = path.read_bytes()
    iend = raw.rfind(b"IEND")
    if iend < 4:
        raise RuntimeError(f"no IEND in {path}")
    path.write_bytes(raw[:iend - 4] + chunk + raw[iend - 4:])


def read_itxt(path: Path) -> str:
    raw = path.read_bytes()
    offset = 8
    while offset + 8 <= len(raw):
        length = struct.unpack(">I", raw[offset:offset + 4])[0]
        kind = raw[offset + 4:offset + 8]
        data = raw[offset + 8:offset + 8 + length]
        if kind == b"iTXt" and data.startswith(TEXT_KEY.encode("latin1") + b"\x00"):
            cursor = len(TEXT_KEY) + 1
            compressed = data[cursor] == 1
            cursor += 2
            cursor = data.index(b"\x00", cursor) + 1
            cursor = data.index(b"\x00", cursor) + 1
            text = data[cursor:]
            return zlib.decompress(text).decode("utf8") if compressed else text.decode("utf8")
        offset += 12 + length
    raise RuntimeError(f"missing {TEXT_KEY} in {path}")


def render(md_path: Path, out_path: Path) -> None:
    text = md_path.read_text(encoding="utf8")
    payload = fence_payload(text)
    lines = payload[:-1].split("\n") if payload.endswith("\n") else payload.split("\n")
    if not lines or len(set(map(len, lines))) != 1:
        raise RuntimeError(f"{md_path.name} fence is not one width")
    meta = frontmatter(text)
    title = meta.get("title", md_path.stem).upper()
    foot = footer_line(text)
    rainbow = resolve_accent(title) == "rainbow"
    cols = len(lines[0])
    margin = 56
    max_w = W - margin * 2
    font, size, advance = fit_font(lines, max_w)
    pitch = size + 8
    grid_w = advance * cols
    content_x = (W - grid_w) / 2
    name_top, name_h = 56, 108
    foot_h = 58
    body_top = name_top + name_h + 18
    height = int(body_top + len(lines) * pitch + 20 + foot_h + 40)
    bind_canvas(W, height)

    slab = metal_kit.metal(height, W, 41, (54, 54, 55), 0.16, pits=0.0)
    arr = slab
    arr, _tray = outer_frame(arr, inset=6, band=22, radius=24, bolts=True)
    name = (64, name_top, W - 64, name_top + name_h)
    arr, name_m = raised_plaque(arr, name, 7, tone=(66, 68, 71), radius=10, rivet_r=0)
    groove = (name[0] + 18, name[3] - 10, name[2] - 18, name[3] - 6)
    arr = glow(arr, rect_mask_local(groove, height, W), CYAN, 6, 0.9)
    arr = paint(arr, rect_mask_local(groove, height, W), CYAN, 0.9)

    boxes = find_boxes(lines)
    outers = [b for b in boxes if not any(contains(o, b) for o in boxes)]
    inners = [b for b in boxes if b not in outers]

    def cell_rect(box: dict) -> tuple[int, int, int, int]:
        x0 = int(round(content_x + box["left"] * advance))
        x1 = int(round(content_x + (box["right"] + 1) * advance))
        y0 = int(round(body_top + box["top"] * pitch))
        y1 = int(round(body_top + (box["bot"] + 1) * pitch))
        return x0, y0, x1, y1

    for i, box in enumerate(outers):
        x0, y0, x1, y1 = cell_rect(box)
        if x1 - x0 < 8 or y1 - y0 < 8:
            continue
        rad = max(2, min(12, (x1 - x0) // 6, (y1 - y0) // 6))
        arr, _m = recessed_tray(arr, (x0, y0, x1, y1), radius=rad, depth=4, soft=2.4,
                                floor_tone=(32, 33, 36), seed=80 + i)
    for i, box in enumerate(inners):
        x0, y0, x1, y1 = cell_rect(box)
        if x1 - x0 < 8 or y1 - y0 < 8:
            continue
        rad = max(2, min(8, (x1 - x0) // 6, (y1 - y0) // 6))
        arr, _m = raised_plaque(arr, (x0, y0, x1, y1), 200 + i, tone=(74, 76, 79), radius=rad,
                                rivet_r=0, shadow=(3, 4, 5, 0.65), bevel=(2, 1.2, 0.5, 0.62))

    foot_box = (64, height - foot_h - 28, W - 64, height - 28)
    arr, _fm = recessed_tray(arr, foot_box, radius=8, depth=3, soft=2.0, floor_tone=(36, 37, 39), seed=9)
    img = to_img(arr).convert("RGB")
    draw = ImageDraw.Draw(img)
    for row, line in enumerate(lines):
        y = body_top + row * pitch + pitch / 2
        for col, ch in enumerate(line):
            kind = None
            x_off = 0.0
            y_off = 0.0
            aw, ah = advance, pitch
            if ch == "→":
                kind = "right"
            elif ch == "┬":
                kind = "down"
                y_off = pitch * 0.62
            elif ch == "┴":
                kind = "up"
                y_off = -pitch * 0.62
            elif is_connector_v(line, col):
                kind = "down"
                aw, ah = advance * 1.5, pitch * 1.15
            if not kind:
                continue
            cx = content_x + (col + 0.5) * advance + x_off
            yy = max(0, min(height - 1, int(y + y_off)))
            color = accent_color(yy, height, rainbow)
            draw_arrow(draw, kind, cx, y + y_off, aw, ah, color)

    text_y_pad = max(1, (pitch - size) // 2 - 1)
    for row, line in enumerate(lines):
        y = body_top + row * pitch + text_y_pad
        for col, ch in enumerate(line):
            if ch == " ":
                continue
            x = content_x + col * advance
            draw.text((x + 1, y + 1), ch, font=font, fill=SHADOW)
            draw.text((x, y), ch, font=font, fill=INK)
        drawn = float(font.getlength(line.rstrip(" ")))
        if content_x + drawn > W - 8:
            raise RuntimeError(f"line {row} of {md_path.name} exceeds the plate")

    title_font = fit_title(title, name[2] - name[0] - 250)
    logo = draw_0xray_logo(210, bg="transparent")
    img = img.convert("RGBA")
    ly = name_top + (name_h - logo.size[1]) // 2 - 4
    img.alpha_composite(logo, (name[0] + 16, max(name_top + 8, ly)))
    draw = ImageDraw.Draw(img)
    tb = title_font.getbbox(title)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx = name[0] + 240
    ty = name_top + (name_h - th) // 2 - tb[1] - 6
    draw.text((tx + 1, ty + 1), title, font=title_font, fill=SHADOW)
    draw.text((tx, ty), title, font=title_font, fill=INK)
    foot_font = ImageFont.truetype(DEJAVU, 18)
    fb = foot_font.getbbox(foot)
    fx = foot_box[0] + 22
    fy = foot_box[1] + (foot_h - (fb[3] - fb[1])) // 2 - fb[1]
    draw.text((fx + 1, fy + 1), foot, font=foot_font, fill=SHADOW)
    draw.text((fx, fy), foot, font=foot_font, fill=(210, 214, 216))

    rgb = img.convert("RGB")
    if rgb.size != (W, height):
        raise RuntimeError("canvas was resized after type")
    quant = rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    quant.save(out_path, optimize=True)
    subprocess.run(["optipng", "-o1", "-quiet", str(out_path)], check=True)
    write_itxt(out_path, payload)
    if read_itxt(out_path) != payload:
        raise RuntimeError(f"embedded fence drifted for {md_path.name}")
    print(f"{md_path.stem} {W}x{height} font {size} boxes {len(outers)}+{len(inners)} {out_path.stat().st_size}")


def rect_mask_local(box, height, width):
    return _RECT(box, 0, (width, height))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plate")
    ap.add_argument("--out")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    if args.all:
        for path in sorted(PLATES.glob("*.md")):
            if path.stem in SKIP:
                continue
            render(path, OUT_DIR / f"{path.stem}.png")
        return
    if not args.plate or not args.out:
        ap.error("pass --plate and --out, or --all")
    render(Path(args.plate), Path(args.out))


if __name__ == "__main__":
    main()
