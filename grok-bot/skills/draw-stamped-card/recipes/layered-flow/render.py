"""Stamped infographic X copy of an ASCII plate.

The drawing is free: riveted frame, icon cards, bold caps titles, cyan block
arrows, numbered processing tiles, footer banner. The flow is not free. Nodes,
text, order, edges, and layers come from the markdown fence.

Usage:
  python3 render.py --plate docs-site/docs/plates/routing.md --out docs-site/static/plates/x/routing.png
  python3 render.py --all
"""
from __future__ import annotations

import argparse
import json
import math
import struct
import subprocess
import sys
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
import metal_kit  # noqa: E402
from metal_kit import (  # noqa: E402
    glow,
    outer_frame,
    paint,
    raised_plaque,
    recessed_tray,
    rect_mask as _RECT,
    to_img,
)
from accent import resolve_accent  # noqa: E402
from draw_0xray_logo import draw_0xray_logo  # noqa: E402

metal_kit._metal_orig = metal_kit.metal

ROOT = HERE.parents[4]
PLATES = ROOT / "docs-site/docs/plates"
OUT_DIR = ROOT / "docs-site/static/plates/x"
SKIP = {"review", "goggles", "suit", "kits", "host-pack", "glossary", "index"}
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BLACKOPS = str(SB / "assets/fonts/BlackOpsOne-Regular.ttf")
BARLOW = str(SB / "assets/fonts/BarlowCondensed-Bold.ttf")
BARLOW_SEMI = str(SB / "assets/fonts/BarlowCondensed-SemiBold.ttf")
W = 1280
WELL_L, WELL_R = 56, 1224
TEXT_KEY = "xray-plate-flow"
CYAN = (90, 214, 222)
CYAN_DIM = (22, 78, 88)
INK = (236, 238, 236)
MUTED = (168, 178, 188)
SHADOW = (12, 14, 16)
RAINBOW = (
    (235, 52, 52),
    (245, 140, 30),
    (245, 220, 40),
    (60, 200, 90),
    (50, 140, 245),
    (150, 70, 230),
)
_POLY = metal_kit.poly_mask
RAINBOW_ARROWS = False
# These arrows are drawn, not taken from a font. Barlow has no → glyph.
INLINE_ARROWS = {
    "→": 1,
    "←": -1,
    "↔": 0,
}
_CMAP: dict[str, set[int]] = {}


def bind_canvas(width: int, height: int) -> None:
    """Tall plates need the real mask size. Quiet grain keeps a 256-color PNG small."""
    size = (width, height)

    def rect_mask(box, radius=0, size=size):
        return _RECT(box, radius, size)

    def poly_mask(pts, size=size):
        return _POLY(pts, size)

    def metal(h, w, seed, tone=(58, 58, 60), rough=1.0, brushed=False, pits=0.0):
        return metal_kit._metal_orig(h, w, seed, tone, min(rough, 0.16), brushed, 0.0)

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


def draw_inline_arrow(draw: ImageDraw.ImageDraw, x: float, y: float, font: ImageFont.FreeTypeFont, ch: str) -> float:
    """Small cyan block arrow standing in for a character the face does not have."""
    width = inline_arrow_width(font)
    ascent, _descent = font.getmetrics()
    mid = y + ascent * 0.58
    thick = max(2, round(font.size * 0.1))
    head = width * 0.34
    direction = INLINE_ARROWS[ch]
    if direction >= 0:
        shaft = x + width - head
        draw.rectangle((x, mid - thick, shaft, mid + thick), fill=CYAN_DIM)
        draw.rectangle((x, mid - thick * 0.55, shaft, mid + thick * 0.55), fill=CYAN)
        draw.polygon(
            [(shaft - 1, mid - thick * 2.3), (shaft - 1, mid + thick * 2.3), (x + width, mid)],
            fill=CYAN,
        )
    if direction <= 0:
        shaft = x + head
        draw.rectangle((shaft, mid - thick, x + width, mid + thick), fill=CYAN_DIM)
        draw.rectangle((shaft, mid - thick * 0.55, x + width, mid + thick * 0.55), fill=CYAN)
        draw.polygon(
            [(shaft + 1, mid - thick * 2.3), (shaft + 1, mid + thick * 2.3), (x, mid)],
            fill=CYAN,
        )
    return x + width


