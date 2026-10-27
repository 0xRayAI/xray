#!/usr/bin/env bash
# Suit boot enables the inbox watcher in the local TUI.
# This script does not start a process.
set -u
seat="${1:-arch1}"
if ! [[ "$seat" =~ ^[a-z0-9-]{2,16}$ ]]; then
  echo "usage: inbox-watch-ensure.sh [seat]" >&2
  exit 2
fi
here="$(cd "$(dirname "$0")" && pwd)"
script="${INBOX_WATCH_BIN:-$here/inbox-watch.sh}"
printf 'run in the local TUI\n%s %s\n' "$script" "$seat"
exit 2
