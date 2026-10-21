"""Flow of an ASCII plate: layers, nodes, text, edges.

The X infographic is free to draw. This parse is the contract it has to match.
A node is a box that holds no other box. A box that holds nodes is a layer.
Side-by-side boxes with no outer box become one row-layer each.
Edges follow the wires between those nodes. Text inside a node stays in order.
Words outside every box stay as notes.
"""
from __future__ import annotations

from dataclasses import dataclass

BOX_CHARS = set("┌┐└┘├┤┬┴┼│─")
JUNCTION = set("┬┴┼")
WIRE = set("│─┌┐└┘├┤┬┴┼")
LEFT_SIDE = set("│├┼")


@dataclass(frozen=True)
class Box:
    top: int
    bot: int
    left: int
    right: int


def fence_lines(payload: str) -> list[str]:
    if payload.endswith("\n"):
        payload = payload[:-1]
    return payload.split("\n")


def find_boxes(lines: list[str]) -> list[Box]:
    found: list[Box] = []
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
                        found.append(Box(r, rr, c, k))
                        c = k
                        continue
            c += 1
    return found


def contains(outer: Box, inner: Box) -> bool:
    return (
        outer.top < inner.top
        and outer.bot > inner.bot
        and outer.left < inner.left
        and outer.right > inner.right
    )


def cell(lines: list[str], r: int, c: int) -> str:
    if r < 0 or r >= len(lines) or c < 0 or c >= len(lines[r]):
        return " "
    return lines[r][c]


def is_connector_v(line: str, index: int) -> bool:
    if index < 0 or index >= len(line) or line[index] != "v":
        return False
    prev = line[index - 1] if index else " "
    nxt = line[index + 1] if index + 1 < len(line) else " "
    return not prev.isalpha() and not nxt.isalpha()


def clean_segment(seg: str) -> str:
    chars = [" " if ch in BOX_CHARS else ch for ch in seg]
    return " ".join("".join(chars).split())


def node_text(lines: list[str], box: Box) -> list[str]:
    out: list[str] = []
    top = clean_segment(lines[box.top][box.left + 1:box.right])
    if top:
        out.append(top)
    for r in range(box.top + 1, box.bot):
        left = lines[r][box.left] if box.left < len(lines[r]) else ""
        seg = lines[r][box.left + 1:box.right]
        if left in "├┼" and all(ch in BOX_CHARS or ch == " " for ch in seg):
            continue
        text = clean_segment(seg)
        if text:
            out.append(text)
    bot = clean_segment(lines[box.bot][box.left + 1:box.right])
    if bot:
        out.append(bot)
    return out


def layer_name(lines: list[str], parent: Box, kids: list[Box]) -> str:
    for r in range(parent.top, parent.bot + 1):
        spans = [(k.left, k.right) for k in kids if k.top <= r <= k.bot]
        parts: list[str] = []
        end = min(parent.right, len(lines[r]))
        c = parent.left + 1
        while c < end:
            if any(a <= c <= b for a, b in spans):
                c += 1
                continue
            ch = lines[r][c]
            if ch in BOX_CHARS or is_connector_v(lines[r], c):
                parts.append(" ")
            else:
                parts.append(ch)
            c += 1
        text = " ".join("".join(parts).split())
        if text:
            return text
    return ""


def on_border(box: Box, r: int, c: int) -> bool:
    horizontal = (r == box.top or r == box.bot) and box.left <= c <= box.right
    vertical = (c == box.left or c == box.right) and box.top <= r <= box.bot
    return horizontal or vertical


def inside(box: Box, r: int, c: int) -> bool:
    return box.top < r < box.bot and box.left < c < box.right


def covered(boxes: list[Box], r: int, c: int) -> bool:
    return any(inside(b, r, c) or on_border(b, r, c) for b in boxes)


def walkable(lines: list[str], boxes: list[Box], leaves: list[Box], r: int, c: int) -> bool:
    ch = cell(lines, r, c)
    if any(inside(leaf, r, c) for leaf in leaves):
        return False
    if ch == "v":
        return is_connector_v(lines[r], c)
    if ch not in WIRE:
        return False
    if any(on_border(b, r, c) for b in boxes):
        return ch in JUNCTION
    return True