def paint_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    font_path: str,
) -> None:
    ensure_glyphs(font_path, text)
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
            x = draw_inline_arrow(draw, x, y, font, ch)
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
    text = title.lower()
    table = (
        ("doc", ("file", "log", "json", "path", ".md", "write")),
        ("user", ("agent", "seat", "owner", "user")),
        ("bars", ("score", "threshold", "heat", "metric")),
        ("eye", ("lens", "look", "goggle", "visor")),
        ("branch", ("route", "dispatch", "gate")),
        ("stack", ("memory", "station", "layer")),
    )
    for kind, keys in table:
        if any(key in text for key in keys):
            return kind
    return ("dot", "hex", "diamond", "ring")[sum(ord(ch) for ch in title) % 4]


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
    gutter = 18 + (46 if numbered else 0) + 36 + 16
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
    line_h = title_font.size + 4
    title_h = max(34, max(1, len(title_lines)) * line_h)
    height = max(112, 18 + title_h + 8 + len(wrapped) * (body.size + 7) + 18)
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
    inner = WELL_R - WELL_L - 36
    y = header_bottom + 22
    placed: list[dict] = []
    bands: list[dict] = []
    stacked = all(len(layer["nodes"]) == 1 and not layer["name"] for layer in flow["layers"])
    stack_step = 1
    for li, layer in enumerate(flow["layers"]):
        rows = row_groups(boxes[li])
        numbered = "PROCESSING" in layer["name"].upper() or (stacked and len(flow["layers"]) >= 3)
        groups = visual_rows(rows)
        cols = max(len(group) for group in groups)
        band_top = y
        cursor = y + 8
        if layer["name"]:
            cursor += 28
        row_places: list[list[dict]] = []
        for ri, group in enumerate(groups):
            gap = 64 if _indexes_have_horizontal(flow, li, group) and len(group) > 1 else 20
            if len(group) == 1 and cols == 1 and not layer["name"]:
                width = min(920, inner)
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
            x = WELL_L + 18 + offset
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
                cursor += 72
        cursor += 10
        bands.append({
            "rect": (WELL_L, band_top, WELL_R, cursor),
            "name": layer["name"],
            "rows": row_places,
        })
        placed.extend(card for row in row_places for card in row)
        y = cursor + (72 if li < len(flow["layers"]) - 1 else 0)
    note_h = 0
    if flow["notes"]:
        note_font = font_at(BARLOW_SEMI, 18)
        for note in flow["notes"]:
            note_h += 24 * max(1, len(wrap_lines(note, note_font, inner)))
        note_h += 16
    foot_top = y + 12 + note_h
    height = foot_top + 78 + 36
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


def _shade(color: tuple[int, int, int], factor: float) -> tuple[int, int, int]:
    return tuple(max(0, min(255, int(channel * factor))) for channel in color)


def _paint_span(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], along: str, factor: float) -> None:
    x0, y0, x1, y1 = box
    if not RAINBOW_ARROWS:
        draw.rectangle((x0, y0, x1, y1), fill=CYAN if factor > 0.7 else CYAN_DIM)
        return
    if along == "v":
        span0, span1 = (y0, y1) if y1 >= y0 else (y1, y0)
    else:
        span0, span1 = (x0, x1) if x1 >= x0 else (x1, x0)
    span = max(1.0, span1 - span0)
    for index, color in enumerate(RAINBOW):
        a = span0 + span * index / len(RAINBOW)
        b = span0 + span * (index + 1) / len(RAINBOW)
        ink = _shade(color, factor)
        if along == "v":
            draw.rectangle((x0, a, x1, b), fill=ink)
        else:
            draw.rectangle((a, y0, b, y1), fill=ink)


