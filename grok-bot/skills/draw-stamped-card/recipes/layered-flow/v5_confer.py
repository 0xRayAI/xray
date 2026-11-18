"""Public square for the v5 debate.

Assembled from the plate kit. The logo is drawn, not pasted.
This picture is not a fence plate.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import render  # noqa: E402

from render import (  # noqa: E402
    BARLOW,
    BARLOW_SEMI,
    BLACKOPS,
    CYAN,
    INK,
    MUTED,
    SHADOW,
    draw_0xray_logo,
    draw_bar,
    draw_down_arrow,
    draw_left_arrow,
    draw_stem,
    font_at,
    paint_text,
    part_size,
    place_junction,
    place_part,
    quantize_plate,
    run_width,
    wrap_lines,
)

SIDE = 1600
OUT = HERE.parents[4] / "docs-site/static/plates/x/v5-confer.png"
BANNED = ("flow", "#5", "issue", "510", "523", "499")


def _ban(text: str) -> None:
    low = text.casefold()
    for word in BANNED:
        if word in low:
            raise RuntimeError(f"public copy includes {word!r}")


def _text(img, xy, text, font, fill, path) -> None:
    _ban(text)
    paint_text(img, xy, text, font, fill, path)


def _wrap(text: str, path: str, size: int, max_w: float) -> tuple[object, list[str]]:
    font = font_at(path, size)
    lines = wrap_lines(text, font, max_w) if text else []
    for line in lines:
        if run_width(line, font) > max_w + 0.5:
            raise RuntimeError(f"line wider than its card: {line}")
    return font, lines


def _rivets(img) -> None:
    rivet = part_size("rivet", "diameter")
    inset = part_size("rivet", "inset")
    for rx, ry in (
        (inset, inset),
        (SIDE - inset - rivet, inset),
        (inset, SIDE - inset - rivet),
        (SIDE - inset - rivet, SIDE - inset - rivet),
        ((SIDE - rivet) / 2, inset),
        ((SIDE - rivet) / 2, SIDE - inset - rivet),
        (inset, (SIDE - rivet) / 2),
        (SIDE - inset - rivet, (SIDE - rivet) / 2),
    ):
        place_part(img, "rivet", (rx, ry, rx + rivet, ry + rivet), "rivet")


def _header(img) -> int:
    side = part_size("header", "side")
    top = 44
    height = 156
    rect = (int(side), int(top), SIDE - int(side), int(top + height))
    place_part(img, "header", rect, "metalRaised")
    logo = draw_0xray_logo(200, bg="transparent")
    slot = (
        rect[0] + 18,
        rect[1] + (height - logo.height) / 2,
        rect[0] + 18 + logo.width,
        rect[1] + (height - logo.height) / 2 + logo.height,
    )
    place_part(img, "logoSlot", slot, "shadow")
    img.alpha_composite(logo, (int(slot[0]), int(slot[1])))
    title = "V5"
    title_font = font_at(BLACKOPS, 84)
    tb = title_font.getbbox(title)
    tx = slot[2] + 28
    ty = rect[1] + 22 - tb[1]
    _text(img, (tx + 2, ty + 2), title, title_font, SHADOW, BLACKOPS)
    _text(img, (tx, ty), title, title_font, INK, BLACKOPS)
    sub_font = font_at(BARLOW_SEMI, 26)
    sy = ty + tb[3] + 6
    _text(img, (tx, sy), "the debate", sub_font, CYAN, BARLOW_SEMI)
    rail_h = part_size("accentRail", "height")
    inset = part_size("accentRail", "inset")
    groove = (rect[0] + inset, rect[3] - 14 - rail_h, rect[2] - inset, rect[3] - 14)
    if sy + sub_font.getbbox("the debate")[3] > groove[1] - 8:
        raise RuntimeError("header subtitle meets the accent rail")
    place_part(img, "accentRail", groove, "cyan")
    return rect[3]


def _card(img, rect, icon: str, title: str, body: list[str], title_size: int = 28, body_size: int = 20) -> None:
    x0, y0, x1, y1 = rect
    place_part(img, "card", rect, "cyan")
    pad_x = 18
    pad_y = 16
    cursor = x0 + pad_x
    if icon:
        side = 26
        place_part(img, "icon", (cursor, y0 + pad_y, cursor + side, y0 + pad_y + side), "cyan", kind=icon)
        cursor += 40
    max_w = x1 - cursor - 16
    title_font, title_lines = _wrap(title, BARLOW, title_size, max_w)
    body_font = font_at(BARLOW_SEMI, body_size)
    wrapped: list[str] = []
    for line in body:
        wrapped.extend(wrap_lines(line, body_font, max_w))
    for line in wrapped:
        if run_width(line, body_font) > max_w + 0.5:
            raise RuntimeError(f"body wider than its card: {line}")
    y = y0 + pad_y
    for line in title_lines:
        if y + title_font.size > y1 - 12:
            raise RuntimeError(f"title clipped: {line}")
        _text(img, (cursor, y), line, title_font, INK, BARLOW)
        y += title_font.size + 2
    y += 6
    for line in wrapped:
        if y + body_font.size > y1 - 12:
            raise RuntimeError(f"body clipped: {line}")
        _text(img, (cursor, y), line, body_font, MUTED, BARLOW_SEMI)
        y += body_font.size + 5


def _hero(img, rect, icon: str, kicker: str, title: str) -> None:
    x0, y0, x1, y1 = rect
    place_part(img, "card", rect, "cyan")
    pad_x = 18
    max_w = x1 - x0 - pad_x * 2
    kick_font = font_at(BARLOW_SEMI, 16)
    title_font, title_lines = _wrap(title, BARLOW, 32, max_w - 40)
    block = kick_font.size + 8 + len(title_lines) * (title_font.size + 2)
    y = y0 + (y1 - y0 - block) / 2
    if icon:
        side = 26
        place_part(img, "icon", (x0 + pad_x, y, x0 + pad_x + side, y + side), "cyan", kind=icon)
    _text(img, (x0 + pad_x + 40, y), kicker, kick_font, CYAN, BARLOW_SEMI)
    y += kick_font.size + 8
    for line in title_lines:
        _text(img, (x0 + pad_x + 40, y), line, title_font, INK, BARLOW)
        y += title_font.size + 2
    if y > y1 - 10:
        raise RuntimeError(f"hero clipped: {title}")


def _chip(img, rect) -> None:
    place_part(img, "card", rect, "cyan")
    side = 26
    x = rect[0] + (rect[2] - rect[0] - side) / 2
    y = rect[1] + (rect[3] - rect[1] - side) / 2
    place_part(img, "icon", (x, y, x + side, y + side), "cyan", kind="mark")


def _label(img, xy, text, size=20) -> None:
    _text(img, xy, text, font_at(BARLOW, size), CYAN, BARLOW)


def _hits(a, b, pad=0) -> bool:
    return a[0] + pad < b[2] and b[0] + pad < a[2] and a[1] + pad < b[3] and b[1] + pad < a[3]


def compose() -> None:
    from PIL import Image

    img = Image.new("RGBA", (SIDE, SIDE), (0, 0, 0, 0))
    place_part(img, "frame", (0, 0, SIDE, SIDE), "metal")
    _rivets(img)
    header_bottom = _header(img)

    readers = [
        ((76, 236, 560, 404), "lens", "RESEARCH A", ["mapped the three subsystems"]),
        ((608, 236, 1092, 404), "agent", "DEEP READ", ["the Autonomous Engine"]),
        (
            (76, 420, 560, 626),
            "file",
            "GENERALISTS",
            ["1,192 files", "three subsystems confirmed", "about 40 claims do not match the code"],
        ),
        (
            (608, 420, 1092, 626),
            "board",
            "FOUR READERS",
            ["house + Bifrost", "src + runtime", "sibling repos", "docs, plates, tests"],
        ),
    ]
    if header_bottom > 220:
        raise RuntimeError("header crowds the readers")
    _label(img, (80, 208), "READERS")
    for rect, icon, title, body in readers:
        _card(img, rect, icon, title, body)

    challenge = (1116, 236, 1524, 626)
    _card(
        img,
        challenge,
        "gate",
        "RESEARCH B",
        ["challenged the module split"],
        title_size=30,
        body_size=22,
    )
    _label(img, (1132, 208), "THE CHALLENGE")

    rail_x = 584.0
    bus_y = 678.0
    joins = (320.0, 502.0)
    for y in joins:
        draw_bar(img, 560, rail_x, y)
        draw_bar(img, rail_x, 608, y)
        place_junction(img, rail_x, y)
    draw_stem(img, rail_x, joins[0], bus_y)
    place_junction(img, rail_x, bus_y)

    cores = [
        ((76, 812, 402, 1012), "memory", "INFERENCE"),
        ((422, 812, 748, 1012), "gate", "EXTERNAL GOVERNANCE"),
        ((768, 812, 1094, 1012), "route", "AUTONOMOUS ENGINE"),
    ]
    centers = [((rect[0] + rect[2]) / 2, rect[1]) for rect, _icon, _title in cores]
    draw_bar(img, centers[0][0], centers[2][0], bus_y)
    for x, top in centers:
        place_junction(img, x, bus_y)
        draw_down_arrow(img, x, bus_y, top - 6)
    _label(img, (80, 640), "FINDINGS")

    chips = [
        (76, 724, 148, 796),
        (1018, 724, 1090, 796),
        (76, 1024, 148, 1096),
        (1018, 1024, 1090, 1096),
        (1188, 812, 1260, 884),
        (1188, 940, 1260, 1012),
    ]
    for rect, icon, title in cores:
        _hero(img, rect, icon, "SUBSYSTEM", title)
    for chip in chips:
        _chip(img, chip)
    _label(img, (1132, 656), "THE SPLIT")
    cluster_x = 1288.0
    draw_stem(img, cluster_x, 848, 976)
    place_junction(img, cluster_x, 848)
    place_junction(img, cluster_x, 976)
    draw_stem(img, 1472, 700, 848)
    draw_left_arrow(img, cluster_x, 1472, 848)
    place_junction(img, 1472, 848)
    _label(img, (1320, 900), "MODULES")

    packet = (76, 1124, 1524, 1244)
    _card(img, packet, "note", "PACKET", ["folded into the v5.0.0 packet"], title_size=32, body_size=24)
    draw_down_arrow(img, centers[1][0], cores[1][0][3], packet[1] - 4)

    table = (76, 1272, 1524, 1456)
    place_part(img, "card", table, "cyan")
    _label(img, (96, 1288), "SIGN-OFF", 22)
    rule_y = 1324
    place_part(img, "rail", (96, rule_y, 1504, rule_y + 10), "cyan")
    columns = ("FORGE", "CRITIC", "ARCH1")
    icons = ("seat", "score", "mark")
    span = (table[2] - table[0]) / 3
    name_font = font_at(BARLOW, 36)
    for index, (name, icon) in enumerate(zip(columns, icons)):
        col_x = table[0] + span * index
        if index:
            place_part(img, "rail", (col_x - 6, rule_y + 16, col_x + 6, table[3] - 16), "cyan")
        side = 26
        nw = run_width(name, name_font)
        group = side + 14 + nw
        gx = col_x + (span - group) / 2
        iy = 1360
        place_part(img, "icon", (gx, iy, gx + side, iy + side), "cyan", kind=icon)
        _text(img, (gx + side + 14, iy - 4), name, name_font, INK, BARLOW)

    foot = (
        int(part_size("footer", "side")),
        SIDE - int(part_size("footer", "raise")),
        SIDE - int(part_size("footer", "side")),
        SIDE - int(part_size("footer", "bottom")),
    )
    place_part(img, "footer", foot, "floor")
    stamp = "stamped  ·  v5"
    stamp_font = font_at(BARLOW, 28)
    bb = stamp_font.getbbox(stamp)
    bw = bb[2] - bb[0]
    by = foot[1] + (foot[3] - foot[1] - (bb[3] - bb[1])) / 2 - bb[1]
    _text(img, (foot[0] + (foot[2] - foot[0] - bw) / 2, by), stamp, stamp_font, CYAN, BARLOW)

    occupied = [rect for rect, *_rest in readers] + [challenge, packet, table] + [rect for rect, *_rest in cores] + chips
    for i, rect in enumerate(occupied):
        for other in occupied[i + 1:]:
            if _hits(rect, other, 2):
                raise RuntimeError(f"parts overlap: {rect} {other}")

    rgb = img.convert("RGB")
    if rgb.size != (SIDE, SIDE):
        raise RuntimeError(f"canvas is {rgb.size}")
    quant = quantize_plate(rgb)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    quant.save(OUT, optimize=True)
    subprocess.run(["optipng", "-o1", "-quiet", str(OUT)], check=True)
    print(f"v5-confer {SIDE}x{SIDE} {OUT.stat().st_size}", flush=True)


if __name__ == "__main__":
    compose()
