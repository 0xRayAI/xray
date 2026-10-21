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
W = 1280
WELL_L, WELL_R = 52, 1228
TEXT_KEY = "xray-plate-flow"
CYAN = (90, 214, 222)
CYAN_DIM = (28, 92, 102)
AMBER = (232, 168, 56)
GREEN = (78, 196, 128)
INK = (244, 246, 244)
MUTED = (198, 204, 208)
SHADOW = (12, 14, 16)
_POLY = metal_kit.poly_mask


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


def accent_for(name: str, index: int) -> tuple[int, int, int]:
    upper = name.upper()
    if "INPUT" in upper:
        return CYAN
    if "PROCESSING" in upper or "PROCESS" in upper:
        return AMBER
    if "OUTPUT" in upper:
        return GREEN
    cycle = (CYAN, AMBER, GREEN, (150, 170, 210))
    return cycle[index % len(cycle)]


def mix(base: tuple[int, int, int], tint: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    return tuple(int(base[i] * (1 - amount) + tint[i] * amount) for i in range(3))


def font_at(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def fit_width(path: str, text: str, max_w: float, start: int, floor: int) -> ImageFont.FreeTypeFont:
    size = start
    while size > floor:
        font = font_at(path, size)
        if float(font.getlength(text)) <= max_w:
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
        if float(font.getlength(trial)) <= max_w or not cur:
            cur = trial
            continue
        lines.append(cur)
        cur = word
    if cur:
        lines.append(cur)
    return lines


def body_font_for(details: list[str], max_w: float) -> ImageFont.FreeTypeFont:
    size = 18
    while size > 12:
        font = font_at(SANS, size)
        if all(float(font.getlength(word)) <= max_w for line in details for word in line.split(" ")):
            return font
        size -= 1
    return font_at(SANS, 12)


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
    gutter = 16 + (48 if numbered else 0) + 36 + 14
    return max(40, width - gutter)


def measure_card(lines: list[str], width: int, numbered: bool) -> int:
    inner = content_width(width, numbered)
    title = lines[0].upper() if lines else ""
    details = lines[1:]
    title_font = fit_width(BARLOW, title, inner, 28, 13)
    body = body_font_for(details, inner)
    wrapped: list[str] = []
    for detail in details:
        wrapped.extend(wrap_lines(detail, body, inner))
    title_h = max(32, title_font.size + 8)
    return max(108, 14 + title_h + 8 + len(wrapped) * (body.size + 6) + 20)


def layout(flow: dict, boxes: list[list[Box]]) -> tuple[int, list[dict], list[dict]]:
    """Place every card. Height grows with the text. Nothing is dropped."""
    inner = WELL_R - WELL_L - 36
    y = 188
    placed: list[dict] = []
    bands: list[dict] = []
    for li, layer in enumerate(flow["layers"]):
        rows = row_groups(boxes[li])
        numbered = "PROCESSING" in layer["name"].upper()
        multi = max(len(row) for row in rows)
        horizontal = _row_has_horizontal(flow, li, rows)
        band_top = y
        cursor = y + 16
        if layer["name"]:
            cursor += 30
        row_places: list[list[dict]] = []
        for ri, row in enumerate(rows):
            gap = 54 if horizontal and len(row) > 1 else 18
            if len(row) == 1 and multi == 1 and not layer["name"]:
                width = min(840, inner)
                offset = (inner - width) // 2
                widths = [width]
            elif len(row) == 1 and multi > 1:
                width = card_width(inner, multi, 18)
                offset = (inner - width) // 2
                widths = [width]
            else:
                offset = 0
                widths = [card_width(inner, len(row), gap)] * len(row)
            heights = [
                measure_card(flow["layers"][li]["nodes"][ni]["lines"], widths[i], numbered)
                for i, (ni, _box) in enumerate(row)
            ]
            row_h = max(heights)
            x = WELL_L + 18 + offset
            cards = []
            for i, (ni, _box) in enumerate(row):
                rect = (x, cursor, x + widths[i], cursor + row_h)
                cards.append({"layer": li, "index": ni, "row": ri, "rect": rect})
                x += widths[i] + gap
            row_places.append(cards)
            cursor += row_h
            if ri < len(rows) - 1:
                cursor += 58
        cursor += 16
        bands.append({
            "rect": (WELL_L, band_top, WELL_R, cursor),
            "name": layer["name"],
            "accent": accent_for(layer["name"], li),
            "rows": row_places,
        })
        placed.extend(card for row in row_places for card in row)
        y = cursor + (62 if li < len(flow["layers"]) - 1 else 0)
    note_h = 0
    if flow["notes"]:
        note_font = font_at(SANS, 16)
        for note in flow["notes"]:
            note_h += 22 * max(1, len(wrap_lines(note, note_font, inner)))
        note_h += 16
    foot_top = y + 12 + note_h
    height = foot_top + 78 + 36
    return height, bands, placed


def _row_has_horizontal(flow: dict, layer: int, rows: list[list[tuple[int, Box]]]) -> bool:
    members = {ni for row in rows for ni, _box in row}
    for edge in flow["edges"]:
        src, dst = edge["from"], edge["to"]
        if src[0] == layer and dst[0] == layer and src[1] in members and dst[1] in members:
            same = any(src[1] in {ni for ni, _b in row} and dst[1] in {ni for ni, _b in row} for row in rows)
            if same and dst[1] == src[1] + 1:
                return True
    return False


def draw_down_arrow(draw: ImageDraw.ImageDraw, x: float, y0: float, y1: float) -> None:
    if y1 < y0 + 16:
        y1 = y0 + 16
    head_h = 16
    shaft = y1 - head_h
    draw.rectangle((x - 9, y0, x + 9, shaft), fill=CYAN_DIM)
    draw.polygon([(x - 20, shaft), (x + 20, shaft), (x, y1 + 2)], fill=CYAN_DIM)
    draw.rectangle((x - 5, y0, x + 5, shaft), fill=CYAN)
    draw.polygon([(x - 13, shaft - 1), (x + 13, shaft - 1), (x, y1)], fill=CYAN)


def draw_stem(draw: ImageDraw.ImageDraw, x: float, y0: float, y1: float) -> None:
    top, bot = sorted((y0, y1))
    draw.rectangle((x - 7, top, x + 7, bot), fill=CYAN_DIM)
    draw.rectangle((x - 4, top, x + 4, bot), fill=CYAN)


def draw_bar(draw: ImageDraw.ImageDraw, x0: float, x1: float, y: float) -> None:
    left, right = sorted((x0, x1))
    draw.rectangle((left, y - 7, right, y + 7), fill=CYAN_DIM)
    draw.rectangle((left, y - 4, right, y + 4), fill=CYAN)


def draw_right_arrow(draw: ImageDraw.ImageDraw, x0: float, x1: float, y: float) -> None:
    if x1 < x0 + 16:
        x1 = x0 + 16
    head = x1 - 14
    draw.rectangle((x0, y - 7, head, y + 7), fill=CYAN_DIM)
    draw.polygon([(head, y - 16), (head, y + 16), (x1 + 2, y)], fill=CYAN_DIM)
    draw.rectangle((x0, y - 4, head, y + 4), fill=CYAN)
    draw.polygon([(head - 1, y - 11), (head - 1, y + 11), (x1, y)], fill=CYAN)


def draw_left_arrow(draw: ImageDraw.ImageDraw, x0: float, x1: float, y: float) -> None:
    """Head at the smaller x."""
    left, right = (x1, x0) if x1 < x0 else (x0, x1)
    head = left + 14
    draw.rectangle((head, y - 7, right, y + 7), fill=CYAN_DIM)
    draw.polygon([(head, y - 16), (head, y + 16), (left - 2, y)], fill=CYAN_DIM)
    draw.rectangle((head, y - 4, right, y + 4), fill=CYAN)
    draw.polygon([(head + 1, y - 11), (head + 1, y + 11), (left, y)], fill=CYAN)


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
        draw.text((bottoms[0][0] + 16, bus - 18), label, font=font, fill=INK)


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
        draw.text((rail - float(font.getlength(label)) - 8, (sy + ty) / 2 - 18), label, font=font, fill=INK)


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
    label_font = font_at(BARLOW, 22)
    for band in bands:
        accent = band["accent"]
        rect = band["rect"]
        draw.rounded_rectangle(rect, radius=16, outline=accent, width=2)
        if band["name"]:
            draw.text((rect[0] + 18, rect[1] + 8), band["name"].upper(), font=label_font, fill=accent)
        numbered = "PROCESSING" in band["name"].upper()
        step = 1
        for row in band["rows"]:
            for card in row:
                lines = flow["layers"][card["layer"]]["nodes"][card["index"]]["lines"]
                _draw_card(draw, lines, card["rect"], accent, f"{step:02d}" if numbered else "")
                if numbered:
                    step += 1


def _draw_card(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    rect: tuple[int, int, int, int],
    accent: tuple[int, int, int],
    number: str,
) -> None:
    x0, y0, x1, y1 = rect
    draw.rectangle((x0, y0, x0 + 6, y1), fill=accent)
    title = lines[0].upper() if lines else ""
    details = lines[1:]
    cursor_x = x0 + 16
    if number:
        tile = (cursor_x, y0 + 14, cursor_x + 40, y0 + 40)
        draw.rounded_rectangle(tile, 6, fill=accent)
        num_font = fit_width(BARLOW, number, 32, 20, 14)
        nb = num_font.getbbox(number)
        draw.text(
            (tile[0] + (40 - (nb[2] - nb[0])) / 2, tile[1] + (26 - (nb[3] - nb[1])) / 2 - nb[1]),
            number,
            font=num_font,
            fill=(16, 18, 20),
        )
        cursor_x += 48
    icon = (cursor_x, y0 + 14, cursor_x + 28, y0 + 42)
    draw_glyph(draw, icon_kind(lines[0] if lines else ""), icon, accent)
    cursor_x += 36
    inner_w = content_width(x1 - x0, bool(number))
    title_font = fit_width(BARLOW, title, inner_w, 28, 13)
    title_h = max(32, title_font.size + 8)
    draw.text((cursor_x, y0 + 14), title, font=title_font, fill=INK)
    body = body_font_for(details, inner_w)
    y = y0 + 14 + title_h + 8
    drawn = title.split()
    for detail in details:
        for line in wrap_lines(detail, body, inner_w):
            if y + body.size > y1 - 6:
                raise RuntimeError(f"card clipped text: {detail}")
            draw.text((cursor_x, y), line, font=body, fill=MUTED)
            drawn.extend(line.split())
            y += body.size + 6
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
    meta = frontmatter(text)
    title = meta.get("title", md_path.stem).upper()
    version, suffix = footer_parts(footer_line(text))
    badge = f"STAMPED {version}".strip()
    height, bands, _placed = layout(flow, boxes)
    bind_canvas(W, height)

    arr = metal_kit.metal(height, W, 41, (54, 54, 55), 0.16, pits=0.0)
    arr, _tray = outer_frame(arr, inset=6, band=22, radius=24, bolts=True)
    name = (64, 58, W - 64, 166)
    arr, _name_m = raised_plaque(arr, name, 7, tone=(66, 68, 71), radius=10, rivet_r=0)
    groove = (name[0] + 220, name[3] - 16, name[2] - 28, name[3] - 10)
    groove_mask = _RECT(groove, 2, (W, height))
    arr = glow(arr, groove_mask, CYAN, 6, 0.85)
    arr = paint(arr, groove_mask, CYAN, 0.95)
    for band in bands:
        tone = mix((30, 32, 36), band["accent"], 0.16)
        arr, _m = recessed_tray(arr, band["rect"], radius=16, depth=4, soft=2.2, floor_tone=tone, seed=80)
        for row in band["rows"]:
            for card in row:
                rect = card["rect"]
                rad = max(4, min(10, (rect[2] - rect[0]) // 8, (rect[3] - rect[1]) // 8))
                arr, _cm = raised_plaque(
                    arr, rect, 200 + card["layer"] * 20 + card["index"],
                    tone=(72, 74, 78), radius=rad, rivet_r=0,
                    shadow=(3, 4, 5, 0.6), bevel=(2, 1.2, 0.5, 0.62),
                )
    foot = (64, height - 96, W - 64, height - 32)
    arr, _fm = raised_plaque(arr, foot, 9, tone=(48, 54, 58), radius=10, rivet_r=0,
                             shadow=(3, 4, 5, 0.55), bevel=(2, 1.2, 0.5, 0.6))
    img = to_img(arr).convert("RGBA")
    logo = draw_0xray_logo(200, bg="transparent")
    img.alpha_composite(logo, (name[0] + 16, name[1] + (108 - logo.size[1]) // 2))
    draw = ImageDraw.Draw(img)
    title_font = fit_width(BLACKOPS, title, name[2] - name[0] - 430, 52, 18)
    tb = title_font.getbbox(title)
    tx, ty = name[0] + 230, name[1] + 18 - tb[1]
    draw.text((tx + 1, ty + 1), title, font=title_font, fill=SHADOW)
    draw.text((tx, ty), title, font=title_font, fill=INK)
    plate_font = font_at(BARLOW, 22)
    draw.text((tx + float(title_font.getlength(title)) + 14, ty + 18), "PLATE", font=plate_font, fill=CYAN)
    if resolve_accent(title) == "rainbow":
        colors = ((235, 52, 52), (245, 140, 30), (245, 220, 40), (60, 200, 90), (50, 140, 245), (150, 70, 230))
        span = groove[2] - groove[0]
        for i, color in enumerate(colors):
            seg = (groove[0] + span * i / 6, groove[1], groove[0] + span * (i + 1) / 6, groove[3])
            draw.rectangle(seg, fill=color)
    label_font = font_at(SANS, 15)
    draw_flow_arrows(draw, flow, bands, label_font)
    draw_cards(draw, flow, bands)
    if flow["notes"]:
        note_font = font_at(SANS, 16)
        ny = bands[-1]["rect"][3] + 18
        for note in flow["notes"]:
            for line in wrap_lines(note, note_font, WELL_R - WELL_L - 36):
                draw.text((WELL_L + 12, ny), line, font=note_font, fill=MUTED)
                ny += 22
    badge_font = fit_width(BARLOW, badge, 420, 32, 18)
    bb = badge_font.getbbox(badge)
    by = foot[1] + (foot[3] - foot[1] - (bb[3] - bb[1])) / 2 - bb[1]
    draw.text((foot[0] + 28, by), badge, font=badge_font, fill=CYAN)
    if suffix:
        suf_font = font_at(SANS, 16)
        draw.text((foot[0] + 40 + float(badge_font.getlength(badge)), by + 8), suffix, font=suf_font, fill=MUTED)

    rgb = img.convert("RGB")
    if rgb.size != (W, height):
        raise RuntimeError("canvas was resized after type")
    quant = rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
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