def _paint_down_head(draw: ImageDraw.ImageDraw, x: float, top: float, bot: float, half: float, factor: float) -> None:
    if not RAINBOW_ARROWS:
        ink = CYAN if factor > 0.7 else CYAN_DIM
        draw.polygon([(x - half, top), (x + half, top), (x, bot)], fill=ink)
        return
    span = max(1.0, bot - top)
    for index, color in enumerate(RAINBOW):
        a = top + span * index / len(RAINBOW)
        b = top + span * (index + 1) / len(RAINBOW)
        wa = half * (1 - (a - top) / span)
        wb = half * (1 - (b - top) / span)
        draw.polygon([(x - wa, a), (x + wa, a), (x + wb, b), (x - wb, b)], fill=_shade(color, factor))


def _paint_right_head(draw: ImageDraw.ImageDraw, left: float, right: float, y: float, half: float, factor: float) -> None:
    if not RAINBOW_ARROWS:
        ink = CYAN if factor > 0.7 else CYAN_DIM
        draw.polygon([(left, y - half), (left, y + half), (right, y)], fill=ink)
        return
    span = max(1.0, right - left)
    for index, color in enumerate(RAINBOW):
        a = left + span * index / len(RAINBOW)
        b = left + span * (index + 1) / len(RAINBOW)
        ha = half * (1 - (a - left) / span)
        hb = half * (1 - (b - left) / span)
        draw.polygon([(a, y - ha), (a, y + ha), (b, y + hb), (b, y - hb)], fill=_shade(color, factor))


def _paint_left_head(draw: ImageDraw.ImageDraw, left: float, right: float, y: float, half: float, factor: float) -> None:
    if not RAINBOW_ARROWS:
        ink = CYAN if factor > 0.7 else CYAN_DIM
        draw.polygon([(right, y - half), (right, y + half), (left, y)], fill=ink)
        return
    span = max(1.0, right - left)
    for index, color in enumerate(RAINBOW):
        a = left + span * index / len(RAINBOW)
        b = left + span * (index + 1) / len(RAINBOW)
        ha = half * ((a - left) / span)
        hb = half * ((b - left) / span)
        draw.polygon([(a, y - ha), (a, y + ha), (b, y + hb), (b, y - hb)], fill=_shade(color, factor))


def draw_down_arrow(draw: ImageDraw.ImageDraw, x: float, y0: float, y1: float) -> None:
    if y1 < y0 + 22:
        y1 = y0 + 22
    head_h = 22
    shaft = y1 - head_h
    _paint_span(draw, (x - 14, y0, x + 14, shaft), "v", 0.38)
    _paint_down_head(draw, x, shaft - 2, y1 + 4, 28, 0.38)
    _paint_span(draw, (x - 8, y0, x + 8, shaft), "v", 1.0)
    _paint_down_head(draw, x, shaft - 1, y1, 18, 1.0)


def draw_stem(draw: ImageDraw.ImageDraw, x: float, y0: float, y1: float) -> None:
    top, bot = sorted((y0, y1))
    _paint_span(draw, (x - 12, top, x + 12, bot), "v", 0.38)
    _paint_span(draw, (x - 7, top, x + 7, bot), "v", 1.0)


def draw_bar(draw: ImageDraw.ImageDraw, x0: float, x1: float, y: float) -> None:
    left, right = sorted((x0, x1))
    _paint_span(draw, (left, y - 12, right, y + 12), "h", 0.38)
    _paint_span(draw, (left, y - 7, right, y + 7), "h", 1.0)


def draw_right_arrow(draw: ImageDraw.ImageDraw, x0: float, x1: float, y: float) -> None:
    if x1 < x0 + 22:
        x1 = x0 + 22
    head = x1 - 20
    _paint_span(draw, (x0, y - 12, head, y + 12), "h", 0.38)
    _paint_right_head(draw, head - 2, x1 + 4, y, 24, 0.38)
    _paint_span(draw, (x0, y - 7, head, y + 7), "h", 1.0)
    _paint_right_head(draw, head - 1, x1, y, 16, 1.0)


