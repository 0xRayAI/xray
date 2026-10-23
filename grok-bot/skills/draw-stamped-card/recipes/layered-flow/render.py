"""Stamped infographic X copy of an ASCII plate.

The plate is assembled from the SVGs in plates/kit. This file lays those parts
out and fills in text from the markdown fence. Nodes, text, order, edges, and
layers come from that fence.

Usage:
  python3 render.py --plate docs-site/docs/plates/routing.md --out docs-site/static/plates/x/routing.png
  python3 render.py --all
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import struct
import subprocess
import sys
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from flow import (
    Box,
    contains,
    find_boxes,
    fence_lines,
    node_text,
    parse_flow,
)

HERE = Path(__file__).resolve().parent
SB = HERE.parent / "bifrost-storyboard"
sys.path.insert(0, str(HERE.parent.parent / "lib"))
sys.path.insert(0, str(SB / "lib"))
from draw_0xray_logo import draw_0xray_logo  # noqa: E402

ROOT = HERE.parents[4]
PLATES = ROOT / "docs-site/docs/plates"
OUT_DIR = ROOT / "docs-site/static/plates/x"
SKIP = {"review", "goggles", "suit", "kits", "host-pack", "glossary", "index"}
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BLACKOPS = str(SB / "assets/fonts/BlackOpsOne-Regular.ttf")
BARLOW = str(SB / "assets/fonts/BarlowCondensed-Bold.ttf")
BARLOW_SEMI = str(SB / "assets/fonts/BarlowCondensed-SemiBold.ttf")
TEXT_KEY = "xray-plate-flow"
KIT_PATH = ROOT / "plates/kit.json"
KIT_DIR = ROOT / "plates/kit"
KIT = json.loads(KIT_PATH.read_text(encoding="utf8"))
ICONS_DIR = KIT_DIR
ICONS = KIT["parts"]["icon"]["files"]
LAYOUT = KIT["layout"]


def _rgb(value: list[int]) -> tuple[int, int, int]:
    return (int(value[0]), int(value[1]), int(value[2]))


def palette_color(name: str) -> tuple[int, int, int]:
    """A line or ink color from the kit. Anything else is refused."""
    palette = KIT["palette"]
    if name not in palette or name in {"default", "rainbow"}:
        raise KeyError(name)
    value = palette[name]
    if not isinstance(value, list) or not value or isinstance(value[0], list):
        raise KeyError(name)
    return _rgb(value)


def rainbow_colors() -> tuple[tuple[int, int, int], ...]:
    colors = tuple(_rgb(item) for item in KIT["palette"]["rainbow"])
    if len(colors) != 6:
        raise RuntimeError("rainbow is outside the kit")
    return colors


def rainbow_for(title: str) -> bool:
    upper = title.upper()
    return any(str(name).upper() in upper for name in KIT["rainbowTitles"])


CYAN = palette_color("cyan")
CYAN_DIM = palette_color("cyanDim")
INK = palette_color("ink")
MUTED = palette_color("muted")
SHADOW = palette_color("shadow")
RAINBOW = rainbow_colors()
RAINBOW_NAMES = ("red", "orange", "yellow", "green", "blue", "violet")
RAINBOW_DIMS = tuple(f"{name}Dim" for name in RAINBOW_NAMES)
GLOW_FACTOR = float(KIT["line"]["glowFactor"])
HEAD_SHAPE = str(KIT["line"]["arrowhead"]["shape"])
if HEAD_SHAPE != "triangle":
    raise RuntimeError(f"arrow style outside the kit: {HEAD_SHAPE}")
if KIT["palette"].get("default") != "cyan":
    raise RuntimeError("default color is outside the kit")
RAINBOW_ARROWS = False
# These arrows are placed from the kit, not taken from a font. Barlow has no → glyph.
INLINE_ARROWS = {
    "→": 1,
    "←": -1,
    "↔": 0,
}
_CMAP: dict[str, set[int]] = {}
_RASTER: dict[tuple[str, str], Image.Image] = {}
SHAPE_DRAWS = ("line", "rectangle", "rounded_rectangle", "polygon", "ellipse", "arc", "pieslice", "chord")
SVG_TAGS = {"svg", "g", "rect", "circle", "ellipse", "line", "polyline", "polygon", "title", "desc", "defs"}


def layout_num(key: str) -> float:
    return float(LAYOUT[key])


def part_size(part: str, key: str) -> float:
    try:
        return float(KIT["parts"][part]["sizes"][key])
    except (KeyError, TypeError) as exc:
        raise KeyError(f"{part}.{key}") from exc


W = int(layout_num("width"))
WELL_L = int(layout_num("wellLeft"))
WELL_R = int(layout_num("wellRight"))
FLEET_SIZE = 1600
RAIL_WIDTH = part_size("rail", "width")
RAIL_GLOW = part_size("rail", "glow")
HEAD_LEN = part_size("arrowhead", "length")
HEAD_HALF = part_size("arrowhead", "halfWidth")
HEAD_GLOW_HALF = part_size("arrowhead", "glowHalfWidth")


def _svg_pairs(points: str) -> list[tuple[float, float]]:
    nums = [float(item) for item in points.replace(",", " ").split()]
    return list(zip(nums[0::2], nums[1::2]))


def _paste(base: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    if sprite.width < 1 or sprite.height < 1:
        return
    if x >= base.width or y >= base.height:
        return
    left = max(0, -x)
    top = max(0, -y)
    right = sprite.width - max(0, x + sprite.width - base.width)
    bottom = sprite.height - max(0, y + sprite.height - base.height)
    if right <= left or bottom <= top:
        return
    if left or top or right < sprite.width or bottom < sprite.height:
        sprite = sprite.crop((left, top, right, bottom))
    base.alpha_composite(sprite, (max(0, x), max(0, y)))


def _turn_sprite(sprite: Image.Image, turn: str) -> Image.Image:
    if turn in {"", "right"}:
        return sprite
    if turn == "left":
        return sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if turn == "down":
        return sprite.transpose(Image.Transpose.ROTATE_270)
    if turn == "up":
        return sprite.transpose(Image.Transpose.ROTATE_90)
    raise RuntimeError(f"turn outside the kit: {turn}")


def stamp_svg(
    img: Image.Image,
    path: Path,
    box: tuple[float, float, float, float],
    color: str,
    turn: str = "",
    slice_units: float = 0,
    bands: list[str] | None = None,
    axis: str = "h",
) -> None:
    """Paint one kit SVG into a box. The only place a plate shape is drawn."""
    palette_color(color)
    if bands:
        for name in bands:
            palette_color(name)
    root = ET.parse(path).getroot()
    view = [float(item) for item in root.attrib.get("viewBox", "0 0 24 24").split()]
    if len(view) != 4:
        raise RuntimeError(f"viewBox outside the kit: {path.name}")
    vx, vy, vw, vh = view
    if vw <= 0 or vh <= 0:
        raise RuntimeError(f"viewBox outside the kit: {path.name}")

    def resolve(value: str, tint: tuple[int, int, int]) -> tuple[int, int, int] | None:
        if value in {"", "none"}:
            return None
        if value == "currentColor":
            return tint
        prefix = "palette:"
        if value.startswith(prefix):
            return palette_color(value[len(prefix):])
        raise RuntimeError(f"color outside the kit: {value}")

    def paint_tree(target: Image.Image, dest: tuple[float, float, float, float], tint_name: str) -> None:
        tint = palette_color(tint_name)
        dx0, dy0, dx1, dy1 = dest
        sx = (dx1 - dx0) / vw
        sy = (dy1 - dy0) / vh
        if sx == 0 or sy == 0:
            return
        draw = ImageDraw.Draw(target)
        unit = min(abs(sx), abs(sy))

        def pt(x: float, y: float) -> tuple[float, float]:
            return (dx0 + (x - vx) * sx, dy0 + (y - vy) * sy)

        def walk(el: ET.Element, fill_v: str, stroke_v: str, sw_v: str) -> None:
            tag = el.tag.rsplit("}", 1)[-1]
            if tag not in SVG_TAGS:
                raise RuntimeError(f"shape outside the kit: {tag}")
            fill_v = el.attrib.get("fill", fill_v)
            stroke_v = el.attrib.get("stroke", stroke_v)
            sw_v = el.attrib.get("stroke-width", sw_v)
            if "style" in el.attrib:
                raise RuntimeError(f"color outside the kit: {path.name}")
            if tag in {"svg", "g"}:
                for child in list(el):
                    walk(child, fill_v, stroke_v, sw_v)
                return
            if tag in {"title", "desc", "defs"}:
                return
            fill = resolve(fill_v, tint)
            stroke = resolve(stroke_v, tint)
            if fill is None and stroke is None:
                return
            width = max(1, int(round(float(sw_v) * unit)))
            if tag == "rect":
                rx = float(el.attrib.get("rx", "0")) * unit
                x = float(el.attrib.get("x", "0"))
                y = float(el.attrib.get("y", "0"))
                rw = float(el.attrib["width"])
                rh = float(el.attrib["height"])
                p0, p1 = pt(x, y), pt(x + rw, y + rh)
                span = (min(p0[0], p1[0]), min(p0[1], p1[1]), max(p0[0], p1[0]), max(p0[1], p1[1]))
                if rx > 0:
                    cap = min(rx, abs(span[2] - span[0]) / 2, abs(span[3] - span[1]) / 2)
                    draw.rounded_rectangle(span, radius=cap, fill=fill, outline=stroke, width=width)
                else:
                    draw.rectangle(span, fill=fill, outline=stroke, width=width if stroke else 1)
                return
            if tag == "line":
                draw.line(
                    [pt(float(el.attrib["x1"]), float(el.attrib["y1"])), pt(float(el.attrib["x2"]), float(el.attrib["y2"]))],
                    fill=stroke or fill or tint,
                    width=width,
                )
                return
            if tag == "circle":
                cx = float(el.attrib["cx"])
                cy = float(el.attrib["cy"])
                radius = float(el.attrib["r"])
                draw.ellipse([pt(cx - radius, cy - radius), pt(cx + radius, cy + radius)], fill=fill, outline=stroke, width=width)
                return
            if tag == "ellipse":
                cx = float(el.attrib["cx"])
                cy = float(el.attrib["cy"])
                rx_e = float(el.attrib["rx"])
                ry_e = float(el.attrib["ry"])
                draw.ellipse([pt(cx - rx_e, cy - ry_e), pt(cx + rx_e, cy + ry_e)], fill=fill, outline=stroke, width=width)
                return
            mapped = [pt(x, y) for x, y in _svg_pairs(el.attrib.get("points", ""))]
            if len(mapped) < 2:
                return
            if tag == "polygon":
                draw.polygon(mapped, fill=fill, outline=stroke)
                return
            draw.line(mapped, fill=stroke or fill or tint, width=width)

        walk(root, root.attrib.get("fill", "none"), root.attrib.get("stroke", "none"), root.attrib.get("stroke-width", "1"))

    def raster(tint_name: str) -> Image.Image:
        key = (str(path), tint_name)
        cached = _RASTER.get(key)
        if cached is not None:
            return cached
        scale = 2.0
        sprite = Image.new("RGBA", (max(1, int(round(vw * scale))), max(1, int(round(vh * scale)))), (0, 0, 0, 0))
        paint_tree(sprite, (0, 0, sprite.width, sprite.height), tint_name)
        _RASTER[key] = sprite
        return sprite

    def nine_slice(sprite: Image.Image, dest: tuple[int, int, int, int]) -> None:
        x0, y0, x1, y1 = dest
        dw, dh = x1 - x0, y1 - y0
        scale = sprite.width / vw
        src_sl = int(round(slice_units * scale))
        dst_sl = int(round(slice_units))
        sw, sh = sprite.size
        if src_sl < 1 or dst_sl < 1 or dw <= dst_sl * 2 or dh <= dst_sl * 2 or sw <= src_sl * 2 or sh <= src_sl * 2:
            _paste(img, sprite.resize((dw, dh), Image.Resampling.NEAREST), x0, y0)
            return
        sx = (0, src_sl, sw - src_sl, sw)
        sy = (0, src_sl, sh - src_sl, sh)
        dx = (x0, x0 + dst_sl, x1 - dst_sl, x1)
        dy = (y0, y0 + dst_sl, y1 - dst_sl, y1)
        for iy in range(3):
            for ix in range(3):
                crop = sprite.crop((sx[ix], sy[iy], sx[ix + 1], sy[iy + 1]))
                tw, th = dx[ix + 1] - dx[ix], dy[iy + 1] - dy[iy]
                if crop.width < 1 or crop.height < 1 or tw < 1 or th < 1:
                    continue
                _paste(img, crop.resize((tw, th), Image.Resampling.NEAREST), dx[ix], dy[iy])

    x0, y0, x1, y1 = box
    if x1 < x0:
        x0, x1 = x1, x0
    if y1 < y0:
        y0, y1 = y1, y0
    if x1 - x0 < 1 or y1 - y0 < 1:
        return
    left, top, right, bot = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
    if right <= left or bot <= top:
        return
    if slice_units > 0:
        nine_slice(raster(color), (left, top, right, bot))
        return
    if bands:
        pieces = [np.array(raster(name)) for name in bands]
        merged = pieces[0].copy()
        count = len(pieces)
        height, width = merged.shape[0], merged.shape[1]
        for index, piece in enumerate(pieces):
            if axis == "v":
                a = height * index // count
                b = height * (index + 1) // count
                if b > a:
                    merged[a:b, :, :] = piece[a:b, :, :]
            else:
                a = width * index // count
                b = width * (index + 1) // count
                if b > a:
                    merged[:, a:b, :] = piece[:, a:b, :]
        sprite = Image.fromarray(merged, "RGBA")
        dw, dh = right - left, bot - top
        if turn in {"up", "down"}:
            pre = (max(1, dh), max(1, dw))
        else:
            pre = (max(1, dw), max(1, dh))
        sprite = sprite.resize(pre, Image.Resampling.NEAREST)
        _paste(img, _turn_sprite(sprite, turn), left, top)
        return
    if turn:
        dw, dh = right - left, bot - top
        if turn in {"up", "down"}:
            pre_w, pre_h = dh, dw
        else:
            pre_w, pre_h = dw, dh
        temp = Image.new("RGBA", (max(1, pre_w), max(1, pre_h)), (0, 0, 0, 0))
        paint_tree(temp, (0, 0, temp.width, temp.height), color)
        _paste(img, _turn_sprite(temp, turn), left, top)
        return
    paint_tree(img, (left, top, right, bot), color)


def place_part(
    img: Image.Image,
    part: str,
    box: tuple[float, float, float, float],
    color: str,
    turn: str = "",
    kind: str = "",
    bands: list[str] | None = None,
    axis: str = "h",
) -> None:
    """Lay one approved part into the plate. Text is filled in by the caller."""
    try:
        spec = KIT["parts"][part]
    except KeyError as exc:
        raise KeyError(f"part outside the kit: {part}") from exc
    if part == "icon":
        try:
            name = spec["files"][kind]
        except KeyError as exc:
            raise KeyError(f"unknown icon kind: {kind}") from exc
    else:
        name = spec["svg"]
    if not isinstance(name, str) or name != Path(name).name or not name.endswith(".svg"):
        raise KeyError(f"part outside the kit: {part}")
    svg = KIT_DIR / name
    if not svg.is_file():
        raise FileNotFoundError(f"missing SVG: {name}")
    stamp_svg(img, svg, box, color, turn, float(spec["sizes"].get("slice", 0)), bands, axis)


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


def footer_parts(line: str) -> tuple[str, str]:
    marker = "0xray "
    at = line.find(marker)
    if at < 0:
        return "", ""
    rest = line[at + len(marker):]
    version, _, suffix = rest.partition(" · ")
    return version.strip(), suffix.strip()


def layer_node_boxes(lines: list[str]) -> list[list[Box]]:
    boxes = find_boxes(lines)
    leaves = [b for b in boxes if not any(contains(b, other) for other in boxes)]
    parents = [b for b in boxes if any(contains(b, leaf) for leaf in leaves)]
    parents.sort(key=lambda b: (b.top, b.left))
    if parents:
        grouped: list[list[Box]] = []
        for parent in parents:
            kids = [leaf for leaf in leaves if contains(parent, leaf)]
            kids = [
                leaf for leaf in kids
                if not any(contains(parent, mid) and contains(mid, leaf) for mid in boxes if mid is not parent)
            ]
            kids.sort(key=lambda b: (b.top, b.left))
            grouped.append(kids)
        return grouped
    rows: list[list[Box]] = []
    for leaf in sorted(leaves, key=lambda b: (b.top, b.left)):
        if rows and abs(leaf.top - rows[-1][0].top) <= 1:
            rows[-1].append(leaf)
        elif rows and leaf.top <= max(n.bot for n in rows[-1]) and leaf.bot >= min(n.top for n in rows[-1]):
            rows[-1].append(leaf)
        else:
            rows.append([leaf])
    for row in rows:
        row.sort(key=lambda b: b.left)
    return rows


def lead_line(text: str) -> str:
    """Short cyan subtitle under the stencil title, when the plate already says it."""
    parts = text.split("---", 2)
    body = parts[2] if len(parts) == 3 else text
    chunk: list[str] = []
    for line in body.splitlines():
        if line.startswith("#") or line.startswith("```"):
            if chunk:
                break
            continue
        if not line.strip():
            if chunk:
                break
            continue
        chunk.append(line.strip())
    sentence = " ".join(chunk)
    dot = sentence.find(". ")
    if dot != -1:
        sentence = sentence[:dot + 1]
    if not sentence or len(sentence) > 68:
        return ""
    return sentence


def font_at(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def font_cmap(path: str) -> set[int]:
    """Format-4 cmap. Glyph 0 is .notdef and does not count."""
    cached = _CMAP.get(path)
    if cached is not None:
        return cached
    data = Path(path).read_bytes()
    import struct
    num = struct.unpack_from(">H", data, 4)[0]
    cmap_at = -1
    for index in range(num):
        rec = 12 + index * 16
        if data[rec:rec + 4] == b"cmap":
            cmap_at = struct.unpack_from(">I", data, rec + 8)[0]
    if cmap_at < 0:
        raise RuntimeError(f"no cmap in {path}")
    nenc = struct.unpack_from(">H", data, cmap_at + 2)[0]
    best = -1
    best_score = -1
    for index in range(nenc):
        rec = cmap_at + 4 + index * 8
        plat, enc, rel = struct.unpack_from(">HHI", data, rec)
        off = cmap_at + rel
        if struct.unpack_from(">H", data, off)[0] != 4:
            continue
        score = (100000 if plat == 3 and enc == 1 else 0) + struct.unpack_from(">H", data, off + 2)[0]
        if score > best_score:
            best_score = score
            best = off
    if best < 0:
        raise RuntimeError(f"no format-4 cmap in {path}")
    seg = struct.unpack_from(">H", data, best + 6)[0] // 2
    pos = best + 14
    end = list(struct.unpack_from(f">{seg}H", data, pos))
    pos += 2 * seg + 2
    start = list(struct.unpack_from(f">{seg}H", data, pos))
    pos += 2 * seg
    delta = list(struct.unpack_from(f">{seg}h", data, pos))
    pos += 2 * seg
    roff = list(struct.unpack_from(f">{seg}H", data, pos))
    roff_pos = pos
    found: set[int] = set()
    for index in range(seg):
        for cp in range(start[index], end[index] + 1):
            if roff[index] == 0:
                glyph = (cp + delta[index]) & 0xFFFF
            else:
                gpos = roff_pos + index * 2 + roff[index] + 2 * (cp - start[index])
                glyph = struct.unpack_from(">H", data, gpos)[0]
                if glyph:
                    glyph = (glyph + delta[index]) & 0xFFFF
            if glyph:
                found.add(cp)
    _CMAP[path] = found
    return found


def ensure_glyphs(path: str, text: str) -> None:
    cmap = font_cmap(path)
    missing = [ch for ch in text if ch not in INLINE_ARROWS and ord(ch) not in cmap]
    if missing:
        raise RuntimeError(f"missing glyph {''.join(missing)!r} in {Path(path).name}")


def inline_arrow_width(font: ImageFont.FreeTypeFont) -> float:
    return max(18.0, font.size * 1.15)


def run_width(text: str, font: ImageFont.FreeTypeFont) -> float:
    total = 0.0
    buf: list[str] = []

    def flush() -> None:
        nonlocal total
        if not buf:
            return
        total += float(font.getlength("".join(buf)))
        buf.clear()

    for ch in text:
        if ch in INLINE_ARROWS:
            flush()
            total += inline_arrow_width(font)
        else:
            buf.append(ch)
    flush()
    return total


def draw_inline_arrow(img: Image.Image, x: float, y: float, font: ImageFont.FreeTypeFont, ch: str) -> float:
    """Small kit arrow standing in for a character the face does not have."""
    width = inline_arrow_width(font)
    ascent, _descent = font.getmetrics()
    mid = y + ascent * 0.58
    thick = max(2, round(font.size * 0.1))
    head = width * 0.34
    direction = INLINE_ARROWS[ch]
    if direction >= 0:
        shaft = x + width - head
        place_part(img, "rail", (x, mid - thick, shaft, mid + thick), "cyanDim")
        place_part(img, "rail", (x, mid - thick * 0.55, shaft, mid + thick * 0.55), "cyan")
        place_part(img, "arrowhead", (shaft, mid - thick * 2.3, x + width, mid + thick * 2.3), "cyan", turn="right")
    if direction <= 0:
        shaft = x + head
        place_part(img, "rail", (shaft, mid - thick, x + width, mid + thick), "cyanDim")
        place_part(img, "rail", (shaft, mid - thick * 0.55, x + width, mid + thick * 0.55), "cyan")
        place_part(img, "arrowhead", (x, mid - thick * 2.3, shaft, mid + thick * 2.3), "cyan", turn="left")
    return x + width


def paint_text(
    img: Image.Image,
    xy: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    font_path: str,
) -> None:
    ensure_glyphs(font_path, text)
    draw = ImageDraw.Draw(img)
    x, y = xy
    buf: list[str] = []

    def flush() -> None:
        nonlocal x
        if not buf:
            return
        chunk = "".join(buf)
        draw.text((x, y), chunk, font=font, fill=fill)
        x += float(font.getlength(chunk))
        buf.clear()

    for ch in text:
        if ch in INLINE_ARROWS:
            flush()
            x = draw_inline_arrow(img, x, y, font, ch)
        else:
            buf.append(ch)
    flush()


def fit_width(path: str, text: str, max_w: float, start: int, floor: int) -> ImageFont.FreeTypeFont:
    size = start
    while size > floor:
        font = font_at(path, size)
        if run_width(text, font) <= max_w:
            return font
        size -= 1
    return font_at(path, floor)


def wrap_lines(text: str, font: ImageFont.FreeTypeFont, max_w: float) -> list[str]:
    words = text.split(" ")
    if not words:
        return []
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = word if not cur else f"{cur} {word}"
        if run_width(trial, font) <= max_w or not cur:
            cur = trial
            continue
        lines.append(cur)
        cur = word
    if cur:
        lines.append(cur)
    return lines


def body_font_for(details: list[str], max_w: float) -> ImageFont.FreeTypeFont:
    size = 20
    while size > 13:
        font = font_at(BARLOW_SEMI, size)
        words = [word for line in details for word in line.split(" ")]
        if all(run_width(word, font) <= max_w for word in words):
            return font
        size -= 1
    return font_at(BARLOW_SEMI, 13)


def title_and_details(lines: list[str]) -> tuple[str, list[str]]:
    """The node's name stays one title. A wrap at ',' '+' or '/' is still that name."""
    if not lines:
        return "", []
    taken = 1
    while taken < len(lines):
        prev = lines[taken - 1].rstrip()
        nxt = lines[taken].lstrip()
        if prev.endswith((",", "+", "/")) or nxt[:1] in "+/(":
            taken += 1
            continue
        break
    return " ".join(lines[:taken]), list(lines[taken:])


