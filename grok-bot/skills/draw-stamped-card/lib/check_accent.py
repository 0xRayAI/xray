"""Bifrost + --accent cyan stays rainbow. LENS + --accent rainbow does not."""
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

LIB = Path(__file__).resolve().parent
SKILL = LIB.parent
sys.path.insert(0, str(LIB))
from accent import resolve_accent

STORY = SKILL / 'recipes' / 'bifrost-storyboard'
RENDER = STORY / 'render.py'
REF = STORY / 'reference.png'
RED = (235, 52, 52)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def rainbow_red_count(path):
    im = Image.open(path).convert('RGB')
    px = im.load()
    width, height = im.size
    count = 0
    for y in range(height):
        for x in range(width):
            red, green, blue = px[x, y]
            if abs(red - RED[0]) < 18 and abs(green - RED[1]) < 18 and abs(blue - RED[2]) < 25 and red > green + 80 and red > blue + 80:
                count += 1
    return count


def render(out, steps, accent):
    cmd = [sys.executable, str(RENDER), '--out', str(out), '--steps', str(steps)]
    if accent:
        cmd.extend(['--accent', accent])
    subprocess.check_call(cmd)


def main():
    bifrost = resolve_accent('BIFROST', 'cyan')
    lens = resolve_accent('LENS', 'rainbow')
    assert bifrost == 'rainbow', bifrost
    assert resolve_accent('bifrost', 'cyan') == 'rainbow'
    assert lens != 'rainbow' and lens == 'cyan', lens
    assert resolve_accent('LENS', None) == 'cyan'

    reference = sha256(REF)
    with tempfile.TemporaryDirectory() as tmp_name:
        tmp = Path(tmp_name)
        default_out = tmp / 'default.png'
        cyan_out = tmp / 'bifrost-cyan.png'
        render(default_out, STORY / 'steps.json', None)
        render(cyan_out, STORY / 'steps.json', 'cyan')
        default_sha = sha256(default_out)
        cyan_sha = sha256(cyan_out)
        assert default_sha == reference, default_sha
        assert cyan_sha == reference, cyan_sha
        assert rainbow_red_count(cyan_out) > 100

        cfg = json.loads((STORY / 'steps.json').read_text())
        cfg['title'] = 'LENS'
        lens_steps = tmp / 'lens-steps.json'
        lens_steps.write_text(json.dumps(cfg))
        lens_rainbow = tmp / 'lens-rainbow.png'
        lens_cyan = tmp / 'lens-cyan.png'
        render(lens_rainbow, lens_steps, 'rainbow')
        render(lens_cyan, lens_steps, 'cyan')
        assert sha256(lens_rainbow) == sha256(lens_cyan)
        red = rainbow_red_count(lens_rainbow)
        assert red == 0, red

    print('bifrost --accent cyan', bifrost)
    print('lens --accent rainbow', lens)
    print('reference', reference)
    print('default', default_sha)
    print('ok')
    return 0


if __name__ == '__main__':
    sys.exit(main())