def leaf_below(leaves: list[Box], source: Box, r: int, c: int) -> Box | None:
    for leaf in leaves:
        if leaf is source:
            continue
        if leaf.top < source.bot:
            continue
        if on_border(leaf, r, c) and cell_is_junction(r, c, leaf):
            return leaf
    return None


def cell_is_junction(r: int, c: int, leaf: Box) -> bool:
    return on_border(leaf, r, c)


def exit_ports(lines: list[str], boxes: list[Box], leaves: list[Box], node: Box) -> list[tuple[int, int]]:
    ports: list[tuple[int, int]] = []
    for c in range(node.left, node.right + 1):
        if cell(lines, node.bot, c) in JUNCTION and walkable(lines, boxes, leaves, node.bot, c):
            ports.append((node.bot, c))
    if ports:
        return ports
    r = node.bot + 1
    for c in range(node.left + 1, node.right):
        ch = cell(lines, r, c)
        if ch in "│┼" or (ch == "v" and is_connector_v(lines[r], c)):
            if walkable(lines, boxes, leaves, r, c):
                ports.append((r, c))
    return ports


def flood(
    lines: list[str],
    boxes: list[Box],
    leaves: list[Box],
    source: Box,
    starts: list[tuple[int, int]],
) -> tuple[set[Box], set[tuple[int, int]]]:
    seen: set[tuple[int, int]] = set()
    stack = list(starts)
    touched: set[Box] = set()
    while stack:
        r, c = stack.pop()
        if (r, c) in seen:
            continue
        if not walkable(lines, boxes, leaves, r, c) and (r, c) not in starts:
            continue
        hit = None
        for leaf in leaves:
            if leaf is source or leaf.top < source.bot:
                continue
            if on_border(leaf, r, c) and cell(lines, r, c) in JUNCTION:
                hit = leaf
                break
        if hit is not None:
            touched.add(hit)
            seen.add((r, c))
            continue
        seen.add((r, c))
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            stack.append((r + dr, c + dc))
    return touched, seen


def terminals(lines: list[str], seen: set[tuple[int, int]]) -> list[tuple[int, int]]:
    arrows = [(r, c) for r, c in seen if is_connector_v(lines[r], c)]
    if arrows:
        return arrows
    if not seen:
        return []
    low = max(r for r, _c in seen)
    return [(r, c) for r, c in seen if r == low]


def has_top_junction(lines: list[str], node: Box) -> bool:
    for c in range(node.left, node.right + 1):
        if cell(lines, node.top, c) in JUNCTION:
            return True
    return False


def first_row_below(nodes: list[Box], row_after: int) -> list[Box]:
    below = [n for n in nodes if n.top > row_after]
    if not below:
        return []
    top = min(n.top for n in below)
    return [n for n in below if abs(n.top - top) <= 1]


def covers(source: Box, row: list[Box]) -> bool:
    if len(row) <= 1:
        return False
    centers = [(n.left + n.right) / 2 for n in row]
    width = source.right - source.left
    widest = max(n.right - n.left for n in row)
    return source.left <= min(centers) and source.right >= max(centers) and width > widest


def pick_targets(
    lines: list[str],
    source: Box,
    peers: list[Box],
    terms: list[tuple[int, int]],
    nodes: list[Box],
) -> list[Box]:
    if not terms:
        return []
    term_row = max(r for r, _c in terms)
    row = first_row_below(nodes, term_row)
    if not row:
        row = first_row_below(nodes, source.bot - 1)
    if not row:
        return []
    cols = sorted({c for _r, c in terms})
    if len(row) == 1:
        return row
    span = peers or [source]
    union_left = min(n.left for n in span)
    union_right = max(n.right for n in span)
    union = Box(source.top, source.bot, union_left, union_right)
    if len(cols) == 1:
        col = cols[0]
        aligned = [n for n in row if n.left < col < n.right]
        if len(aligned) == 1 and not covers(union, row):
            return aligned
        if not any(has_top_junction(lines, n) for n in row):
            return row
        return aligned or [min(row, key=lambda n: abs((n.left + n.right) / 2 - col))]
    picked: list[Box] = []
    for col in cols:
        aligned = [n for n in row if n.left <= col <= n.right]
        if aligned:
            picked.extend(aligned)
        else:
            picked.append(min(row, key=lambda n: abs((n.left + n.right) / 2 - col)))
    uniq: list[Box] = []
    for node in picked:
        if node not in uniq:
            uniq.append(node)
    return uniq


