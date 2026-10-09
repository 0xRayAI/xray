#!/bin/sh
# Point BURST_STATE/current at a pinned release with one rename.
# The previous process keeps running until BURST_OLD_STOP is created, and that
# file is created only after the new link exists.
set -eu
if [ "${1:-}" = "" ] || [ "${1#-}" != "$1" ]; then
  echo "usage: release.sh <pinned-release-dir>" >&2
  exit 2
fi
STATE=${BURST_STATE:-$HOME/.burst}
mkdir -p "$STATE"
PIN=$(CDPATH= cd -- "$1" && pwd -P)
if [ ! -f "$PIN/house/burst/supervise.py" ] && [ ! -f "$PIN/supervise.py" ]; then
  echo "pinned release has no supervise.py" >&2
  exit 2
fi
ln -s "$PIN" "$STATE/current.next"
# -T treats the destination as a file, so a symlink to a directory is replaced.
# macOS mv has no -T. -h does not follow a symlink destination.
if ! mv -Tf "$STATE/current.next" "$STATE/current" 2>/dev/null; then
  mv -hf "$STATE/current.next" "$STATE/current"
fi
if [ -n "${BURST_OLD_STOP:-}" ]; then
  : > "$BURST_OLD_STOP"
fi
printf '%s\n' "$PIN"
