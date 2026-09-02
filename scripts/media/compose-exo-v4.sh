#!/bin/bash
# Compose the v4 hero: photo plate + exact HUD/caption type.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PLATE="${1:-$ROOT/scripts/media/exo-v4-plate.jpg}"
OUT="${2:-$ROOT/docs-site/static/img/exo-skeleton-v4.jpg}"
SOCIAL="${3:-$ROOT/docs-site/static/img/social-card.png}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WORK="$(mktemp -d /tmp/exo-v4-XXXX)"
trap 'rm -rf "$WORK"' EXIT

PLATE_ABS="$(cd "$(dirname "$PLATE")" && pwd)/$(basename "$PLATE")"
# Snapshot + paint out generated type so the overlay is the only copy.
python3 - "$PLATE_ABS" "$WORK/plate.jpg" <<'PY'
from PIL import Image, ImageDraw, ImageFilter
src, dst = __import__('sys').argv[1], __import__('sys').argv[2]
im = Image.open(src).convert("RGBA")
w, h = im.size
overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
d = ImageDraw.Draw(overlay)
# visor HUD bar (original CONSTITUTION ON)
d.rounded_rectangle((450, 155, 830, 214), radius=4, fill=(5, 10, 18, 255))
# solid caption footer — generated type cannot ghost through
for y in range(568, h):
    t = min(1.0, (y - 568) / 18.0)
    a = int(255 * t) if y < 586 else 255
    d.line([(0, y), (w, y)], fill=(5, 9, 16, a))
im = Image.alpha_composite(im, overlay).convert("RGB")
im.save(dst, "JPEG", quality=95)
PY
PLATE_URL="file://$WORK/plate.jpg"
HTML="$WORK/hero.html"
sed "s|PLATE_SRC|$PLATE_URL|" "$ROOT/scripts/media/exo-v4-hero.html" > "$HTML"

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --allow-file-access-from-files \
  --force-device-scale-factor=1 \
  --window-size=1280,720 \
  --default-background-color=00000000 \
  --virtual-time-budget=4000 \
  --screenshot="$WORK/hero.png" \
  "file://$HTML"

python3 - "$WORK/hero.png" "$OUT" "$SOCIAL" <<'PY'
import sys
from PIL import Image
src, out, social = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert("RGB")
if im.size != (1280, 720):
    im = im.resize((1280, 720), Image.Resampling.LANCZOS)
im.save(out, "JPEG", quality=92, optimize=True, progressive=True)
# OG 1.91:1
# Keep the caption footer; crop extra from the top for OG 1200x630.
card = im.resize((1200, 675), Image.Resampling.LANCZOS).crop((0, 45, 1200, 675))
card.save(social, "PNG", optimize=True)
print(f"wrote {out} {im.size}")
print(f"wrote {social} {card.size}")
PY