def horizontal_label_free(lines: list[str], a: Box, b: Box) -> bool:
    for r in range(max(a.top, b.top), min(a.bot, b.bot) + 1):
        seg = lines[r][a.right + 1:b.left]
        if "─" in seg or "→" in seg:
            return True
    return False


def outside_text(lines: list[str], boxes: list[Box], r: int) -> list[str]:
    line = lines[r]
    chunks: list[str] = []
    buf: list[str] = []
    gap = 0

    def flush() -> None:
        nonlocal buf
        text = " ".join("".join(buf).split())
        buf = []
        if text:
            chunks.append(text)

    for c, ch in enumerate(line):
        if covered(boxes, r, c) or ch in WIRE or ch == "<" or is_connector_v(line, c):
            gap += 1
            if gap >= 2:
                flush()
            elif buf:
                buf.append(" ")
            continue
        gap = 0
        buf.append(ch)
    flush()
    return chunks


def gap_label(lines: list[str], boxes: list[Box], top: int, bot: int) -> str:
    parts: list[str] = []
    for r in range(top + 1, bot):
        parts.extend(outside_text(lines, boxes, r))
    return " ".join(parts)


def back_edges(lines: list[str], boxes: list[Box], leaves: list[Box]) -> list[tuple[Box, Box, str]]:
    found: list[tuple[Box, Box, str]] = []
    for r, line in enumerate(lines):
        c = 0
        while c < len(line):
            if line[c] == "<":
                k = c + 1
                while k < len(line) and line[k] == "─":
                    k += 1
                if k < len(line) and line[k] == "┐" and k - c > 1:
                    rr = r + 1
                    end_c = k
                    while rr < len(lines):
                        if cell(lines, rr, end_c) == "│":
                            rr += 1
                            continue
                        if "┘" in lines[rr][max(0, end_c - 8):end_c + 1]:
                            break
                        if cell(lines, rr, end_c) == " ":
                            break
                        rr += 1
                    upper = next((n for n in leaves if n.top <= r <= n.bot), None)
                    lower = next((n for n in leaves if n.top <= rr <= n.bot), None)
                    if upper is not None and lower is not None and lower.top > upper.top:
                        parts: list[str] = []
                        for gr in range(r, min(len(lines), rr + 1)):
                            parts.extend(outside_text(lines, boxes, gr))
                        label = " ".join(p for p in parts if p)
                        found.append((lower, upper, label))
                        c = k
                        continue
            c += 1
    return found