def draw_left_arrow(draw: ImageDraw.ImageDraw, x0: float, x1: float, y: float) -> None:
    """Head at the smaller x."""
    left, right = (x1, x0) if x1 < x0 else (x0, x1)
    head = left + 20
    _paint_span(draw, (head, y - 12, right, y + 12), "h", 0.38)
    _paint_left_head(draw, left - 4, head + 2, y, 24, 0.38)
    _paint_span(draw, (head, y - 7, right, y + 7), "h", 1.0)
    _paint_left_head(draw, left, head + 1, y, 16, 1.0)


def center_bottom(rect: tuple[int, int, int, int]) -> tuple[float, float]:
    return (rect[0] + rect[2]) / 2, rect[3]


def center_top(rect: tuple[int, int, int, int]) -> tuple[float, float]:
    return (rect[0] + rect[2]) / 2, rect[1]


def draw_flow_arrows(draw: ImageDraw.ImageDraw, flow: dict, bands: list[dict], font: ImageFont.FreeTypeFont) -> None:
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
    for (src, dst, _label) in horizontal:
        y = (src["rect"][1] + src["rect"][3]) / 2
        draw_right_arrow(draw, src["rect"][2] + 4, dst["rect"][0] - 4, y)
    for key, pairs in groups.items():
        _draw_group(draw, pairs, font, key[4])
    for back in backs:
        _draw_back(draw, back, font)


def _draw_group(draw: ImageDraw.ImageDraw, pairs: list, font: ImageFont.FreeTypeFont, label: str) -> None:
    sources = []
    targets = []
    for src, dst in pairs:
        if src not in sources:
            sources.append(src)
        if dst not in targets:
            targets.append(dst)
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
            if abs(x0 - x1) < 20:
                draw_down_arrow(draw, x0, y0 + 4, y1 - 4)
            else:
                mid = (y0 + y1) / 2
                draw_stem(draw, x0, y0 + 4, mid)
                draw_bar(draw, x0, x1, mid)
                draw_down_arrow(draw, x1, mid, y1 - 4)
        return
    bottoms = [center_bottom(card["rect"]) for card in sources]
    tops = [center_top(card["rect"]) for card in targets]
    bus = (max(y for _x, y in bottoms) + min(y for _x, y in tops)) / 2
    if len(targets) == 1 and len(sources) >= 1:
        for x, y in bottoms:
            draw_stem(draw, x, y + 4, bus)
        if len(sources) > 1:
            draw_bar(draw, min(x for x, _y in bottoms), max(x for x, _y in bottoms), bus)
        tx, ty = tops[0]
        draw_down_arrow(draw, tx, bus, ty - 4)
    elif len(sources) == 1:
        sx, sy = bottoms[0]
        draw_stem(draw, sx, sy + 4, bus)
        draw_bar(draw, min(sx, min(x for x, _y in tops)), max(sx, max(x for x, _y in tops)), bus)
        for x, y in tops:
            draw_down_arrow(draw, x, bus, y - 4)
    else:
        for x, y in bottoms:
            draw_stem(draw, x, y + 4, bus - 10)
        draw_bar(draw, min(x for x, _y in bottoms), max(x for x, _y in bottoms), bus - 10)
        mid_x = sum(x for x, _y in bottoms) / len(bottoms)
        draw_stem(draw, mid_x, bus - 10, bus + 10)
        draw_bar(draw, min(x for x, _y in tops), max(x for x, _y in tops), bus + 10)
        for x, y in tops:
            draw_down_arrow(draw, x, bus + 10, y - 4)
    if label:
        paint_text(draw, (bottoms[0][0] + 16, bus - 18), label, font, INK, BARLOW_SEMI)


