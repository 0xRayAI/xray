#!/bin/sh
# Delta pusher. The lock is fd 9. Sleep closes that fd so a stopped pusher
# cannot leave an orphan sleep holding the flock.
set -eu
LOCK=${BURST_LOCK:-${BURST_STATE:-$HOME/.burst}/push.lock}
CHECK=${BURST_PUSH_CHECK:-2}
mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
flock -n 9 || exit 0
# A real push runs here (cursor base, 409 means refetch the full feed).
# The sleep must not inherit fd 9.
sleep "$CHECK" 9>&-
exec 9>&-