def parse_flow(lines: list[str]) -> dict:
    boxes = find_boxes(lines)
    leaves = [b for b in boxes if not any(contains(b, other) for other in boxes)]
    parents = [b for b in boxes if any(contains(b, leaf) for leaf in leaves)]
    parents.sort(key=lambda b: (b.top, b.left))

    layers: list[dict] = []
    index: dict[Box, tuple[int, int]] = {}
    if parents:
        for parent in parents:
            kids = [leaf for leaf in leaves if contains(parent, leaf)]
            kids = [
                leaf for leaf in kids
                if not any(contains(parent, mid) and contains(mid, leaf) for mid in boxes if mid is not parent)
            ]
            kids.sort(key=lambda b: (b.top, b.left))
            li = len(layers)
            layers.append({
                "name": layer_name(lines, parent, kids),
                "nodes": [{"lines": node_text(lines, kid)} for kid in kids],
            })
            for ni, kid in enumerate(kids):
                index[kid] = (li, ni)
    else:
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
            li = len(layers)
            layers.append({
                "name": "",
                "nodes": [{"lines": node_text(lines, kid)} for kid in row],
            })
            for ni, kid in enumerate(row):
                index[kid] = (li, ni)

    # Components that share a merged stem: union of sources reaching the same cells.
    seen_by: dict[Box, set[tuple[int, int]]] = {}
    touched_by: dict[Box, set[Box]] = {}
    for leaf in leaves:
        if leaf not in index:
            continue
        ports = exit_ports(lines, boxes, leaves, leaf)
        touched, seen = flood(lines, boxes, leaves, leaf, ports)
        touched_by[leaf] = {n for n in touched if n in index and index[n][0] >= 0}
        seen_by[leaf] = seen

    parent: dict[Box, Box] = {leaf: leaf for leaf in seen_by}

    def find(node: Box) -> Box:
        while parent[node] is not node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(a: Box, b: Box) -> None:
        ra, rb = find(a), find(b)
        if ra is not rb:
            parent[rb] = ra

    order = [leaf for leaf in leaves if leaf in seen_by]
    for i, a in enumerate(order):
        for b in order[i + 1:]:
            if seen_by[a] & seen_by[b]:
                union(a, b)

    groups: dict[Box, list[Box]] = {}
    for leaf in order:
        groups.setdefault(find(leaf), []).append(leaf)

    raw: list[tuple[tuple[int, int], tuple[int, int], str]] = []
    for members in groups.values():
        members.sort(key=lambda n: (n.top, n.left))
        shared_seen: set[tuple[int, int]] = set()
        for member in members:
            shared_seen |= seen_by[member]
        touched: set[Box] = set()
        for member in members:
            touched |= touched_by[member]
        touched = {n for n in touched if n not in members}
        if touched:
            targets = sorted(touched, key=lambda n: (n.top, n.left))
        else:
            terms = terminals(lines, shared_seen)
            # Representative source is the top-most member; span is the union.
            targets = pick_targets(lines, members[0], members, terms, [n for n in leaves if n in index])
        label_top = max(n.bot for n in members)
        label_bot = min((n.top for n in targets), default=label_top)
        label = gap_label(lines, boxes, label_top, label_bot) if targets else ""
        for source in members:
            for target in targets:
                if target is source or target.top < source.bot:
                    continue
                raw.append((index[source], index[target], label))

    for row_nodes in _rows_of(leaves, index):
        ordered = sorted(row_nodes, key=lambda n: n.left)
        for a, b in zip(ordered, ordered[1:]):
            if horizontal_label_free(lines, a, b):
                raw.append((index[a], index[b], ""))

    for source, target, label in back_edges(lines, boxes, leaves):
        if source in index and target in index:
            raw.append((index[source], index[target], label))

    # A forward label that only describes the return loop stays on the back edge.
    back_labels = {label for src, dst, label in raw if src[0] > dst[0] and label}
    if back_labels:
        cleaned = []
        for src, dst, label in raw:
            if src[0] < dst[0] and label in back_labels:
                cleaned.append((src, dst, ""))
            else:
                cleaned.append((src, dst, label))
        raw = cleaned

    dedup: list[tuple[tuple[int, int], tuple[int, int], str]] = []
    seen_e: set[tuple[tuple[int, int], tuple[int, int], str]] = set()
    for item in sorted(raw, key=lambda e: (e[0], e[1], e[2])):
        if item not in seen_e:
            seen_e.add(item)
            dedup.append(item)

    label_rows: set[int] = set()
    for src, dst, _label in dedup:
        sbox = _box_at(index, src)
        dbox = _box_at(index, dst)
        if sbox is None or dbox is None:
            continue
        lo, hi = sorted((sbox.bot, dbox.top))
        for r in range(lo + 1, hi):
            label_rows.add(r)
        if dst[0] < src[0]:
            for r in range(dbox.top, sbox.bot + 1):
                label_rows.add(r)

    notes: list[str] = []
    for r in range(len(lines)):
        if r in label_rows:
            continue
        notes.extend(outside_text(lines, boxes, r))

    return {
        "layers": layers,
        "edges": [{"from": [a, b], "to": [c, d], "label": label} for (a, b), (c, d), label in dedup],
        "notes": notes,
    }


def _rows_of(leaves: list[Box], index: dict[Box, tuple[int, int]]) -> list[list[Box]]:
    rows: list[list[Box]] = []
    for leaf in sorted((n for n in leaves if n in index), key=lambda n: (n.top, n.left)):
        if rows and abs(leaf.top - rows[-1][0].top) <= 1:
            rows[-1].append(leaf)
        else:
            rows.append([leaf])
    return rows


def _box_at(index: dict[Box, tuple[int, int]], key: tuple[int, int]) -> Box | None:
    for box, idx in index.items():
        if idx == key:
            return box
    return None
