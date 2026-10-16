#!/bin/bash
# Compose the v4 hero: photo plate + exact HUD/caption type.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PLATE="${1:-$ROOT/scripts/media/exo-v4-plate-59.jpg}"
OUT="${2:-$ROOT/docs-site/static/img/exo-skeleton-v4.jpg}"
SOCIAL="${3:-$ROOT/docs-site/static/img/social-card.png}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WORK="$(mktemp -d /tmp/exo-v4-XXXX)"
trap 'rm -rf "$WORK"' EXIT

PLATE_ABS="$(cd "$(dirname "$PLATE")" && pwd)/$(basename "$PLATE")"
# 59 plate is clean — no paint-out. HUD type is HTML only.
cp "$PLATE_ABS" "$WORK/plate.jpg"
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
