#!/usr/bin/env python3
"""Ping-pong mesh renderer that reads the live feed (fork of dist-media render_muse_live.py).

  python3 render_mesh.py --feed feed/live-events.json --out mesh.mp4 --duration 10
  python3 render_mesh.py --feed feed/live-events.json --out mesh.mp4 --follow 30

Replay: lays the last --last events of the feed evenly across --duration seconds and
writes an mp4 (ffmpeg) and/or PNG frames. Follow: checks the feed every N seconds and
re-renders the clip whenever the newest event id changes (near-live, no WebSocket).
Same node layout, colors, and seats as render_muse_live.py; story beats are replaced by
what the feed actually says (repo, PR number, kind) so nothing is hand-scripted.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
BG = (4, 6, 12)


def font(size, bold=False):
    for root in Path("/usr/share/fonts").rglob("Inter*.ttf"):
        n = root.name.lower()
        if bold and "bold" in n:
            return ImageFont.truetype(str(root), size)
        if not bold and ("regular" in n or n == "inter.ttf"):
            return ImageFont.truetype(str(root), size)
    p = Path("/usr/share/fonts/truetype/dejavu/" + ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"))
    return ImageFont.truetype(str(p), size) if p.exists() else ImageFont.load_default()


FT, FH, FB, FS, FX = font(22, True), font(16, True), font(14, False), font(13, False), font(11, False)

AGENTS = [
    ("blinky", "CoS", (88, 210, 180)),
    ("mill", "Eng Dev", (120, 220, 140)),
    ("forge", "merge", (110, 170, 255)),
    ("critic", "gate", (255, 150, 90)),
    ("herald", "voice", (200, 140, 255)),
    ("minime0x", "muse", (255, 180, 100)),
]
SEAT_NAMES = {a[0] for a in AGENTS}
COLOR = {
    "blinky": (88, 210, 180), "mill": (120, 220, 140), "forge": (110, 170, 255),
    "critic": (255, 150, 90), "herald": (200, 140, 255), "minime0x": (255, 180, 100),
    "GitHub": (200, 210, 230), "X": (140, 180, 255), "mymuse.house": (255, 200, 90),
    "Blaze0x1": (255, 120, 100), "grok": (180, 190, 200),
}
LABEL = {"blinky": "blinky", "mill": "mill", "forge": "forge", "critic": "critic", "herald": "herald",
         "minime0x": "minime0x", "GitHub": "GitHub", "X": "X", "mymuse.house": "mymuse"}
SUB = {"blinky": "CoS seat", "mill": "Eng Dev", "forge": "continuity", "critic": "gate",
       "herald": "replies", "minime0x": "muse bot", "GitHub": "PRs", "X": "@0xRayAI", "mymuse.house": "live site"}
SQUARE = {"GitHub", "X", "mymuse.house"}
WHO_LOG = {"mymuse.house": "MYMUSE", "Blaze0x1": "BLAZE", "minime0x": "MINIME", "GitHub": "GITHUB",
           "grok": "GROK", "blinky": "BLINKY", "mill": "MILL", "forge": "FORGE", "critic": "CRITIC",
           "herald": "HERALD", "X": "X"}
HUB = (640, 310)
SATS = {"blinky": (220, 200), "mill": (360, 160), "forge": (520, 160), "critic": (680, 160),
        "herald": (220, 380), "minime0x": (360, 440), "GitHub": (980, 200), "X": (980, 320),
        "mymuse.house": (980, 440)}
EDGES = [
    ("blinky", "forge"), ("blinky", "critic"), ("blinky", "herald"), ("blinky", "mill"),
    ("mill", "forge"), ("forge", "critic"), ("minime0x", "GitHub"), ("forge", "GitHub"),
    ("mill", "GitHub"), ("critic", "GitHub"), ("herald", "X"), ("blinky", "X"),
    ("GitHub", "mymuse.house"), ("mymuse.house", "blinky"), ("minime0x", "critic"),
    ("forge", "mymuse.house"), ("critic", "mill"), ("critic", "forge"),
]
ALIAS = {"Blaze0x1": "X", "grok": "X"}
GIT_KINDS = {"pr_open", "pr_update", "pr_close", "merged", "fix", "supersede", "review", "comment",
             "critic_fail", "critic_pass", "ci_pass", "ci_fail", "issue_open", "issue_close",
             "deploy", "deploy_fail", "health_ok", "health_fail", "probe"}
KIND_WORD = {"pr_open": "open", "pr_update": "fix / update", "merged": "merge", "pr_close": "close",
             "supersede": "supersede", "critic_pass": "Light PASS", "critic_fail": "Light FAIL",
             "ci_pass": "CI pass", "ci_fail": "CI fail", "review": "review", "comment": "comment",
             "issue_open": "issue open", "issue_close": "issue close", "fix": "fix",
             "deploy": "deploy", "deploy_fail": "deploy FAIL", "health_ok": "/health ok",
             "health_fail": "/health FAIL", "x_in_mention": "IN mention", "x_in_reply": "IN reply",
             "x_out_reply": "OUT reply", "x_out_root": "OUT root", "x_like": "LIKE",
             "x_root": "OUT root", "x_reply": "X reply"}
LEGACY_KIND = {"fix": "pr_update", "probe": "health_ok", "x_root": "x_out_root"}
BANNED = ("Dist", "emergence", "compaction")
PING_DUR = 1.1


def resolve_nodes(e):
    """SPEC §5 ping mapping. X accounts sit on the X rail only for x_* kinds."""
    kind = LEGACY_KIND.get(e["kind"], e["kind"])
    if kind == "x_reply":
        kind = "x_out_reply" if e.get("from") in ("herald", "0xRayAI") else "x_in_reply"
    if kind in ("x_in_mention", "x_in_reply"):
        return "X", "herald"
    if kind in ("x_out_reply", "x_out_root", "x_like"):
        return "herald", "X"
    if kind in ("deploy", "deploy_fail"):
        return "GitHub", "mymuse.house"
    if kind in ("health_ok", "health_fail", "probe"):
        return "mymuse.house", "blinky"
    alias = {k: "GitHub" for k in ALIAS}  # Blaze/grok act through GitHub on eng kinds
    src = alias.get(e["from"], e["from"])
    dst = alias.get(e["to"], e["to"])
    if src not in SATS:
        src = "GitHub" if kind in GIT_KINDS else "X"
    if dst not in SATS:
        dst = "GitHub"
    if kind in ("critic_fail", "critic_pass"):
        src = "critic"
        if dst == "critic":
            dst = "GitHub"
    if kind in ("ci_pass", "ci_fail"):
        src = "GitHub"
    if src == dst:
        dst = "GitHub" if src != "GitHub" else "forge"
    return src, dst


class Clip:
    def __init__(self, feed: dict, duration: float, fps: int, last: int,
                 t_from: str | None = None, t_to: str | None = None):
        evs = sorted(feed["events"], key=lambda e: e["t_ct"])
        if t_from:
            evs = [e for e in evs if e["t_ct"] >= t_from]
        if t_to:
            evs = [e for e in evs if e["t_ct"] <= t_to]
        raw = evs[-last:]
        if not raw:
            raise SystemExit("feed has no events")
        self.feed, self.raw, self.duration, self.fps = feed, raw, duration, fps
        self.n = int(duration * fps)
        t0, t1 = 0.4, max(duration - PING_DUR - 0.3, 0.5)
        step = (t1 - t0) / max(len(raw) - 1, 1)
        self.log, self.pk, self.live = [], [], []
        self.ct_at = []  # (clip t, event)
        for i, e in enumerate(raw):
            ct = t0 + i * step
            label = e["label"]
            for b in BANNED:
                label = label.replace(b, "…")
            col = COLOR.get(e["from"], (180, 190, 210))
            if e["kind"] in ("critic_fail", "ci_fail", "deploy_fail", "health_fail"):
                col = (255, 110, 90)
            elif e["kind"] in ("critic_pass", "ci_pass", "health_ok", "deploy"):
                col = (120, 230, 150)
            elif e["kind"].startswith(("x_out", "x_like")) or e["kind"] in ("x_root",):
                col = COLOR["herald"]
            elif e["kind"].startswith("x_"):
                col = COLOR["X"]
            self.log.append((ct, e["from"] if not e["kind"].startswith("critic_") else "critic", label, col))
            src, dst = resolve_nodes(e)
            self.pk.append((ct, ct + PING_DUR, src, dst, col))
            for seat in {e["from"], e["to"], src, dst} & SEAT_NAMES:
                self.live.append((ct, ct + PING_DUR, seat))
            self.ct_at.append((ct, e))
        kinds = {e["kind"] for e in raw}
        self.has_x = any(k.startswith("x_") for k in kinds)
        first = {}
        for ct, e in self.ct_at:
            first.setdefault(e["kind"], ct)
        def at(*ks):
            ts = [first[k] for k in ks if k in first]
            return min(ts) if ts else None
        self.stack = [
            ("GitHub", "PR open / fix / merge", at("pr_open", "pr_update", "merged", "pr_close")),
            ("critic gate", "Light PASS / FAIL", at("critic_pass", "critic_fail")),
            ("deploy /health", "site after merge", at("deploy", "deploy_fail", "health_ok", "health_fail")),
            ("X IN", "mentions / replies → herald", at("x_in_mention", "x_in_reply")),
            ("X OUT", "herald replies / roots / likes", at("x_out_reply", "x_out_root", "x_like")),
        ]
        self.span = (raw[0]["t_ct"][:16].replace("T", " "), raw[-1]["t_ct"][:16].replace("T", " "))

    def current(self, t):
        cur = None
        for ct, e in self.ct_at:
            if ct <= t:
                cur = e
        return cur

    def seat_live(self, t, name):
        return any(t0 - 0.05 <= t <= t1 + 0.05 and s == name for t0, t1, s in self.live)

    def node_hot(self, t, name):
        return any(t0 - 0.05 <= t <= t1 + 0.12 and name in (s, d) for t0, t1, s, d, _ in self.pk)


def bez(p0, p1, p2, p):
    return ((1 - p) ** 2 * p0[0] + 2 * (1 - p) * p * p1[0] + p ** 2 * p2[0],
            (1 - p) ** 2 * p0[1] + 2 * (1 - p) * p * p1[1] + p ** 2 * p2[1])


def edge_mid(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 20)


def draw_traffic(d, a, b, t, color, speed=0.55, count=5, size=3):
    mid = edge_mid(a, b)
    off = ((a[0] + b[0] * 3 + a[1] * 7) % 97) / 97.0
    for i in range(count):
        p = (t * speed + off + i / count) % 1.0
        x, y = bez(a, mid, b, p)
        for k in range(1, 4):
            gx, gy = bez(a, mid, b, (p - k * 0.035) % 1.0)
            r = max(1, size - k)
            d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=tuple(max(0, c // (1 + k)) for c in color))
        r = size + (1 if i == 0 else 0)
        d.ellipse([x - r, y - r, x + r, y + r], fill=color)


def pill_label(d, cx, top, title, subtitle, color):
    w = max(FH.getlength(title), FX.getlength(subtitle)) + 16
    x0 = cx - w / 2
    d.rounded_rectangle([x0, top, x0 + w, top + 32], radius=6, fill=(16, 20, 32), outline=color, width=2)
    d.text((x0 + 8, top + 2), title, font=FH, fill=color)
    d.text((x0 + 8, top + 16), subtitle, font=FX, fill=(150, 160, 180))


def draw_node(d, xy, r, color, key, hot=False):
    x, y = xy
    if hot:
        for k in range(3, 0, -1):
            rr = r + k * 5
            ac = tuple(max(0, c // (k + 1)) for c in color)
            if key in SQUARE:
                d.rounded_rectangle([x - rr, y - rr, x + rr, y + rr], radius=6, outline=ac, width=2)
            else:
                d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=ac, width=2)
    box = [x - r, y - r, x + r, y + r]
    if key in SQUARE:
        d.rounded_rectangle(box, radius=5, fill=(12, 16, 28), outline=color, width=3 if hot else 2)
        d.rectangle([x - 5, y - 5, x + 5, y + 5], fill=color)
    else:
        d.ellipse(box, fill=(12, 16, 28), outline=color, width=3 if hot else 2)
        d.ellipse([x - 5, y - 3, x - 1, y + 1], fill=color)
        d.ellipse([x + 1, y - 3, x + 5, y + 1], fill=color)
    pill_label(d, x, y + r + 4, LABEL[key], SUB[key], color)


def render(clip: Clip, i: int) -> Image.Image:
    t = i / clip.fps
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    for x in range(0, W, 24):
        d.line([(x, 44), (x, H)], fill=(10, 14, 22))
    for y in range(44, H, 24):
        d.line([(0, y), (W, y)], fill=(10, 14, 22))
    d.rectangle([0, 0, W, 44], fill=(8, 10, 18))
    d.text((14, 10), "BLAZE DESK", font=FT, fill=(230, 235, 255))
    d.text((14 + FT.getlength("BLAZE DESK") + 12, 14), "· PING-PONG MESH  ·  live feed: PRs + Light" + (" + X both ways" if clip.has_x else ""),
           font=FS, fill=(120, 130, 160))
    d.text((W - 72, 14), f"{t:04.1f}s", font=FS, fill=(100, 110, 140))

    d.rounded_rectangle([8, 50, W - 8, 92], radius=8, fill=(10, 14, 24), outline=(30, 40, 60), width=1)
    for idx, (name, role, col) in enumerate(AGENTS):
        x = 18 + idx * 175
        hot = clip.seat_live(t, name)
        st = "LIVE" if hot else "IDLE"
        d.ellipse([x, 60, x + 16, 76], fill=col if hot else (40, 50, 70))
        if hot:
            d.ellipse([x - 2, 58, x + 18, 78], outline=col, width=2)
        d.text((x + 22, 56), name.upper(), font=FH, fill=col)
        d.text((x + 22, 72), f"{role} · {st}", font=FX, fill=(220, 230, 255) if hot else (130, 140, 160))

    d.rounded_rectangle([8, 100, W - 8, 520], radius=10, fill=(8, 12, 20), outline=(35, 45, 70), width=2)
    d.text((18, 108), "THE LENS · PING-PONG VOLLEY", font=FS, fill=(140, 150, 175))
    cur = clip.current(t)
    if cur:
        head = f"{cur.get('repo', '').split('/')[-1]} #{cur.get('number', '')} · {KIND_WORD.get(cur['kind'], cur['kind'])}"
        d.text((18, 126), head.strip(" ·#"), font=FH, fill=(88, 210, 180))
        d.text((18, 146), cur["t_ct"][:16].replace("T", " ") + " CT", font=FX, fill=(110, 120, 150))
    d.text((980, 108), "pings = handoffs", font=FX, fill=(100, 110, 140))
    d.text((980, 124), "circles=seats  squares=rails", font=FX, fill=(100, 110, 140))
    d.text((980, 140), f"feed {clip.span[0]} → {clip.span[1][11:]} CT", font=FX, fill=(100, 110, 140))

    for n in range(40):
        ang = n / 40 * math.tau + t * 0.25
        rr = 30 + (n % 6) * 12
        d.point([(HUB[0] + math.cos(ang) * rr, HUB[1] + math.sin(ang) * rr * 0.6)], fill=(40, 55, 80))
    for a, b in EDGES:
        pa, pb = SATS[a], SATS[b]
        hot = any(t0 - 0.05 <= t <= t1 + 0.1 and {s, d_} == {a, b} for t0, t1, s, d_, _ in clip.pk)
        mid = edge_mid(pa, pb)
        d.line([bez(pa, mid, pb, k / 12) for k in range(13)], fill=(55, 90, 120) if hot else (22, 32, 50),
               width=2 if hot else 1)
    for a, b in EDGES:
        pa, pb = SATS[a], SATS[b]
        col = tuple((COLOR[a][i] + COLOR[b][i]) // 2 for i in range(3))
        burst = any(t0 <= t <= t1 and {s, d_} == {a, b} for t0, t1, s, d_, _ in clip.pk)
        draw_traffic(d, pa, pb, t, col, speed=0.9 if burst else 0.35, count=8 if burst else 4, size=4 if burst else 2)
    for t0, t1, src, dst, col in clip.pk:
        if not (t0 <= t <= t1):
            continue
        p = (t - t0) / max(t1 - t0, 1e-6)
        p = p * p * (3 - 2 * p)
        a, b = SATS[src], SATS[dst]
        mid = edge_mid(a, b)
        x, y = bez(a, mid, b, p)
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=col)
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(255, 255, 255))
        for k in range(1, 6):
            tx, ty = bez(a, mid, b, max(0, p - k * 0.04))
            r = 6 - k
            d.ellipse([tx - r, ty - r, tx + r, ty + r], fill=tuple(max(0, c * (6 - k) // 6) for c in col))
    x, y = HUB
    d.rounded_rectangle([x - 30, y - 24, x + 30, y + 24], radius=8, fill=(18, 22, 34), outline=(230, 235, 255), width=3)
    d.text((x - 22, y - 8), "mesh", font=FH, fill=(240, 245, 255))
    for key, xy in SATS.items():
        draw_node(d, xy, 15, COLOR[key], key, hot=clip.node_hot(t, key) or clip.seat_live(t, key))

    d.rounded_rectangle([8, 528, 720, H - 8], radius=8, fill=(8, 12, 20), outline=(35, 45, 70), width=1)
    d.text((18, 536), "ACTIVITY · from feed", font=FS, fill=(140, 150, 175))
    for j, (et, who, text, col) in enumerate([e for e in clip.log if e[0] <= t][-6:]):
        yy = 556 + j * 24
        d.text((18, yy), WHO_LOG.get(who, who.lstrip("@").upper()[:8]), font=FX, fill=col)
        d.text((100, yy), text[:64], font=FS, fill=(210, 220, 235))

    d.rounded_rectangle([736, 528, W - 8, H - 8], radius=8, fill=(8, 12, 20), outline=(35, 45, 70), width=1)
    d.text((748, 536), "IN FEED", font=FS, fill=(140, 150, 175))
    for j, (name, gloss, a) in enumerate(clip.stack):
        yy = 556 + j * 28
        on = a is not None and a <= t
        absent = a is None
        col = (88, 210, 180) if on else (70, 80, 100)
        d.rectangle([748, yy, 754, yy + 20], fill=(40, 180, 120) if on else (50, 60, 80))
        d.text((762, yy), name, font=FH, fill=col)
        d.text((762, yy + 14), gloss + (" · none in window" if absent else ""), font=FX, fill=(130, 140, 160))
    return im


def render_clip(feed_path: Path, out: Path | None, frames_dir: Path | None, duration: float, fps: int, last: int,
                t_from: str | None = None, t_to: str | None = None):
    feed = json.loads(feed_path.read_text())
    clip = Clip(feed, duration, fps, last, t_from, t_to)
    print(f"feed={feed_path} events_in_clip={len(clip.raw)} of {feed.get('event_count')} frames={clip.n}", flush=True)
    ff = None
    tmp = None
    if out:
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_name(out.stem + ".part" + out.suffix)
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                               "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-c:v", "libx264",
                               "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(tmp)], stdin=subprocess.PIPE)
    if frames_dir:
        frames_dir.mkdir(parents=True, exist_ok=True)
    for i in range(clip.n):
        im = render(clip, i)
        if ff:
            ff.stdin.write(im.tobytes())
        if frames_dir:
            im.save(frames_dir / f"f{i:04d}.png")
    if ff:
        ff.stdin.close()
        if ff.wait() != 0:
            raise SystemExit("ffmpeg failed")
        os.replace(tmp, out)
        print(f"wrote {out}", flush=True)
    return clip


def main() -> int:
    here = Path(__file__).resolve().parent
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--feed", default=str(here / "feed" / "live-events.json"))
    p.add_argument("--out", help="mp4 path (atomic replace)")
    p.add_argument("--frames-dir", help="also write PNG frames here")
    p.add_argument("--duration", type=float, default=10.0)
    p.add_argument("--fps", type=int, default=20)
    p.add_argument("--last", type=int, default=24, help="events from the end of the feed to show")
    p.add_argument("--from", dest="t_from", help="only events with t_ct >= this (e.g. 2026-10-04T10:00)")
    p.add_argument("--to", dest="t_to", help="only events with t_ct <= this")
    p.add_argument("--follow", type=float, default=0, help="re-render when the feed gains events; poll every N s")
    a = p.parse_args()
    if not a.out and not a.frames_dir:
        p.error("give --out and/or --frames-dir")
    feed_path = Path(a.feed)
    args = (feed_path, Path(a.out) if a.out else None, Path(a.frames_dir) if a.frames_dir else None,
            a.duration, a.fps, a.last, a.t_from, a.t_to)
    last_id = None
    while True:
        try:
            evs = json.loads(feed_path.read_text()).get("events", [])
            newest = evs[-1].get("id", evs[-1]["t_ct"]) if evs else None
        except (OSError, json.JSONDecodeError) as e:
            print(f"feed not readable yet: {e}", file=sys.stderr)
            newest = None
        if newest and newest != last_id:
            render_clip(*args)
            last_id = newest
        if not a.follow:
            return 0
        time.sleep(a.follow)


if __name__ == "__main__":
    sys.exit(main())