def title_layout(title: str, max_w: float) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    if not title:
        return font_at(BARLOW, 22), []
    size = 30
    while size > 14:
        font = font_at(BARLOW, size)
        if run_width(title, font) <= max_w:
            return font, [title]
        words = [word for word in title.split(" ") if word]
        if all(run_width(word, font) <= max_w for word in words):
            return font, wrap_lines(title, font, max_w)
        size -= 1
    font = font_at(BARLOW, 14)
    return font, wrap_lines(title, font, max_w)


def icon_kind(title: str) -> str:
    """The kit's match list. The last empty rule is the fallback kind."""
    text = title.lower()
    fallback = ""
    for rule in KIT["iconMatch"]:
        kind = str(rule["kind"])
        keys = [str(key) for key in rule["when"]]
        if not keys:
            fallback = kind
            continue
        if any(key in text for key in keys):
            if kind not in ICONS:
                raise KeyError(f"unknown icon kind: {kind}")
            return kind
    if not fallback or fallback not in ICONS:
        raise KeyError(f"unknown icon kind: {fallback or title}")
    return fallback


def icon_file(kind: str) -> Path:
    try:
        name = ICONS[kind]
    except KeyError as exc:
        raise KeyError(f"unknown icon kind: {kind}") from exc
    if not isinstance(name, str):
        raise KeyError(f"unknown icon kind: {kind}")
    path = ICONS_DIR / name
    if not path.is_file():
        raise FileNotFoundError(f"missing SVG: {name}")
    return path


