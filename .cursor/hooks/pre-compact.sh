#!/bin/sh
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
station_sh="${HERE}/../../house/live/tools/inbox-watch-station.sh"
if [ -x "$station_sh" ]; then
  "$station_sh" || true
fi
exec /bin/sh "${HERE}/xray-cloud-hook.sh" preCompact pre-compact.js
