"""Record the v5 debate poster with the branch CSS motions.

The HTML next to the still is the source. This writes the MP4 and, when it
stays small, a GIF. Same picture: header rises, the rest fades in, module
marks blink, the packet mark spins, the challenge glows once, and the
sign-off marks use the slower seat blink.
"""
from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
STILL = ROOT / "docs-site/static/plates/x/v5-confer.png"
OUT = Path("/opt/cursor/artifacts")
SPLIT = 202
SIDE = 1600
FPS = 12
SECONDS = 4
BG = (4, 6, 12, 255)
CHIPS = (
    (76, 724, 148, 796),
    (1018, 724, 1090, 796),
    (76, 1024, 148, 1096),
    (1018, 1024, 1090, 1096),
    (1188, 812, 1260, 884),
    (1188, 940, 1260, 1012),
)
SEATS = ((256, 1360, 282, 1386), (738, 1360, 764, 1386), (1223, 1360, 1249, 1386))
SPIN = (94, 1140, 120, 1166)
GLOW_BOX = (1116, 236, 1524, 626)


def ease_out(u: float) -> float:
    u = 0.0 if u < 0 else 1.0 if u > 1 else u
    return 1 - (1 - u) ** 2


def blink(t: float, period: float, low: float) -> float:
    wave = math.sin(math.pi * ((t % period) / period))
    return 1 - (1 - low) * wave


def paste(canvas: Image.Image, sprite: Image.Image, xy: tuple[int, int], opacity: float) -> None:
    if opacity <= 0:
        return
    layer = sprite if sprite.mode == "RGBA" else sprite.convert("RGBA")
    if opacity < 0.999:
        alpha = layer.getchannel("A").point(lambda p: int(p * opacity))
        layer = layer.copy()
        layer.putalpha(alpha)
    canvas.alpha_composite(layer, xy)


def frame_at(still: Image.Image, t: float) -> Image.Image:
    fade_u = ease_out(t / 0.3)
    rise_u = ease_out(t / 0.6)
    body_dy = round(10 * (1 - fade_u))
    canvas = Image.new("RGBA", (SIDE, SIDE), BG)
    body = still.crop((0, SPLIT, SIDE, SIDE))
    paste(canvas, body, (0, SPLIT + body_dy), fade_u)
    head = still.crop((0, 0, SIDE, SPLIT))
    paste(canvas, head, (0, round(6 * (1 - rise_u))), rise_u)

    def replay(box: tuple[int, int, int, int], opacity: float, sprite: Image.Image | None = None) -> None:
        x0, y0, x1, y1 = box
        canvas.paste(BG, (x0, y0 + body_dy, x1, y1 + body_dy))
        paste(canvas, sprite if sprite is not None else still.crop(box), (x0, y0 + body_dy), opacity)

    for box in CHIPS:
        replay(box, fade_u * blink(t, 1.6, 0.35))
    for box in SEATS:
        replay(box, fade_u * blink(t, 2.8, 0.62))
    icon = still.crop(SPIN).rotate(-360 * ((t % 0.8) / 0.8), resample=Image.Resampling.BICUBIC)
    replay(SPIN, fade_u, icon)
    strength = 1 - ease_out(t / 2.6)
    if strength > 0.02 and fade_u > 0:
        glow = Image.new("RGBA", (SIDE, SIDE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        dy = body_dy
        x0, y0, x1, y1 = GLOW_BOX
        y0 += dy
        y1 += dy
        alpha = int(255 * strength * fade_u)
        draw.rounded_rectangle((x0 - 8, y0 - 8, x1 + 8, y1 + 8), radius=22, outline=(255, 209, 102, alpha), width=2)
        soft = glow.filter(ImageFilter.GaussianBlur(8))
        canvas.alpha_composite(soft)
        canvas.alpha_composite(glow)
    return canvas.convert("RGB")


def main() -> None:
    still = Image.open(STILL).convert("RGBA")
    if still.size != (SIDE, SIDE):
        raise RuntimeError(f"still is {still.size}")
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = OUT / "_v5-frames"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir()
    count = FPS * SECONDS
    for index in range(count):
        frame_at(still, index / FPS).save(tmp / f"f{index:03d}.png")
    mp4 = OUT / "v5-confer.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y", "-framerate", str(FPS), "-i", str(tmp / "f%03d.png"),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(mp4),
        ],
        check=True,
        capture_output=True,
    )
    gif = OUT / "v5-confer.gif"
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(mp4),
            "-vf", "fps=8,split[s0][s1];[s0]palettegen=max_colors=48[p];[s1][p]paletteuse",
            str(gif),
        ],
        check=True,
        capture_output=True,
    )
    shutil.rmtree(tmp)
    print(f"mp4 {mp4.stat().st_size}")
    print(f"gif {gif.stat().st_size}")


if __name__ == "__main__":
    main()
