#!/usr/bin/env bash
# Write one Watcher line on the station page from inbox-watch.state. No other line changes.
set -u
state="${INBOX_WATCH_STATE:-$HOME/.burst/inbox-watch.state}"
station="${INBOX_WATCH_STATION:-}"
if [[ -z "$station" ]]; then
  if [[ -n "${XRAY_MAIN:-}" && -f "${XRAY_MAIN}/.xray/state/STATION.md" ]]; then
    station="${XRAY_MAIN}/.xray/state/STATION.md"
  elif [[ -f .xray/state/STATION.md ]]; then
    station=".xray/state/STATION.md"
  else
    exit 0
  fi
fi
if [[ ! -f "$state" || ! -f "$station" ]]; then
  exit 0
fi
python3 - "$state" "$station" << 'PY'
import sys
from pathlib import Path

data = {}
for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines():
    if "=" not in line:
        continue
    key, value = line.split("=", 1)
    data[key.strip()] = value.strip()
pid = data.get("pid", "")
started = data.get("started") or data.get("last_ok", "")
url = data.get("live_url", "")
last = data.get("last_ok", "")
if not pid or not url or not last or not started:
    sys.exit(0)
watcher = "Watcher: pid %s since %s LIVE_URL %s last ok %s\n" % (pid, started, url, last)
path = Path(sys.argv[2])
lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
out = []
found = False
for existing in lines:
    if existing.startswith("Watcher:"):
        if not found:
            out.append(watcher)
            found = True
        continue
    out.append(existing if existing.endswith("\n") else existing + "\n")
if not found:
    inserted = []
    placed = False
    for existing in out:
        inserted.append(existing)
        if not placed and existing.startswith("Notes:"):
            inserted.append(watcher)
            placed = True
    out = inserted if placed else out + [watcher]
path.write_text("".join(out), encoding="utf-8")
PY
