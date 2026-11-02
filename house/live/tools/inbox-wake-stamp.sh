#!/usr/bin/env bash
# Write one inbox wake token for <seat>. The watcher reprints the head once for a new token.
# The watcher's own --turn start --tag wake does not call this. A seat wake does.
set -u
seat="${1:-${XRAY_SEAT:-arch1}}"
if ! [[ "$seat" =~ ^[a-z0-9-]{2,16}$ ]]; then
  echo "usage: inbox-wake-stamp.sh [seat]" >&2
  exit 2
fi
dir="${INBOX_WAKE_DIR:-${HOME:?set HOME}/.burst/inbox-wake}"
mkdir -p "$dir"
printf 'wake-%s-%s\n' "$(date +%s)" "$$" > "$dir/$seat"
chmod 600 "$dir/$seat" 2>/dev/null || true