def badge_plan(number: str) -> str:
    """Ordered steps are numbered. Every other card is an icon. Never both."""
    if number:
        return "number"
    return "icon"


def row_groups(boxes: list[Box]) -> list[list[tuple[int, Box]]]:
    rows: list[list[tuple[int, Box]]] = []
    for index, box in enumerate(boxes):
        if rows and abs(box.top - rows[-1][0][1].top) <= 1:
            rows[-1].append((index, box))
        else:
            rows.append([(index, box)])
    return rows


def card_width(inner: int, count: int, gap: int) -> int:
    return max(80, (inner - gap * (count - 1)) // count)


def content_width(width: int, numbered: bool) -> int:
    badge = part_size("numberTile", "advance") if numbered else part_size("icon", "advance")
    gutter = part_size("card", "padX") + badge + part_size("card", "padRight")
    return max(40, width - gutter)


def card_metrics(lines: list[str], width: int, numbered: bool) -> dict:
    inner = content_width(width, numbered)
    raw_title, details = title_and_details(lines)
    title = raw_title.upper()
    title_font, title_lines = title_layout(title, inner)
    body = body_font_for(details, inner)
    wrapped: list[str] = []
    for detail in details:
        wrapped.extend(wrap_lines(detail, body, inner))
    line_h = title_font.size + int(part_size("card", "titleLead"))
    title_h = max(int(part_size("card", "titleMin")), max(1, len(title_lines)) * line_h)
    block = int(part_size("card", "blockPad"))
    height = max(
        int(part_size("card", "minHeight")),
        block + title_h + int(part_size("card", "detailGap")) + len(wrapped) * (body.size + int(part_size("card", "detailLead"))) + block,
    )
    return {
        "height": height,
        "title_lines": title_lines,
        "title_font": title_font,
        "body": body,
        "wrapped": wrapped,
        "title_h": title_h,
        "line_h": line_h,
    }


def measure_card(lines: list[str], width: int, numbered: bool) -> int:
    return int(card_metrics(lines, width, numbered)["height"])


def visual_rows(rows: list[list[tuple[int, Box]]]) -> list[list[int]]:
    """Even out a short last row. A 3+1 layer becomes 2x2. A vertical stack stays."""
    groups = [[ni for ni, _box in row] for row in rows]
    lengths = [len(group) for group in groups]
    if len(lengths) < 2 or max(lengths) <= 1 or max(lengths) - min(lengths) <= 1:
        return groups
    count = sum(lengths)
    cols = max(lengths)
    while cols > 1:
        rem = count % cols
        if rem == 0 or cols - rem <= 1:
            break
        cols -= 1
    flat = [ni for group in groups for ni in group]
    return [flat[start:start + cols] for start in range(0, count, cols)]


def layout(flow: dict, boxes: list[list[Box]], header_bottom: int) -> tuple[int, list[dict], list[dict]]:
    """Place every card. Height grows with the text. Nothing is dropped."""
    inner = WELL_R - WELL_L - int(layout_num("innerInset"))
    y = header_bottom + int(layout_num("belowHeader"))
    placed: list[dict] = []
    bands: list[dict] = []
    stacked = all(len(layer["nodes"]) == 1 and not layer["name"] for layer in flow["layers"])
    stack_step = 1
    row_gap = int(layout_num("rowGap"))
    for li, layer in enumerate(flow["layers"]):
        rows = row_groups(boxes[li])
        numbered = "PROCESSING" in layer["name"].upper() or (stacked and len(flow["layers"]) >= 3)
        groups = visual_rows(rows)
        cols = max(len(group) for group in groups)
        band_top = y
        cursor = y + int(layout_num("bandPad"))
        if layer["name"]:
            cursor += int(layout_num("labelBlock"))
        row_places: list[list[dict]] = []
        for ri, group in enumerate(groups):
            gap = int(layout_num("arrowGap") if _indexes_have_horizontal(flow, li, group) and len(group) > 1 else layout_num("cardGap"))
            if len(group) == 1 and cols == 1 and not layer["name"]:
                width = min(int(layout_num("singleMax")), inner)
                widths = [width]
            else:
                width = card_width(inner, max(cols, len(group)), gap)
                widths = [width] * len(group)
            row_w = sum(widths) + gap * (len(group) - 1)
            offset = max(0, (inner - row_w) // 2)
            heights = [
                measure_card(
                    flow["layers"][li]["nodes"][ni]["lines"],
                    widths[i],
                    numbered and len(group) == 1,
                )
                for i, ni in enumerate(group)
            ]
            row_h = max(heights)
            x = WELL_L + int(part_size("card", "padX")) + offset
            cards = []
            for i, ni in enumerate(group):
                rect = (x, cursor, x + widths[i], cursor + row_h)
                number = ""
                if numbered and len(group) == 1:
                    number = str(stack_step if stacked else ni + 1)
                    stack_step += 1
                cards.append({"layer": li, "index": ni, "row": ri, "rect": rect, "number": number})
                x += widths[i] + gap
            row_places.append(cards)
            cursor += row_h
            if ri < len(groups) - 1:
                cursor += row_gap
        cursor += int(layout_num("bandEnd"))
        bands.append({
            "rect": (WELL_L, band_top, WELL_R, cursor),
            "name": layer["name"],
            "rows": row_places,
        })
        placed.extend(card for row in row_places for card in row)
        y = cursor + (row_gap if li < len(flow["layers"]) - 1 else 0)
    note_h = 0
    if flow["notes"]:
        note_font = font_at(BARLOW_SEMI, int(layout_num("noteSize")))
        for note in flow["notes"]:
            note_h += int(layout_num("noteLine")) * max(1, len(wrap_lines(note, note_font, inner)))
        note_h += int(part_size("header", "after"))
    foot_top = y + int(layout_num("footGap")) + note_h
    height = foot_top + int(part_size("footer", "block"))
    return height, bands, placed


def _indexes_have_horizontal(flow: dict, layer: int, indexes: list[int]) -> bool:
    members = set(indexes)
    for edge in flow["edges"]:
        src, dst = edge["from"], edge["to"]
        if src[0] != layer or dst[0] != layer:
            continue
        if src[1] in members and dst[1] in members and dst[1] == src[1] + 1:
            return True
    return False


def _span_colors(full: bool) -> list[str]:
    if RAINBOW_ARROWS:
        return list(RAINBOW_NAMES if full else RAINBOW_DIMS)
    return ["cyan" if full else "cyanDim"]


def _paint_span(img: Image.Image, box: tuple[float, float, float, float], along: str, full: bool) -> None:
    x0, y0, x1, y1 = box
    if x1 < x0:
        x0, x1 = x1, x0
    if y1 < y0:
        y0, y1 = y1, y0
    if x1 - x0 < 1 or y1 - y0 < 1:
        return
    names = _span_colors(full)
    if len(names) == 1:
        place_part(img, "rail", (x0, y0, x1, y1), names[0])
        return
    if along == "v":
        span = y1 - y0
        for index, name in enumerate(names):
            a = y0 + span * index / len(names)
            b = y0 + span * (index + 1) / len(names)
            place_part(img, "rail", (x0, a, x1, b), name)
        return
    span = x1 - x0
    for index, name in enumerate(names):
        a = x0 + span * index / len(names)
        b = x0 + span * (index + 1) / len(names)
        place_part(img, "rail", (a, y0, b, y1), name)


def _paint_head(img: Image.Image, box: tuple[float, float, float, float], turn: str, full: bool) -> None:
    names = _span_colors(full)
    if len(names) == 1:
        place_part(img, "arrowhead", box, names[0], turn=turn)
        return
    place_part(img, "arrowhead", box, names[0], turn=turn, bands=names, axis="h")


def draw_down_arrow(img: Image.Image, x: float, y0: float, y1: float) -> None:
    if y1 < y0 + HEAD_LEN:
        y1 = y0 + HEAD_LEN
    shaft = y1 - HEAD_LEN
    _paint_span(img, (x - RAIL_GLOW / 2, y0, x + RAIL_GLOW / 2, shaft), "v", False)
    _paint_head(img, (x - HEAD_GLOW_HALF, shaft, x + HEAD_GLOW_HALF, y1), "down", False)
    _paint_span(img, (x - RAIL_WIDTH / 2, y0, x + RAIL_WIDTH / 2, shaft), "v", True)
    _paint_head(img, (x - HEAD_HALF, shaft, x + HEAD_HALF, y1), "down", True)


def draw_stem(img: Image.Image, x: float, y0: float, y1: float) -> None:
    top, bot = sorted((y0, y1))
    _paint_span(img, (x - RAIL_GLOW / 2, top, x + RAIL_GLOW / 2, bot), "v", False)
    _paint_span(img, (x - RAIL_WIDTH / 2, top, x + RAIL_WIDTH / 2, bot), "v", True)


def draw_bar(img: Image.Image, x0: float, x1: float, y: float) -> None:
    left, right = sorted((x0, x1))
    _paint_span(img, (left, y - RAIL_GLOW / 2, right, y + RAIL_GLOW / 2), "h", False)
    _paint_span(img, (left, y - RAIL_WIDTH / 2, right, y + RAIL_WIDTH / 2), "h", True)


def draw_right_arrow(img: Image.Image, x0: float, x1: float, y: float) -> None:
    if x1 < x0 + HEAD_LEN:
        x1 = x0 + HEAD_LEN
    head = x1 - HEAD_LEN
    _paint_span(img, (x0, y - RAIL_GLOW / 2, head, y + RAIL_GLOW / 2), "h", False)
    _paint_head(img, (head, y - HEAD_GLOW_HALF, x1, y + HEAD_GLOW_HALF), "right", False)
    _paint_span(img, (x0, y - RAIL_WIDTH / 2, head, y + RAIL_WIDTH / 2), "h", True)
    _paint_head(img, (head, y - HEAD_HALF, x1, y + HEAD_HALF), "right", True)


def draw_left_arrow(img: Image.Image, x0: float, x1: float, y: float) -> None:
    """Head at the smaller x."""
    left, right = (x1, x0) if x1 < x0 else (x0, x1)
    head = left + HEAD_LEN
    _paint_span(img, (head, y - RAIL_GLOW / 2, right, y + RAIL_GLOW / 2), "h", False)
    _paint_head(img, (left, y - HEAD_GLOW_HALF, head, y + HEAD_GLOW_HALF), "left", False)
    _paint_span(img, (head, y - RAIL_WIDTH / 2, right, y + RAIL_WIDTH / 2), "h", True)
    _paint_head(img, (left, y - HEAD_HALF, head, y + HEAD_HALF), "left", True)


def place_junction(img: Image.Image, x: float, y: float) -> None:
    size = part_size("junction", "size")
    box = (x - size / 2, y - size / 2, x + size / 2, y + size / 2)
    names = _span_colors(True)
    if len(names) == 1:
        place_part(img, "junction", box, names[0])
        return
    place_part(img, "junction", box, names[0], bands=names, axis="h")


def center_bottom(rect: tuple[int, int, int, int]) -> tuple[float, float]:
    return (rect[0] + rect[2]) / 2, rect[3]


def center_top(rect: tuple[int, int, int, int]) -> tuple[float, float]:
    return (rect[0] + rect[2]) / 2, rect[1]


def draw_flow_arrows(img: Image.Image, flow: dict, bands: list[dict], font: ImageFont.FreeTypeFont) -> None:
    located = {}
    for band in bands:
        for row in band["rows"]:
            for card in row:
                located[(card["layer"], card["index"])] = card
    groups: dict[tuple, list] = {}
    horizontal: list[tuple] = []
    backs: list[dict] = []
    for edge in flow["edges"]:
        src = located[tuple(edge["from"])]
        dst = located[tuple(edge["to"])]
        if src["layer"] == dst["layer"] and src["row"] == dst["row"]:
            horizontal.append((src, dst, edge["label"]))
            continue
        if dst["rect"][1] < src["rect"][1]:
            backs.append({"src": src, "dst": dst, "label": edge["label"]})
            continue
        key = (src["layer"], src["row"], dst["layer"], dst["row"], edge["label"])
        groups.setdefault(key, []).append((src, dst))
    inset = layout_num("arrowInset")
    for (src, dst, _label) in horizontal:
        y = (src["rect"][1] + src["rect"][3]) / 2
        draw_right_arrow(img, src["rect"][2] + inset, dst["rect"][0] - inset, y)
    for key, pairs in groups.items():
        _draw_group(img, pairs, font, key[4])
    for back in backs:
        _draw_back(img, back, font)


def _draw_group(img: Image.Image, pairs: list, font: ImageFont.FreeTypeFont, label: str) -> None:
    sources = []
    targets = []
    for src, dst in pairs:
        if src not in sources:
            sources.append(src)
        if dst not in targets:
            targets.append(dst)
    pad = layout_num("arrowInset")
    slack = layout_num("alignSlack")
    split = layout_num("busSplit")
    lx = layout_num("labelX")
    ly = layout_num("labelY")
    matched = (
        len(sources) == len(targets)
        and len(sources) > 1
        and len({id(dst) for _src, dst in pairs}) == len(targets)
        and all(sum(1 for s, d in pairs if s is src) == 1 for src in sources)
    )
    if matched and len(pairs) == len(sources):
        for src, dst in pairs:
            x0, y0 = center_bottom(src["rect"])
            x1, y1 = center_top(dst["rect"])
            if abs(x0 - x1) < slack:
                draw_down_arrow(img, x0, y0 + pad, y1 - pad)
            else:
                mid = (y0 + y1) / 2
                draw_stem(img, x0, y0 + pad, mid)
                draw_bar(img, x0, x1, mid)
                draw_down_arrow(img, x1, mid, y1 - pad)
                place_junction(img, x0, mid)
                place_junction(img, x1, mid)
        return
    bottoms = [center_bottom(card["rect"]) for card in sources]
    tops = [center_top(card["rect"]) for card in targets]
    bus = (max(y for _x, y in bottoms) + min(y for _x, y in tops)) / 2
    if len(targets) == 1 and len(sources) >= 1:
        for x, y in bottoms:
            draw_stem(img, x, y + pad, bus)
            place_junction(img, x, bus)
        if len(sources) > 1:
            draw_bar(img, min(x for x, _y in bottoms), max(x for x, _y in bottoms), bus)
        tx, ty = tops[0]
        draw_down_arrow(img, tx, bus, ty - pad)
        place_junction(img, tx, bus)
    elif len(sources) == 1:
        sx, sy = bottoms[0]
        draw_stem(img, sx, sy + pad, bus)
        draw_bar(img, min(sx, min(x for x, _y in tops)), max(sx, max(x for x, _y in tops)), bus)
        place_junction(img, sx, bus)
        for x, y in tops:
            draw_down_arrow(img, x, bus, y - pad)
            place_junction(img, x, bus)
    else:
        for x, y in bottoms:
            draw_stem(img, x, y + pad, bus - split)
            place_junction(img, x, bus - split)
        draw_bar(img, min(x for x, _y in bottoms), max(x for x, _y in bottoms), bus - split)
        mid_x = sum(x for x, _y in bottoms) / len(bottoms)
        draw_stem(img, mid_x, bus - split, bus + split)
        place_junction(img, mid_x, bus - split)
        place_junction(img, mid_x, bus + split)
        draw_bar(img, min(x for x, _y in tops), max(x for x, _y in tops), bus + split)
        for x, y in tops:
            draw_down_arrow(img, x, bus + split, y - pad)
            place_junction(img, x, bus + split)
    if label:
        paint_text(img, (bottoms[0][0] + lx, bus - ly), label, font, INK, BARLOW_SEMI)


def _draw_back(img: Image.Image, back: dict, font: ImageFont.FreeTypeFont) -> None:
    src, dst = back["src"]["rect"], back["dst"]["rect"]
    rail = min(WELL_R - layout_num("backInset"), max(src[2], dst[2]) + layout_num("backOut"))
    sy = (src[1] + src[3]) / 2
    ty = (dst[1] + dst[3]) / 2
    draw_stem(img, rail, ty, sy)
    draw_bar(img, src[2], rail, sy)
    draw_left_arrow(img, rail, dst[2] + 2, ty)
    place_junction(img, rail, sy)
    place_junction(img, rail, ty)
    label = back["label"]
    if label:
        paint_text(
            img,
            (rail - run_width(label, font) - layout_num("bandPad"), (sy + ty) / 2 - layout_num("labelY")),
            label,
            font,
            INK,
            BARLOW_SEMI,
        )


def draw_cards(img: Image.Image, flow: dict, bands: list[dict]) -> None:
    label_font = font_at(BARLOW, int(layout_num("noteSize")))
    for band in bands:
        rect = band["rect"]
        if band["name"]:
            bx = rect[0] + part_size("layerLabel", "x")
            by = rect[1] + part_size("layerLabel", "y")
            place_part(
                img,
                "layerLabel",
                (bx, by, bx + part_size("layerLabel", "width"), by + part_size("layerLabel", "height")),
                "cyan",
            )
            paint_text(
                img,
                (rect[0] + part_size("layerLabel", "textX"), rect[1] + 2),
                band["name"].upper(),
                label_font,
                CYAN,
                BARLOW,
            )
        for row in band["rows"]:
            for card in row:
                lines = flow["layers"][card["layer"]]["nodes"][card["index"]]["lines"]
                _draw_card(img, lines, card["rect"], card["number"])


def _draw_card(
    img: Image.Image,
    lines: list[str],
    rect: tuple[int, int, int, int],
    number: str,
) -> None:
    x0, y0, x1, y1 = rect
    place_part(img, "card", rect, "cyan")
    metrics = card_metrics(lines, x1 - x0, bool(number))
    title_lines = metrics["title_lines"]
    title_font = metrics["title_font"]
    body = metrics["body"]
    wrapped = metrics["wrapped"]
    pad_x = part_size("card", "padX")
    pad_y = part_size("card", "padY")
    cursor_x = x0 + pad_x
    mode = badge_plan(number)
    raw_title, _details = title_and_details(lines)
    if mode == "number":
        side = part_size("numberTile", "size")
        tile = (cursor_x, y0 + pad_y, cursor_x + side, y0 + pad_y + side)
        place_part(img, "numberTile", tile, "cyan")
        num_font = fit_width(BARLOW, number, 28, 22, 14)
        nb = num_font.getbbox(number)
        paint_text(
            img,
            (tile[0] + (side - (nb[2] - nb[0])) / 2, tile[1] + (side - (nb[3] - nb[1])) / 2 - nb[1]),
            number,
            num_font,
            CYAN,
            BARLOW,
        )
        cursor_x += part_size("numberTile", "advance")
    elif mode == "icon":
        side = part_size("icon", "size")
        icon = (cursor_x, y0 + pad_y, cursor_x + side, y0 + pad_y + side)
        place_part(img, "icon", icon, "cyan", kind=icon_kind(raw_title))
        cursor_x += part_size("icon", "advance")
    else:
        raise RuntimeError("card badge outside the kit")
    y = y0 + pad_y
    drawn: list[str] = []
    for line in title_lines:
        paint_text(img, (cursor_x, y), line, title_font, INK, BARLOW)
        drawn.extend(line.split())
        y += metrics["line_h"]
    y = y0 + pad_y + metrics["title_h"] + part_size("card", "detailGap")
    for line in wrapped:
        if y + body.size > y1 - layout_num("arrowInset"):
            raise RuntimeError(f"card clipped text: {line}")
        paint_text(img, (cursor_x, y), line, body, MUTED, BARLOW_SEMI)
        drawn.extend(line.split())
        y += body.size + part_size("card", "detailLead")
    if [word.casefold() for word in drawn] != [word.casefold() for word in " ".join(lines).split()]:
        raise RuntimeError(f"card dropped words from {lines[0] if lines else ''}")


def _fleet_bounds() -> tuple[int, int, float]:
    """Cards sit inside the well. The feed rail stays in the left gutter."""
    gutter = 44
    row_left = WELL_L + gutter
    row_right = WELL_R - gutter
    rail_x = float(row_left - 36)
    return row_left, row_right, rail_x


def _fleet_row(
    flow: dict,
    layer: int,
    width: int,
    gap: int,
    numbered: bool,
    left: int,
    top: int,
) -> tuple[list[dict], int]:
    count = len(flow["layers"][layer]["nodes"])
    heights = [
        measure_card(flow["layers"][layer]["nodes"][i]["lines"], width, numbered)
        for i in range(count)
    ]
    row_h = max(heights)
    row_w = width * count + gap * (count - 1)
    inner = _fleet_bounds()[1] - left
    x = left + max(0, (inner - row_w) // 2)
    cards = []
    for index in range(count):
        rect = (int(x), int(top), int(x + width), int(top + row_h))
        number = str(index + 1) if numbered else ""
        cards.append({"layer": layer, "index": index, "row": 0, "rect": rect, "number": number})
        x += width + gap
    return cards, row_h


def layout_fleet(flow: dict, header_bottom: int) -> tuple[int, list[dict], list[dict]]:
    """Square X frame. Layers stay in source order, top to bottom. The core is a numbered row."""
    counts = [len(layer["nodes"]) for layer in flow["layers"]]
    if counts != [3, 3, 5, 3]:
        raise RuntimeError(f"fleet layers drifted: {counts}")
    if "PROCESSING" not in flow["layers"][2]["name"].upper():
        raise RuntimeError("fleet processing layer drifted")
    height = FLEET_SIZE
    row_left, row_right, rail_x = _fleet_bounds()
    if rail_x - RAIL_GLOW / 2 < part_size("rivet", "inset") + part_size("rivet", "diameter"):
        raise RuntimeError("fleet rail crosses a rivet")
    inner = row_right - row_left
    gaps = (20, 20, 48, 20)
    numbered = (False, False, True, False)
    widths = []
    row_heights = []
    for layer, gap, numbers in zip(range(4), gaps, numbered):
        count = counts[layer]
        width = (inner - gap * (count - 1)) // count
        widths.append(width)
        row_heights.append(
            max(
                measure_card(flow["layers"][layer]["nodes"][i]["lines"], width, numbers)
                for i in range(count)
            )
        )
    label_h = int(layout_num("bandPad")) + int(layout_num("labelBlock"))
    band_end = int(layout_num("bandEnd"))
    band_heights = [label_h + row_h + band_end for row_h in row_heights]
    channels = [40, 64, 64]
    note_font = font_at(BARLOW_SEMI, int(layout_num("noteSize")))
    note_inner = WELL_R - WELL_L - int(layout_num("innerInset"))
    note_h = 0
    for note in flow["notes"]:
        note_h += int(layout_num("noteLine")) * max(1, len(wrap_lines(note, note_font, note_inner)))
    top = header_bottom + int(layout_num("belowHeader"))
    foot_top = height - int(part_size("footer", "raise"))
    content_bottom = foot_top - int(layout_num("footGap")) - note_h - int(part_size("header", "after"))
    slack = content_bottom - top - sum(band_heights) - sum(channels)
    if slack < 0:
        raise RuntimeError(f"fleet square is short by {-slack}px")
    share = slack // len(channels)
    channels = [channel + share for channel in channels]
    channels[-1] += slack - share * len(channels)
    cursor = top
    bands: list[dict] = []
    for layer, width, gap, numbers, row_h, channel in zip(
        range(4), widths, gaps, numbered, row_heights, channels + [0]
    ):
        band_top = cursor
        cards, placed_h = _fleet_row(flow, layer, width, gap, numbers, row_left, band_top + label_h)
        if placed_h != row_h:
            raise RuntimeError("fleet row height drifted")
        label_left = row_left
        if numbers:
            rect0 = cards[0]["rect"]
            center = (rect0[0] + rect0[2]) / 2
            label_left = int(center + RAIL_GLOW / 2 + 10 - part_size("layerLabel", "textX"))
        cursor = band_top + label_h + row_h + band_end
        bands.append({
            "rect": (label_left, band_top, row_right, cursor),
            "name": flow["layers"][layer]["name"],
            "rows": [cards],
            "layer": layer,
        })
        cursor += channel
    if bands[-1]["rect"][3] > content_bottom:
        raise RuntimeError("fleet notes collide with the footer")
    placed = [card for band in bands for row in band["rows"] for card in row]
    _assert_fleet_cards(placed, height)
    return height, bands, placed


def _assert_fleet_cards(placed: list[dict], height: int) -> None:
    rects = [card["rect"] for card in placed]
    for index, rect in enumerate(rects):
        if rect[0] < WELL_L or rect[1] < 0 or rect[2] > WELL_R or rect[3] > height:
            raise RuntimeError(f"fleet card outside the frame: {rect}")
        for other in rects[index + 1:]:
            if rect[0] < other[2] and other[0] < rect[2] and rect[1] < other[3] and other[1] < rect[3]:
                raise RuntimeError(f"fleet cards overlap: {rect} {other}")


def _segment_hits_card(x0: float, y0: float, x1: float, y1: float, rect: tuple[int, int, int, int]) -> bool:
    left, right = sorted((x0, x1))
    top, bot = sorted((y0, y1))
    pad = RAIL_GLOW / 2
    return left - pad < rect[2] and rect[0] < right + pad and top < rect[3] and rect[1] < bot


def draw_fleet_arrows(img: Image.Image, flow: dict, bands: list[dict]) -> None:
    """Inputs and the side feed join blinky. The core counts left to right. arch1 fans to the outputs."""
    located: dict[tuple[int, int], dict] = {}
    for band in bands:
        for row in band["rows"]:
            for card in row:
                located[(card["layer"], card["index"])] = card
    for edge in flow["edges"]:
        src = (int(edge["from"][0]), int(edge["from"][1]))
        dst = (int(edge["to"][0]), int(edge["to"][1]))
        fed = dst == (2, 0) and src[0] in (0, 1)
        chain = src[0] == 2 and dst[0] == 2 and dst[1] == src[1] + 1
        fan = src == (2, 4) and dst[0] == 3
        if edge["label"] or not (fed or chain or fan):
            raise RuntimeError(f"fleet edge not laid out: {src} -> {dst}")
    by_layer = {int(band["layer"]): band for band in bands}
    inputs = [located[(0, index)] for index in range(3)]
    side = [located[(1, index)] for index in range(3)]
    proc = [located[(2, index)] for index in range(5)]
    outs = [located[(3, index)] for index in range(3)]
    _rail_x = _fleet_bounds()[2]
    pad = layout_num("arrowInset")
    cards = inputs + side + proc + outs

    def stem_clear(x: float, y0: float, y1: float) -> None:
        for card in cards:
            if _segment_hits_card(x, y0, x, y1, card["rect"]):
                raise RuntimeError("fleet rail crosses a card")

    def bar_clear(x0: float, x1: float, y: float) -> None:
        for card in cards:
            if _segment_hits_card(x0, y, x1, y, card["rect"]):
                raise RuntimeError("fleet bus crosses a card")

    input_bottoms = [center_bottom(card["rect"]) for card in inputs]
    side_top = by_layer[1]["rect"][1]
    input_bus = (max(y for _x, y in input_bottoms) + side_top) / 2
    side_bottoms = [center_bottom(card["rect"]) for card in side]
    proc_top = by_layer[2]["rect"][1]
    side_bus = (max(y for _x, y in side_bottoms) + proc_top) / 2
    bar_clear(_rail_x, max(x for x, _y in input_bottoms), input_bus)
    stem_clear(_rail_x, input_bus, side_bus)
    for x, y in input_bottoms:
        stem_clear(x, y + pad, input_bus)
        draw_stem(img, x, y + pad, input_bus)
        place_junction(img, x, input_bus)
    draw_bar(img, _rail_x, max(x for x, _y in input_bottoms), input_bus)
    place_junction(img, _rail_x, input_bus)
    draw_stem(img, _rail_x, input_bus, side_bus)
    place_junction(img, _rail_x, side_bus)
    bar_clear(_rail_x, max(x for x, _y in side_bottoms), side_bus)
    for x, y in side_bottoms:
        stem_clear(x, y + pad, side_bus)
        draw_stem(img, x, y + pad, side_bus)
        place_junction(img, x, side_bus)
    draw_bar(img, _rail_x, max(x for x, _y in side_bottoms), side_bus)
    blink_x, blink_y = center_top(proc[0]["rect"])
    draw_down_arrow(img, blink_x, side_bus, blink_y - pad)
    place_junction(img, blink_x, side_bus)
    for src, dst in zip(proc, proc[1:]):
        y = (src["rect"][1] + src["rect"][3]) / 2
        draw_right_arrow(img, src["rect"][2] + pad, dst["rect"][0] - pad, y)
    arch = proc[-1]
    arch_x, arch_y = center_bottom(arch["rect"])
    tops = [center_top(card["rect"]) for card in outs]
    out_bus = (arch_y + min(y for _x, y in tops)) / 2
    bar_clear(min(arch_x, min(x for x, _y in tops)), max(arch_x, max(x for x, _y in tops)), out_bus)
    stem_clear(arch_x, arch_y + pad, out_bus)
    draw_stem(img, arch_x, arch_y + pad, out_bus)
    draw_bar(img, min(arch_x, min(x for x, _y in tops)), max(arch_x, max(x for x, _y in tops)), out_bus)
    place_junction(img, arch_x, out_bus)
    for x, y in tops:
        draw_down_arrow(img, x, out_bus, y - pad)
        place_junction(img, x, out_bus)


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


def palette_rgbs() -> list[tuple[int, int, int]]:
    found: list[tuple[int, int, int]] = []
    for name, value in KIT["palette"].items():
        if name in {"default", "rainbow"} or not isinstance(value, list) or not value or isinstance(value[0], list):
            continue
        color = _rgb(value)
        if color not in found:
            found.append(color)
    for item in KIT["palette"]["rainbow"]:
        color = _rgb(item)
        if color not in found:
            found.append(color)
    return found


def quantize_plate(rgb: Image.Image) -> Image.Image:
    """256 colors, with every kit ink kept intact."""
    unique = palette_rgbs()
    arr = np.asarray(rgb.convert("RGB"))
    sample = arr.copy()
    protected = np.zeros(arr.shape[:2], dtype=bool)
    for color in unique:
        delta = np.abs(arr.astype(np.int16) - np.array(color, dtype=np.int16)).sum(axis=2)
        protected |= delta <= 6
    sample[protected] = palette_color("shadow")
    slots = 256 - len(unique)
    rough = Image.fromarray(sample, "RGB").quantize(
        colors=slots, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE,
    )
    pal = list(rough.getpalette()[: slots * 3])
    for color in unique:
        pal.extend(int(channel) for channel in color)
    pal_img = Image.new("P", (1, 1))
    pal_img.putpalette(pal + [0] * (768 - len(pal)))
    return rgb.quantize(palette=pal_img, dither=Image.Dither.NONE)


def _bind_canvas(fleet: bool) -> tuple[int, int, int]:
    """The fleet X copy is a square. Every other plate keeps the kit width."""
    global W, WELL_L, WELL_R
    saved = (W, WELL_L, WELL_R)
    if fleet:
        margin = int(layout_num("width")) - int(layout_num("wellRight"))
        W = FLEET_SIZE
        WELL_L = int(layout_num("wellLeft"))
        WELL_R = FLEET_SIZE - margin
    return saved


def _restore_canvas(saved: tuple[int, int, int]) -> None:
    global W, WELL_L, WELL_R
    W, WELL_L, WELL_R = saved


def render(md_path: Path, out_path: Path) -> None:
    saved = _bind_canvas(md_path.stem == "fleet")
    try:
        _render_plate(md_path, out_path)
    finally:
        _restore_canvas(saved)


def _render_plate(md_path: Path, out_path: Path) -> None:
    text = md_path.read_text(encoding="utf8")
    payload = fence_payload(text)
    lines = fence_lines(payload)
    if not lines or len(set(map(len, lines))) != 1:
        raise RuntimeError(f"{md_path.name} fence is not one width")
    flow = parse_flow(lines)
    boxes = layer_node_boxes(lines)
    if len(boxes) != len(flow["layers"]):
        raise RuntimeError(f"{md_path.name} layer count drifted")
    for layer, brows in zip(flow["layers"], boxes):
        if len(layer["nodes"]) != len(brows):
            raise RuntimeError(f"{md_path.name} node count drifted")
        for node, box in zip(layer["nodes"], brows):
            if node["lines"] != node_text(lines, box):
                raise RuntimeError(f"{md_path.name} node text drifted")
    global RAINBOW_ARROWS
    meta = frontmatter(text)
    title = meta.get("title", md_path.stem).upper()
    subtitle = lead_line(text)
    stamp = footer_line(text)
    RAINBOW_ARROWS = rainbow_for(title)
    side = part_size("header", "side")
    reserve = part_size("title", "reserve")
    title_font = fit_width(BLACKOPS, title, W - side - reserve, 54, 22)
    tb = title_font.getbbox(title or " ")
    sub_font = None
    sb = (0, 0, 0, 0)
    sub_gap = 0
    if subtitle:
        sub_font = fit_width(BARLOW_SEMI, subtitle, W - side - reserve, 22, 14)
        sb = sub_font.getbbox(subtitle)
        sub_gap = part_size("subtitle", "gap")
    top_pad = part_size("title", "pad")
    title_ink = tb[3] - tb[1]
    text_bottom = top_pad + title_ink + (sub_gap + sb[3] if subtitle else 0)
    groove_h = part_size("accentRail", "height")
    groove_gap = part_size("accentRail", "gap")
    name_top = part_size("header", "top")
    name_h = max(part_size("header", "minHeight"), int(text_bottom + part_size("header", "after") + groove_gap + groove_h))
    name = (int(side), int(name_top), W - int(side), int(name_top + name_h))
    fleet = md_path.stem == "fleet"
    if fleet:
        height, bands, _placed = layout_fleet(flow, name[3])
    else:
        height, bands, _placed = layout(flow, boxes, name[3])
    img = Image.new("RGBA", (W, height), (0, 0, 0, 0))
    place_part(img, "frame", (0, 0, W, height), "metal")
    rivet = part_size("rivet", "diameter")
    inset = part_size("rivet", "inset")
    for rx, ry in (
        (inset, inset),
        (W - inset - rivet, inset),
        (inset, height - inset - rivet),
        (W - inset - rivet, height - inset - rivet),
        ((W - rivet) / 2, inset),
        ((W - rivet) / 2, height - inset - rivet),
        (inset, (height - rivet) / 2),
        (W - inset - rivet, (height - rivet) / 2),
    ):
        place_part(img, "rivet", (rx, ry, rx + rivet, ry + rivet), "rivet")
    place_part(img, "header", name, "metalRaised")
    logo = draw_0xray_logo(int(part_size("logoSlot", "mark")), bg="transparent")
    slot = (
        name[0] + part_size("logoSlot", "x"),
        name[1] + part_size("logoSlot", "y"),
        name[0] + part_size("logoSlot", "x") + logo.width,
        name[1] + part_size("logoSlot", "y") + logo.height,
    )
    place_part(img, "logoSlot", slot, "shadow")
    img.alpha_composite(logo, (int(slot[0]), int(slot[1])))
    tx = name[0] + part_size("title", "x")
    ty = name[1] + top_pad - tb[1]
    place_part(img, "title", (tx, ty + tb[1], tx + max(1, tb[2] - tb[0]), ty + tb[3]), "ink")
    paint_text(img, (tx + 2, ty + 2), title, title_font, SHADOW, BLACKOPS)
    paint_text(img, (tx, ty), title, title_font, INK, BLACKOPS)
    if subtitle and sub_font is not None:
        sy = ty + tb[3] + sub_gap
        place_part(img, "subtitle", (tx, sy, tx + max(1, sb[2] - sb[0]), sy + max(1, sb[3] - sb[1])), "cyan")
        paint_text(img, (tx, sy), subtitle, sub_font, CYAN, BARLOW_SEMI)
    rail_inset = part_size("accentRail", "inset")
    groove = (name[0] + rail_inset, name[3] - groove_gap - groove_h, name[2] - rail_inset, name[3] - groove_gap)
    if RAINBOW_ARROWS:
        span = groove[2] - groove[0]
        for index, name_color in enumerate(RAINBOW_NAMES):
            seg = (groove[0] + span * index / len(RAINBOW_NAMES), groove[1], groove[0] + span * (index + 1) / len(RAINBOW_NAMES), groove[3])
            place_part(img, "accentRail", seg, name_color)
    else:
        place_part(img, "accentRail", groove, "cyan")
    label_font = font_at(BARLOW_SEMI, int(part_size("header", "after")))
    if fleet:
        draw_fleet_arrows(img, flow, bands)
    else:
        draw_flow_arrows(img, flow, bands, label_font)
    draw_cards(img, flow, bands)
    if flow["notes"]:
        note_font = font_at(BARLOW_SEMI, int(layout_num("noteSize")))
        ny = bands[-1]["rect"][3] + part_size("header", "after")
        for note in flow["notes"]:
            for line in wrap_lines(note, note_font, WELL_R - WELL_L - layout_num("innerInset")):
                paint_text(img, (WELL_L + layout_num("footGap"), ny), line, note_font, MUTED, BARLOW_SEMI)
                ny += layout_num("noteLine")
    foot = (
        int(part_size("footer", "side")),
        height - int(part_size("footer", "raise")),
        W - int(part_size("footer", "side")),
        height - int(part_size("footer", "bottom")),
    )
    place_part(img, "footer", foot, "floor")
    badge_font = fit_width(BARLOW, stamp, foot[2] - foot[0] - int(part_size("header", "side") * 0.75), 28, 16)
    bb = badge_font.getbbox(stamp or " ")
    bw = bb[2] - bb[0]
    by = foot[1] + (foot[3] - foot[1] - (bb[3] - bb[1])) / 2 - bb[1]
    paint_text(img, (foot[0] + (foot[2] - foot[0] - bw) / 2, by), stamp, badge_font, CYAN, BARLOW)

    rgb = img.convert("RGB")
    if rgb.size != (W, height):
        raise RuntimeError("canvas was resized after type")
    if fleet and (W, height) != (FLEET_SIZE, FLEET_SIZE):
        raise RuntimeError(f"fleet canvas is {W}x{height}")
    quant = quantize_plate(rgb)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    quant.save(out_path, optimize=True)
    subprocess.run(["optipng", "-o1", "-quiet", str(out_path)], check=True)
    blob = json.dumps(flow, ensure_ascii=False, separators=(",", ":"))
    write_itxt(out_path, blob)
    if read_itxt(out_path) != blob:
        raise RuntimeError(f"embedded flow drifted for {md_path.name}")
    print(f"{md_path.stem} {W}x{height} {out_path.stat().st_size}", flush=True)


def _svg_problems(name: str, text: str) -> list[str]:
    problems: list[str] = []
    if "<text" in text or "emoji" in text.lower() or "style=" in text or "rgb(" in text.lower():
        problems.append(f"{name} color or glyph outside the kit")
    if re.search(r"#[0-9A-Fa-f]{3,8}", text):
        problems.append(f"{name} color outside the kit")
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        problems.append(f"{name} is outside the kit")
        return problems
    for el in root.iter():
        tag = el.tag.rsplit("}", 1)[-1]
        if tag not in SVG_TAGS:
            problems.append(f"{name} shape outside the kit: {tag}")
        for attr in ("fill", "stroke"):
            value = el.attrib.get(attr)
            if value is None or value in {"none", "currentColor"}:
                continue
            prefix = "palette:"
            if value.startswith(prefix):
                try:
                    palette_color(value[len(prefix):])
                except KeyError:
                    problems.append(f"{name} color outside the kit: {value}")
                continue
            problems.append(f"{name} color outside the kit: {value}")
    return problems


def audit_kit() -> list[str]:
    """Fail closed when a plate uses a shape, part, or color outside the kit."""
    problems: list[str] = []
    if KIT["palette"].get("default") != "cyan":
        problems.append("default color is outside the kit")
    if len(KIT["palette"]["rainbow"]) != 6:
        problems.append("rainbow is outside the kit")
    if HEAD_SHAPE != "triangle":
        problems.append(f"arrow style outside the kit: {HEAD_SHAPE}")
    locked = (
        ("rail", "width", "railWidth"),
        ("rail", "glow", "railGlow"),
    )
    for part, key, line_key in locked:
        if part_size(part, key) != float(KIT["line"][line_key]):
            problems.append(f"{part} {key} outside the kit")
    for key in ("length", "halfWidth", "glowHalfWidth"):
        if part_size("arrowhead", key) != float(KIT["line"]["arrowhead"][key]):
            problems.append(f"arrowhead {key} outside the kit")
    try:
        palette_color("magenta")
        problems.append("accepted a color outside the kit")
    except KeyError:
        pass
    for index, name in enumerate(RAINBOW_NAMES):
        try:
            full = palette_color(name)
            dim = palette_color(f"{name}Dim")
        except KeyError:
            problems.append(f"{name} outside the kit")
            continue
        if list(full) != [int(channel) for channel in KIT["palette"]["rainbow"][index]]:
            problems.append(f"{name} outside the kit")
        expect = tuple(int(channel * GLOW_FACTOR) for channel in full)
        if dim != expect:
            problems.append(f"{name} dim outside the kit")
    try:
        icon_file("not-a-kind")
        problems.append("accepted an unknown icon kind")
    except KeyError:
        pass
    if badge_plan("1") != "number" or badge_plan("") != "icon":
        problems.append("card badge left the kit")
    for kind, name in ICONS.items():
        if not isinstance(name, str) or name != Path(name).name or not name.endswith(".svg"):
            problems.append(f"icon {kind} is not exactly one svg")
            continue
        svg = ICONS_DIR / name
        if not svg.is_file():
            problems.append(f"missing SVG: {name}")
            continue
        problems.extend(_svg_problems(name, svg.read_text(encoding="utf8")))
    for rule in KIT["iconMatch"]:
        if str(rule["kind"]) not in ICONS:
            problems.append(f"unknown icon kind: {rule['kind']}")
    for part, spec in KIT["parts"].items():
        if "sizes" not in spec:
            problems.append(f"{part} has no sizes")
        if part == "icon":
            continue
        name = spec.get("svg")
        if not isinstance(name, str) or name != Path(name).name or not name.endswith(".svg"):
            problems.append(f"{part} is not one svg")
            continue
        svg = KIT_DIR / name
        if not svg.is_file():
            problems.append(f"missing SVG: {name}")
            continue
        problems.extend(_svg_problems(name, svg.read_text(encoding="utf8")))
    head = (KIT_DIR / "arrowhead.svg").read_text(encoding="utf8") if (KIT_DIR / "arrowhead.svg").is_file() else ""
    if "<polygon" not in head:
        problems.append("arrow style outside the kit")
    for md in sorted(PLATES.glob("*.md")):
        if md.stem in SKIP:
            continue
        payload = fence_payload(md.read_text(encoding="utf8"))
        flow = parse_flow(fence_lines(payload))
        for layer in flow["layers"]:
            for node in layer["nodes"]:
                raw, _rest = title_and_details(node["lines"])
                try:
                    kind = icon_kind(raw)
                    icon_file(kind)
                except (KeyError, FileNotFoundError) as exc:
                    problems.append(f"{md.stem}: {exc}")
    source = Path(__file__).read_text(encoding="utf8")
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module == "metal_kit":
            problems.append("plate draws outside the kit")
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name == "metal_kit":
                    problems.append("plate draws outside the kit")
    stamp_span = (0, 0)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == "stamp_svg":
            stamp_span = (node.lineno, node.end_lineno or node.lineno)
    if stamp_span == (0, 0):
        problems.append("missing kit stamper")
    palette = set(palette_rgbs())
    allowed_colors = {
        name for name, value in KIT["palette"].items()
        if isinstance(value, list) and value and isinstance(value[0], int)
    }
    placed: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr in SHAPE_DRAWS:
            if not (stamp_span[0] <= node.lineno <= stamp_span[1]):
                problems.append(f"{node.func.attr} shape outside the kit")
        if (
            isinstance(node, ast.Tuple)
            and len(node.elts) == 3
            and all(isinstance(item, ast.Constant) and isinstance(item.value, int) for item in node.elts)
        ):
            rgb = (int(node.elts[0].value), int(node.elts[1].value), int(node.elts[2].value))
            if rgb not in palette:
                problems.append(f"color {rgb} outside the kit")
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "place_part":
            if len(node.args) >= 2 and isinstance(node.args[1], ast.Constant) and isinstance(node.args[1].value, str):
                part = node.args[1].value
                placed.add(part)
                if part not in KIT["parts"]:
                    problems.append(f"part {part} outside the kit")
            if len(node.args) >= 4 and isinstance(node.args[3], ast.Constant) and isinstance(node.args[3].value, str):
                if node.args[3].value not in allowed_colors:
                    problems.append(f"color {node.args[3].value} outside the kit")
    for part in KIT["parts"]:
        if part not in placed:
            problems.append(f"part {part} is not assembled")
    start = source.find("def _draw_card")
    end = source.find("\ndef ", start + 1)
    card = source[start:end]
    if "badge_plan" not in card or card.count('place_part(img, "icon"') != 1 or card.count('place_part(img, "numberTile"') != 1:
        problems.append("card badge is not planned from the kit")
    rest = card.split('if mode == "number":', 1)[1]
    number_branch, icon_and_rest = rest.split('elif mode == "icon":', 1)
    icon_branch = icon_and_rest.split("else:", 1)[0]
    if '"icon"' in number_branch or '"numberTile"' in icon_branch:
        problems.append("card has both a number and an icon")
    return problems


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plate")
    ap.add_argument("--out")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    if args.all:
        total = 0
        for path in sorted(PLATES.glob("*.md")):
            if path.stem in SKIP:
                continue
            dest = OUT_DIR / f"{path.stem}.png"
            render(path, dest)
            total += dest.stat().st_size
        print(f"total {total}", flush=True)
        return
    if not args.plate or not args.out:
        ap.error("pass --plate and --out, or --all")
    render(Path(args.plate), Path(args.out))


if __name__ == "__main__":
    main()