def _draw_back(draw: ImageDraw.ImageDraw, back: dict, font: ImageFont.FreeTypeFont) -> None:
    src, dst = back["src"]["rect"], back["dst"]["rect"]
    rail = min(WELL_R - 18, max(src[2], dst[2]) + 28)
    sy = (src[1] + src[3]) / 2
    ty = (dst[1] + dst[3]) / 2
    draw_stem(draw, rail, ty, sy)
    draw_bar(draw, src[2], rail, sy)
    draw_left_arrow(draw, rail, dst[2] + 2, ty)
    label = back["label"]
    if label:
        paint_text(
            draw,
            (rail - run_width(label, font) - 8, (sy + ty) / 2 - 18),
            label,
            font,
            INK,
            BARLOW_SEMI,
        )


def draw_glyph(draw: ImageDraw.ImageDraw, kind: str, box: tuple[int, int, int, int], color: tuple[int, int, int]) -> None:
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if kind == "doc":
        draw.rounded_rectangle((x0 + 4, y0 + 2, x1 - 4, y1 - 2), 3, outline=color, width=2)
        draw.line((x0 + 8, cy - 3, x1 - 8, cy - 3), fill=color, width=2)
        draw.line((x0 + 8, cy + 3, x1 - 9, cy + 3), fill=color, width=2)
    elif kind == "user":
        draw.ellipse((cx - 5, y0 + 3, cx + 5, y0 + 13), outline=color, width=2)
        draw.arc((x0 + 4, cy, x1 - 4, y1 + 6), 200, 340, fill=color, width=2)
    elif kind == "bars":
        for i, h in enumerate((8, 14, 11)):
            left = x0 + 5 + i * 8
            draw.rectangle((left, y1 - 4 - h, left + 5, y1 - 4), fill=color)
    elif kind == "eye":
        draw.ellipse((x0 + 3, cy - 6, x1 - 3, cy + 6), outline=color, width=2)
        draw.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=color)
    elif kind == "branch":
        draw.line((x0 + 6, y1 - 5, cx, y0 + 5), fill=color, width=2)
        draw.line((cx, y0 + 5, x1 - 6, cy), fill=color, width=2)
        draw.line((cx, y0 + 5, x1 - 6, y1 - 5), fill=color, width=2)
    elif kind == "stack":
        for i in range(3):
            top = y0 + 3 + i * 8
            draw.rounded_rectangle((x0 + 3, top, x1 - 3, top + 5), 2, outline=color, width=2)
    elif kind == "hex":
        pts = []
        for i in range(6):
            angle = math.radians(60 * i - 30)
            pts.append((cx + 11 * math.cos(angle), cy + 11 * math.sin(angle)))
        draw.polygon(pts, outline=color)
    elif kind == "diamond":
        draw.polygon([(cx, y0 + 3), (x1 - 4, cy), (cx, y1 - 3), (x0 + 4, cy)], outline=color)
    elif kind == "ring":
        draw.ellipse((x0 + 4, y0 + 4, x1 - 4, y1 - 4), outline=color, width=3)
    else:
        draw.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=color)


def draw_cards(draw: ImageDraw.ImageDraw, flow: dict, bands: list[dict]) -> None:
    label_font = font_at(BARLOW, 18)
    for band in bands:
        rect = band["rect"]
        if band["name"]:
            paint_text(draw, (rect[0] + 18, rect[1] + 2), band["name"].upper(), label_font, CYAN, BARLOW)
        for row in band["rows"]:
            for card in row:
                lines = flow["layers"][card["layer"]]["nodes"][card["index"]]["lines"]
                _draw_card(draw, lines, card["rect"], card["number"])


