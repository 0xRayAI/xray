/** Independent read of a plate fence. The PNG embeds the same flow. */

export interface PlateFlow {
  layers: Array<{ name: string; nodes: Array<{ lines: string[] }> }>;
  edges: Array<{ from: [number, number]; to: [number, number]; label: string }>;
  notes: string[];
}

interface Box {
  top: number;
  bot: number;
  left: number;
  right: number;
}

const BOX_CHARS = new Set(['┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼', '│', '─']);
const JUNCTION = new Set(['┬', '┴', '┼']);
const WIRE = new Set(['│', '─', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼']);
const LEFT_SIDE = new Set(['│', '├', '┼']);

function cell(lines: string[], r: number, c: number): string {
  const line = lines[r];
  if (line === undefined || c < 0 || c >= line.length) return ' ';
  return line[c] ?? ' ';
}

function isConnectorV(line: string, index: number): boolean {
  if (index < 0 || index >= line.length || line[index] !== 'v') return false;
  const prev = index ? (line[index - 1] ?? ' ') : ' ';
  const nxt = index + 1 < line.length ? (line[index + 1] ?? ' ') : ' ';
  return !/[A-Za-z]/.test(prev) && !/[A-Za-z]/.test(nxt);
}

function findBoxes(lines: string[]): Box[] {
  const found: Box[] = [];
  for (let r = 0; r < lines.length; r += 1) {
    const line = lines[r] ?? '';
    let c = 0;
    while (c < line.length) {
      if (line[c] === '┌') {
        let k = c + 1;
        while (k < line.length && line[k] !== '┐' && line[k] !== '┌') k += 1;
        if (k < line.length && line[k] === '┐') {
          let rr = r + 1;
          while (rr < lines.length && LEFT_SIDE.has(cell(lines, rr, c))) rr += 1;
          if (rr < lines.length && cell(lines, rr, c) === '└') {
            found.push({ top: r, bot: rr, left: c, right: k });
            c = k;
            continue;
          }
        }
      }
      c += 1;
    }
  }
  return found;
}

function contains(outer: Box, inner: Box): boolean {
  return outer.top < inner.top && outer.bot > inner.bot && outer.left < inner.left && outer.right > inner.right;
}

function cleanSegment(seg: string): string {
  return [...seg].map((ch) => (BOX_CHARS.has(ch) ? ' ' : ch)).join('').split(/\s+/).filter(Boolean).join(' ');
}

function nodeText(lines: string[], box: Box): string[] {
  const out: string[] = [];
  const top = cleanSegment((lines[box.top] ?? '').slice(box.left + 1, box.right));
  if (top) out.push(top);
  for (let r = box.top + 1; r < box.bot; r += 1) {
    const line = lines[r] ?? '';
    const left = line[box.left] ?? '';
    const seg = line.slice(box.left + 1, box.right);
    if ((left === '├' || left === '┼') && [...seg].every((ch) => BOX_CHARS.has(ch) || ch === ' ')) continue;
    const text = cleanSegment(seg);
    if (text) out.push(text);
  }
  const bot = cleanSegment((lines[box.bot] ?? '').slice(box.left + 1, box.right));
  if (bot) out.push(bot);
  return out;
}

function layerName(lines: string[], parent: Box, kids: Box[]): string {
  for (let r = parent.top; r <= parent.bot; r += 1) {
    const line = lines[r] ?? '';
    const spans = kids.filter((kid) => kid.top <= r && r <= kid.bot).map((kid) => [kid.left, kid.right] as const);
    const parts: string[] = [];
    const end = Math.min(parent.right, line.length);
    for (let c = parent.left + 1; c < end; c += 1) {
      if (spans.some(([a, b]) => a <= c && c <= b)) continue;
      const ch = line[c] ?? ' ';
      parts.push(BOX_CHARS.has(ch) || isConnectorV(line, c) ? ' ' : ch);
    }
    const text = parts.join('').split(/\s+/).filter(Boolean).join(' ');
    if (text) return text;
  }
  return '';
}

function onBorder(box: Box, r: number, c: number): boolean {
  const horizontal = (r === box.top || r === box.bot) && box.left <= c && c <= box.right;
  const vertical = (c === box.left || c === box.right) && box.top <= r && r <= box.bot;
  return horizontal || vertical;
}

function inside(box: Box, r: number, c: number): boolean {
  return box.top < r && r < box.bot && box.left < c && c < box.right;
}

function covered(boxes: Box[], r: number, c: number): boolean {
  return boxes.some((box) => inside(box, r, c) || onBorder(box, r, c));
}

function walkable(lines: string[], boxes: Box[], leaves: Box[], r: number, c: number): boolean {
  const ch = cell(lines, r, c);
  if (leaves.some((leaf) => inside(leaf, r, c))) return false;
  if (ch === 'v') return isConnectorV(lines[r] ?? '', c);
  if (!WIRE.has(ch)) return false;
  if (boxes.some((box) => onBorder(box, r, c))) return JUNCTION.has(ch);
  return true;
}

function exitPorts(lines: string[], boxes: Box[], leaves: Box[], node: Box): Array<[number, number]> {
  const ports: Array<[number, number]> = [];
  for (let c = node.left; c <= node.right; c += 1) {
    if (JUNCTION.has(cell(lines, node.bot, c)) && walkable(lines, boxes, leaves, node.bot, c)) {
      ports.push([node.bot, c]);
    }
  }
  if (ports.length) return ports;
  const r = node.bot + 1;
  for (let c = node.left + 1; c < node.right; c += 1) {
    const ch = cell(lines, r, c);
    if ((ch === '│' || ch === '┼' || (ch === 'v' && isConnectorV(lines[r] ?? '', c))) && walkable(lines, boxes, leaves, r, c)) {
      ports.push([r, c]);
    }
  }
  return ports;
}

function flood(
  lines: string[],
  boxes: Box[],
  leaves: Box[],
  source: Box,
  starts: Array<[number, number]>,
): { touched: Set<Box>; seen: Set<string> } {
  const seen = new Set<string>();
  const startKeys = new Set(starts.map(([r, c]) => `${r},${c}`));
  const stack = [...starts];
  const touched = new Set<Box>();
  while (stack.length) {
    const next = stack.pop();
    if (!next) continue;
    const [r, c] = next;
    const key = `${r},${c}`;
    if (seen.has(key)) continue;
    if (!walkable(lines, boxes, leaves, r, c) && !startKeys.has(key)) continue;
    const hit = leaves.find((leaf) => leaf !== source && leaf.top >= source.bot && onBorder(leaf, r, c) && JUNCTION.has(cell(lines, r, c)));
    if (hit) {
      touched.add(hit);
      seen.add(key);
      continue;
    }
    seen.add(key);
    stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
  }
  return { touched, seen };
}

function terminals(lines: string[], seen: Set<string>): Array<[number, number]> {
  const cells = [...seen].map((key) => key.split(',').map((part) => Number(part)) as [number, number]);
  const arrows = cells.filter(([r, c]) => isConnectorV(lines[r] ?? '', c));
  if (arrows.length) return arrows;
  if (!cells.length) return [];
  const low = Math.max(...cells.map(([r]) => r));
  return cells.filter(([r]) => r === low);
}

function hasTopJunction(lines: string[], node: Box): boolean {
  for (let c = node.left; c <= node.right; c += 1) {
    if (JUNCTION.has(cell(lines, node.top, c))) return true;
  }
  return false;
}

function firstRowBelow(nodes: Box[], rowAfter: number): Box[] {
  const below = nodes.filter((node) => node.top > rowAfter);
  if (!below.length) return [];
  const top = Math.min(...below.map((node) => node.top));
  return below.filter((node) => Math.abs(node.top - top) <= 1);
}

function covers(source: Box, row: Box[]): boolean {
  if (row.length <= 1) return false;
  const centers = row.map((node) => (node.left + node.right) / 2);
  const width = source.right - source.left;
  const widest = Math.max(...row.map((node) => node.right - node.left));
  return source.left <= Math.min(...centers) && source.right >= Math.max(...centers) && width > widest;
}

function pickTargets(lines: string[], source: Box, peers: Box[], terms: Array<[number, number]>, nodes: Box[]): Box[] {
  if (!terms.length) return [];
  const termRow = Math.max(...terms.map(([r]) => r));
  let row = firstRowBelow(nodes, termRow);
  if (!row.length) row = firstRowBelow(nodes, source.bot - 1);
  if (!row.length) return [];
  const cols = [...new Set(terms.map(([, c]) => c))].sort((a, b) => a - b);
  if (row.length === 1) return row;
  const span = peers.length ? peers : [source];
  const union = {
    top: source.top,
    bot: source.bot,
    left: Math.min(...span.map((node) => node.left)),
    right: Math.max(...span.map((node) => node.right)),
  };
  const firstCol = cols[0] ?? 0;
  if (cols.length === 1) {
    const aligned = row.filter((node) => node.left < firstCol && firstCol < node.right);
    if (aligned.length === 1 && !covers(union, row)) return aligned;
    if (!row.some((node) => hasTopJunction(lines, node))) return row;
    return aligned.length ? aligned : [row.reduce((best, node) => Math.abs((node.left + node.right) / 2 - firstCol) < Math.abs((best.left + best.right) / 2 - firstCol) ? node : best)];
  }
  const picked: Box[] = [];
  for (const col of cols) {
    const aligned = row.filter((node) => node.left <= col && col <= node.right);
    if (aligned.length) picked.push(...aligned);
    else picked.push(row.reduce((best, node) => Math.abs((node.left + node.right) / 2 - col) < Math.abs((best.left + best.right) / 2 - col) ? node : best));
  }
  const uniq: Box[] = [];
  for (const node of picked) if (!uniq.includes(node)) uniq.push(node);
  return uniq;
}

function outsideText(lines: string[], boxes: Box[], r: number): string[] {
  const line = lines[r] ?? '';
  const chunks: string[] = [];
  let buf = '';
  let gap = 0;
  const flush = (): void => {
    const text = buf.split(/\s+/).filter(Boolean).join(' ');
    buf = '';
    if (text) chunks.push(text);
  };
  for (let c = 0; c < line.length; c += 1) {
    const ch = line[c] ?? ' ';
    if (covered(boxes, r, c) || WIRE.has(ch) || ch === '<' || isConnectorV(line, c)) {
      gap += 1;
      if (gap >= 2) flush();
      else if (buf) buf += ' ';
      continue;
    }
    gap = 0;
    buf += ch;
  }
  flush();
  return chunks;
}

function gapLabel(lines: string[], boxes: Box[], top: number, bot: number): string {
  const parts: string[] = [];
  for (let r = top + 1; r < bot; r += 1) parts.push(...outsideText(lines, boxes, r));
  return parts.join(' ');
}

function backEdges(lines: string[], boxes: Box[], leaves: Box[]): Array<[Box, Box, string]> {
  const found: Array<[Box, Box, string]> = [];
  for (let r = 0; r < lines.length; r += 1) {
    const line = lines[r] ?? '';
    let c = 0;
    while (c < line.length) {
      if (line[c] === '<') {
        let k = c + 1;
        while (k < line.length && line[k] === '─') k += 1;
        if (k < line.length && line[k] === '┐' && k - c > 1) {
          let rr = r + 1;
          const endC = k;
          while (rr < lines.length) {
            if (cell(lines, rr, endC) === '│') {
              rr += 1;
              continue;
            }
            const probe = (lines[rr] ?? '').slice(Math.max(0, endC - 8), endC + 1);
            if (probe.includes('┘')) break;
            if (cell(lines, rr, endC) === ' ') break;
            rr += 1;
          }
          const upper = leaves.find((node) => node.top <= r && r <= node.bot);
          const lower = leaves.find((node) => node.top <= rr && rr <= node.bot);
          if (upper && lower && lower.top > upper.top) {
            const parts: string[] = [];
            for (let gr = r; gr < Math.min(lines.length, rr + 1); gr += 1) parts.push(...outsideText(lines, boxes, gr));
            found.push([lower, upper, parts.filter(Boolean).join(' ')]);
            c = k;
            continue;
          }
        }
      }
      c += 1;
    }
  }
  return found;
}

function intersect(a: Set<string>, b: Set<string>): boolean {
  for (const item of a) if (b.has(item)) return true;
  return false;
}

export function parsePlateFlow(lines: string[]): PlateFlow {
  const boxes = findBoxes(lines);
  const leaves = boxes.filter((box) => !boxes.some((other) => contains(box, other)));
  const parents = boxes.filter((box) => leaves.some((leaf) => contains(box, leaf)));
  parents.sort((a, b) => a.top - b.top || a.left - b.left);

  const layers: PlateFlow['layers'] = [];
  const index = new Map<Box, [number, number]>();
  if (parents.length) {
    for (const parent of parents) {
      let kids = leaves.filter((leaf) => contains(parent, leaf));
      kids = kids.filter((leaf) => !boxes.some((mid) => mid !== parent && contains(parent, mid) && contains(mid, leaf)));
      kids.sort((a, b) => a.top - b.top || a.left - b.left);
      const li = layers.length;
      layers.push({
        name: layerName(lines, parent, kids),
        nodes: kids.map((kid) => ({ lines: nodeText(lines, kid) })),
      });
      kids.forEach((kid, ni) => index.set(kid, [li, ni]));
    }
  } else {
    const rows: Box[][] = [];
    for (const leaf of [...leaves].sort((a, b) => a.top - b.top || a.left - b.left)) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(leaf.top - (last[0]?.top ?? leaf.top)) <= 1) last.push(leaf);
      else if (last && leaf.top <= Math.max(...last.map((node) => node.bot)) && leaf.bot >= Math.min(...last.map((node) => node.top))) last.push(leaf);
      else rows.push([leaf]);
    }
    for (const row of rows) {
      row.sort((a, b) => a.left - b.left);
      const li = layers.length;
      layers.push({ name: '', nodes: row.map((kid) => ({ lines: nodeText(lines, kid) })) });
      row.forEach((kid, ni) => index.set(kid, [li, ni]));
    }
  }

  const seenBy = new Map<Box, Set<string>>();
  const touchedBy = new Map<Box, Set<Box>>();
  for (const leaf of leaves) {
    if (!index.has(leaf)) continue;
    const ports = exitPorts(lines, boxes, leaves, leaf);
    const { touched, seen } = flood(lines, boxes, leaves, leaf, ports);
    const kept = new Set<Box>();
    for (const node of touched) if (index.has(node)) kept.add(node);
    touchedBy.set(leaf, kept);
    seenBy.set(leaf, seen);
  }

  const parentOf = new Map<Box, Box>();
  for (const leaf of seenBy.keys()) parentOf.set(leaf, leaf);
  const find = (node: Box): Box => {
    let cursor = node;
    while (parentOf.get(cursor) !== cursor) {
      const up = parentOf.get(cursor);
      const higher = up ? parentOf.get(up) : undefined;
      if (up && higher) parentOf.set(cursor, higher);
      cursor = parentOf.get(cursor) ?? cursor;
    }
    return cursor;
  };
  const union = (a: Box, b: Box): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parentOf.set(rb, ra);
  };
  const order = leaves.filter((leaf) => seenBy.has(leaf));
  for (let i = 0; i < order.length; i += 1) {
    for (let j = i + 1; j < order.length; j += 1) {
      const a = order[i];
      const b = order[j];
      const seenA = a ? seenBy.get(a) : undefined;
      const seenB = b ? seenBy.get(b) : undefined;
      if (a && b && seenA && seenB && intersect(seenA, seenB)) union(a, b);
    }
  }
  const groups = new Map<Box, Box[]>();
  for (const leaf of order) {
    const root = find(leaf);
    const list = groups.get(root) ?? [];
    list.push(leaf);
    groups.set(root, list);
  }

  type Edge = [[number, number], [number, number], string];
  let raw: Edge[] = [];
  for (const members of groups.values()) {
    members.sort((a, b) => a.top - b.top || a.left - b.left);
    const shared = new Set<string>();
    for (const member of members) for (const cellKey of seenBy.get(member) ?? []) shared.add(cellKey);
    const touched = new Set<Box>();
    for (const member of members) for (const node of touchedBy.get(member) ?? []) if (!members.includes(node)) touched.add(node);
    const targets = touched.size
      ? [...touched].sort((a, b) => a.top - b.top || a.left - b.left)
      : pickTargets(lines, members[0] as Box, members, terminals(lines, shared), leaves.filter((node) => index.has(node)));
    const labelTop = Math.max(...members.map((node) => node.bot));
    const labelBot = targets.length ? Math.min(...targets.map((node) => node.top)) : labelTop;
    const label = targets.length ? gapLabel(lines, boxes, labelTop, labelBot) : '';
    for (const source of members) {
      for (const target of targets) {
        if (target === source || target.top < source.bot) continue;
        const from = index.get(source);
        const to = index.get(target);
        if (from && to) raw.push([from, to, label]);
      }
    }
  }

  const rowBuckets: Box[][] = [];
  for (const leaf of [...leaves].filter((node) => index.has(node)).sort((a, b) => a.top - b.top || a.left - b.left)) {
    const last = rowBuckets[rowBuckets.length - 1];
    if (last && Math.abs(leaf.top - (last[0]?.top ?? leaf.top)) <= 1) last.push(leaf);
    else rowBuckets.push([leaf]);
  }
  for (const row of rowBuckets) {
    const ordered = [...row].sort((a, b) => a.left - b.left);
    for (let i = 0; i < ordered.length - 1; i += 1) {
      const a = ordered[i];
      const b = ordered[i + 1];
      if (!a || !b) continue;
      let linked = false;
      for (let r = Math.max(a.top, b.top); r <= Math.min(a.bot, b.bot); r += 1) {
        const seg = (lines[r] ?? '').slice(a.right + 1, b.left);
        if (seg.includes('─') || seg.includes('→')) linked = true;
      }
      if (linked) {
        const from = index.get(a);
        const to = index.get(b);
        if (from && to) raw.push([from, to, '']);
      }
    }
  }

  for (const [source, target, label] of backEdges(lines, boxes, leaves)) {
    const from = index.get(source);
    const to = index.get(target);
    if (from && to) raw.push([from, to, label]);
  }

  const backLabels = new Set(raw.filter(([src, dst, label]) => src[0] > dst[0] && label).map(([, , label]) => label));
  if (backLabels.size) {
    raw = raw.map(([src, dst, label]) => (src[0] < dst[0] && backLabels.has(label) ? [src, dst, ''] : [src, dst, label]));
  }

  raw.sort((a, b) => a[0][0] - b[0][0] || a[0][1] - b[0][1] || a[1][0] - b[1][0] || a[1][1] - b[1][1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
  const dedup: Edge[] = [];
  const seenE = new Set<string>();
  for (const item of raw) {
    const key = JSON.stringify(item);
    if (seenE.has(key)) continue;
    seenE.add(key);
    dedup.push(item);
  }

  const labelRows = new Set<number>();
  for (const [src, dst] of dedup) {
    const sbox = [...index.entries()].find(([, idx]) => idx[0] === src[0] && idx[1] === src[1])?.[0];
    const dbox = [...index.entries()].find(([, idx]) => idx[0] === dst[0] && idx[1] === dst[1])?.[0];
    if (!sbox || !dbox) continue;
    const lo = Math.min(sbox.bot, dbox.top);
    const hi = Math.max(sbox.bot, dbox.top);
    for (let r = lo + 1; r < hi; r += 1) labelRows.add(r);
    if (dst[0] < src[0]) for (let r = dbox.top; r <= sbox.bot; r += 1) labelRows.add(r);
  }

  const notes: string[] = [];
  for (let r = 0; r < lines.length; r += 1) {
    if (labelRows.has(r)) continue;
    notes.push(...outsideText(lines, boxes, r));
  }

  return {
    layers,
    edges: dedup.map(([from, to, label]) => ({ from, to, label })),
    notes,
  };
}
