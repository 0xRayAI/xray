#!/usr/bin/env bash
# Append one activity line to a local ACTIVITY_FILE (the writer side of the box uploader, push_activity.sh).
# Use it from an agent hook or routine on a box where seats share one uploader instead of each holding a key:
#   live-act-append.sh <seat> start|tick|end turn|subagent|watcher <tag>
#   live-act-append.sh <seat> received|sent prompt <from|to seat>      (a human's message: received prompt <Human>)
#   live-act-append.sh <seat> launch|reply|finished|cancel cloud_agent <agent id>
# Config (env only): ACTIVITY_FILE (required). Sends ids and seat names only, never message text. Append-only.
set -u
f=${ACTIVITY_FILE:-}; [ -n "$f" ] || { echo "ACTIVITY_FILE not set" >&2; exit 2; }
[ $# -eq 4 ] || { sed -n '3,6p' "$0" >&2; exit 2; }
seat=$1 action=$2 kind=$3 arg=$4
case "$kind:$action" in
  turn:start|turn:tick|turn:end|subagent:start|subagent:tick|subagent:end|watcher:start|watcher:tick|watcher:end) key=tag ;;
  prompt:received) key=from ;; prompt:sent) key=to ;;
  cloud_agent:launch|cloud_agent:reply|cloud_agent:finished|cloud_agent:cancel) key=agent ;;
  *) echo "bad kind/action: $kind $action" >&2; exit 2 ;;
esac
re='^[A-Za-z0-9 ._:@#+/-]{1,40}$'
[[ $seat =~ $re && $arg =~ $re ]] || { echo "seat and arg must be short plain ids" >&2; exit 2; }
t=$(date +%Y-%m-%dT%H:%M:%S%z); t="${t:0:22}:${t:22}"
line=$(printf '{"t_ct":"%s","seat":"%s","kind":"%s","action":"%s","%s":"%s"}' "$t" "$seat" "$kind" "$action" "$key" "$arg")
mkdir -p "$(dirname "$f")"
if command -v flock >/dev/null 2>&1; then { flock 8; printf '%s\n' "$line" >> "$f"; } 8>>"$f.lock"
else printf '%s\n' "$line" >> "$f"; fi