def _draw_card(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    rect: tuple[int, int, int, int],
    number: str,
) -> None:
    x0, y0, x1, y1 = rect
    draw.rounded_rectangle((x0 - 3, y0 - 3, x1 + 3, y1 + 3), radius=16, outline=CYAN_DIM, width=4)
    draw.rounded_rectangle(rect, radius=14, outline=CYAN, width=2)
    metrics = card_metrics(lines, x1 - x0, bool(number))
    title_lines = metrics["title_lines"]
    title_font = metrics["title_font"]
    body = metrics["body"]
    wrapped = metrics["wrapped"]
    cursor_x = x0 + 18
    if number:
        tile = (cursor_x, y0 + 16, cursor_x + 36, y0 + 52)
        draw.rounded_rectangle(tile, 6, outline=CYAN, width=2)
        num_font = fit_width(BARLOW, number, 28, 22, 14)
        nb = num_font.getbbox(number)
        paint_text(
            draw,
            (tile[0] + (36 - (nb[2] - nb[0])) / 2, tile[1] + (36 - (nb[3] - nb[1])) / 2 - nb[1]),
            number,
            num_font,
            CYAN,
            BARLOW,
        )
        cursor_x += 46
    icon = (cursor_x, y0 + 16, cursor_x + 26, y0 + 42)
    draw_glyph(draw, icon_kind(lines[0] if lines else ""), icon, CYAN)
    cursor_x += 36
    y = y0 + 16
    drawn: list[str] = []
    for line in title_lines:
        paint_text(draw, (cursor_x, y), line, title_font, INK, BARLOW)
        drawn.extend(line.split())
        y += metrics["line_h"]
    y = y0 + 16 + metrics["title_h"] + 8
    for line in wrapped:
        if y + body.size > y1 - 6:
            raise RuntimeError(f"card clipped text: {line}")
        paint_text(draw, (cursor_x, y), line, body, MUTED, BARLOW_SEMI)
        drawn.extend(line.split())
        y += body.size + 7
    if [word.casefold() for word in drawn] != [word.casefold() for word in " ".join(lines).split()]:
        raise RuntimeError(f"card dropped words from {lines[0] if lines else ''}")


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


def quantize_plate(rgb: Image.Image) -> Image.Image:
    """256 colors, with the cyan and the six rainbow inks kept intact."""
    pins: list[tuple[int, int, int]] = [CYAN, CYAN_DIM, INK, MUTED, SHADOW, *RAINBOW]
    pins.extend(_shade(color, 0.38) for color in RAINBOW)
    unique: list[tuple[int, int, int]] = []
    for color in pins:
        if color not in unique:
            unique.append(color)
    arr = np.asarray(rgb.convert("RGB"))
    sample = arr.copy()
    protected = np.zeros(arr.shape[:2], dtype=bool)
    for color in unique:
        delta = np.abs(arr.astype(np.int16) - np.array(color, dtype=np.int16)).sum(axis=2)
        protected |= delta <= 6
    sample[protected] = (46, 48, 50)
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


def render(md_path: Path, out_path: Path) -> None:
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
    RAINBOW_ARROWS = resolve_accent(title) == "rainbow"
    title_font = fit_width(BLACKOPS, title, W - 64 - 280, 54, 22)
    tb = title_font.getbbox(title or " ")
    sub_font = None
    sb = (0, 0, 0, 0)
    sub_gap = 0
    if subtitle:
        sub_font = fit_width(BARLOW_SEMI, subtitle, W - 64 - 280, 22, 14)
        sb = sub_font.getbbox(subtitle)
        sub_gap = 18
    top_pad = 16
    title_ink = tb[3] - tb[1]
    text_bottom = top_pad + title_ink + (sub_gap + sb[3] if subtitle else 0)
    groove_h = 12
    groove_gap = 14
    name_top = 56
    name_h = max(124, int(text_bottom + 16 + groove_gap + groove_h))
    name = (64, name_top, W - 64, name_top + name_h)
    height, bands, _placed = layout(flow, boxes, name[3])
    bind_canvas(W, height)

    arr = metal_kit.metal(height, W, 41, (36, 38, 40), 0.12, pits=0.0)
    arr, _tray = outer_frame(arr, inset=6, band=22, radius=24, bolts=True)
    arr, _name_m = raised_plaque(arr, name, 7, tone=(58, 60, 64), radius=12, rivet_r=0)
    groove = (name[0] + 24, name[3] - groove_gap - groove_h, name[2] - 24, name[3] - groove_gap)
    groove_mask = _RECT(groove, 2, (W, height))
    arr = glow(arr, groove_mask, CYAN, 5, 0.7)
    arr = paint(arr, groove_mask, CYAN, 0.9)
    for band in bands:
        for row in band["rows"]:
            for card in row:
                rect = card["rect"]
                arr, _cm = raised_plaque(
                    arr, rect, 200 + card["layer"] * 20 + card["index"],
                    tone=(64, 68, 74), radius=14, rivet_r=0,
                    shadow=(4, 5, 6, 0.55), bevel=(2, 1.2, 0.45, 0.55),
                )
    foot = (72, height - 92, W - 72, height - 36)
    arr, _fm = recessed_tray(arr, foot, radius=12, depth=4, soft=2.2, floor_tone=(24, 30, 34), seed=9)
    img = to_img(arr).convert("RGBA")
    logo = draw_0xray_logo(188, bg="transparent")
    img.alpha_composite(logo, (name[0] + 18, name[1] + 16))
    draw = ImageDraw.Draw(img)
    tx = name[0] + 220
    ty = name[1] + top_pad - tb[1]
    paint_text(draw, (tx + 2, ty + 2), title, title_font, SHADOW, BLACKOPS)
    paint_text(draw, (tx, ty), title, title_font, INK, BLACKOPS)
    if subtitle and sub_font is not None:
        paint_text(draw, (tx, ty + tb[3] + sub_gap), subtitle, sub_font, CYAN, BARLOW_SEMI)
    if RAINBOW_ARROWS:
        span = groove[2] - groove[0]
        for i, color in enumerate(RAINBOW):
            seg = (groove[0] + span * i / 6, groove[1], groove[0] + span * (i + 1) / 6, groove[3])
            draw.rectangle(seg, fill=color)
    label_font = font_at(BARLOW_SEMI, 16)
    draw_flow_arrows(draw, flow, bands, label_font)
    draw_cards(draw, flow, bands)
    if flow["notes"]:
        note_font = font_at(BARLOW_SEMI, 18)
        ny = bands[-1]["rect"][3] + 16
        for note in flow["notes"]:
            for line in wrap_lines(note, note_font, WELL_R - WELL_L - 36):
                paint_text(draw, (WELL_L + 12, ny), line, note_font, MUTED, BARLOW_SEMI)
                ny += 24
    badge_font = fit_width(BARLOW, stamp, foot[2] - foot[0] - 48, 28, 16)
    bb = badge_font.getbbox(stamp or " ")
    bw = bb[2] - bb[0]
    by = foot[1] + (foot[3] - foot[1] - (bb[3] - bb[1])) / 2 - bb[1]
    paint_text(draw, (foot[0] + (foot[2] - foot[0] - bw) / 2, by), stamp, badge_font, CYAN, BARLOW)
    draw.rounded_rectangle((40, 40, W - 40, height - 40), radius=18, outline=CYAN_DIM, width=5)
    draw.rounded_rectangle((44, 44, W - 44, height - 44), radius=16, outline=CYAN, width=2)

    rgb = img.convert("RGB")
    if rgb.size != (W, height):
        raise RuntimeError("canvas was resized after type")
    quant = quantize_plate(rgb)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    quant.save(out_path, optimize=True)
    subprocess.run(["optipng", "-o1", "-quiet", str(out_path)], check=True)
    blob = json.dumps(flow, ensure_ascii=False, separators=(",", ":"))
    write_itxt(out_path, blob)
    if read_itxt(out_path) != blob:
        raise RuntimeError(f"embedded flow drifted for {md_path.name}")
    print(f"{md_path.stem} {W}x{height} {out_path.stat().st_size}", flush=True)


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
