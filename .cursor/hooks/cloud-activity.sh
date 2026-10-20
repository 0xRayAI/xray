#!/bin/sh
# Post {kind:cloud_agent, action:launch|finished} for this bc- agent.
# Fail open. Always exit 0. Stdout is {}. The key is LIVE_ACTIVITY_KEY from
# the environment only and is never printed. It is the bearer for POST /activity
# only. SEAT_KEYS is not read. A pull request uses the seat App token.
# Stdin is the hook payload, not the key. A file under
# .xray/state/cloud-activity/ dedupes launch across processes. The stamp is
# written only after POST /activity returns 202. Curl gives up in 1s, under
# the 2s hook limit. completed, aborted, and error post finished. That line
# is not an inbox run_end. A fresh stamp for this git head skips a second id.
# A stamp older than 6h is stale and is not resumed.
finish() {
  printf '%s\n' '{}'
  exit 0
}

stdin=$(cat 2>/dev/null || true)
parsed=$(printf '%s' "$stdin" | node -e '
let raw = "";
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  let event = "";
  let status = "";
  try {
    const body = JSON.parse(raw || "{}");
    if (body && typeof body.hook_event_name === "string") event = body.hook_event_name;
    if (body && typeof body.status === "string") status = body.status;
  } catch (err) { /* not json: skip */ }
  if (!/^[A-Za-z][A-Za-z0-9]{0,40}$/.test(event)) event = "";
  if (!/^[A-Za-z][A-Za-z0-9]{0,40}$/.test(status)) status = "";
  process.stdout.write(event + "\n" + status + "\n");
});
' 2>/dev/null || true)
event=$(printf '%s\n' "$parsed" | sed -n '1p')
status=$(printf '%s\n' "$parsed" | sed -n '2p')

flag=$(printf '%s' "${CURSOR_AGENT:-}" | tr -d '[:space:]')
case "$flag" in
  1|true|yes) ;;
  *) finish ;;
esac

id=$(printf '%s' "${CURSOR_CONVERSATION_ID:-}" | tr -d '[:space:]')
printf '%s' "$id" | grep -Eq '^bc-[A-Za-z0-9_-]{2,40}$' || finish

url=$(printf '%s' "${LIVE_URL:-}" | tr -d '[:space:]')
key=${LIVE_ACTIVITY_KEY:-}
[ -n "$url" ] && [ -n "$key" ] || finish

case "$event" in
  sessionStart|postToolUse) action=launch ;;
  stop)
    case "$status" in
      completed|aborted|error) action=finished ;;
      *) finish ;;
    esac
    ;;
  *) finish ;;
esac

root=${CURSOR_PROJECT_DIR:-}
if [ -z "$root" ]; then
  root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd) || finish
fi
stamp_dir="$root/.xray/state/cloud-activity"
stamp="$stamp_dir/$id"
sha=
if command -v git >/dev/null 2>&1; then
  sha=$(git -C "$root" rev-parse --verify HEAD 2>/dev/null || true)
  sha=$(printf '%s' "$sha" | tr -d '[:space:]')
  printf '%s' "$sha" | grep -Eq '^[0-9a-f]{40}$' || sha=
fi
fresh_stamp() {
  mtime=$(stat -c %Y "$1" 2>/dev/null || true)
  now=$(date +%s 2>/dev/null || true)
  case "$mtime" in ''|*[!0-9]*) return 1 ;; esac
  case "$now" in ''|*[!0-9]*) return 1 ;; esac
  [ $((now - mtime)) -le 21600 ]
}
if [ "$action" = launch ] && [ -n "$sha" ] && [ -f "$stamp_dir/head-$sha" ]; then
  owner=$(head -n 1 "$stamp_dir/head-$sha" 2>/dev/null || true)
  owner=$(printf '%s' "$owner" | tr -d '[:space:]')
  if printf '%s' "$owner" | grep -Eq '^bc-[A-Za-z0-9_-]{2,40}$' && [ "$owner" != "$id" ] && fresh_stamp "$stamp_dir/$owner"; then
    finish
  fi
fi
if [ "$action" = launch ] && fresh_stamp "$stamp"; then
  finish
fi

t_raw=$(TZ=America/Chicago date +%Y-%m-%dT%H:%M:%S%z 2>/dev/null || true)
t_ct=$(printf '%s' "$t_raw" | sed -E 's/([+-][0-9]{2})([0-9]{2})$/\1:\2/')
printf '%s' "$t_ct" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[+-][0-9]{2}:[0-9]{2}$' || finish

if [ -n "$sha" ]; then
  body=$(printf '{"kind":"cloud_agent","action":"%s","agent":"%s","t_ct":"%s","tag":"%s"}' "$action" "$id" "$t_ct" "$sha")
else
  body=$(printf '{"kind":"cloud_agent","action":"%s","agent":"%s","t_ct":"%s"}' "$action" "$id" "$t_ct")
fi

base=${url%/}
code=$(curl -sS --max-time 1 --connect-timeout 1 -o /dev/null -w '%{http_code}' \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${key}" \
  --data-binary "$body" \
  "${base}/activity" 2>/dev/null || true)
case "$code" in
  202) ;;
  *) code= ;;
esac
if [ "$action" = launch ] && [ "$code" = 202 ]; then
  mkdir -p "$stamp_dir" 2>/dev/null || true
  : > "$stamp" 2>/dev/null || true
  if [ -n "$sha" ]; then
    printf '%s\n' "$id" > "$stamp_dir/head-$sha" 2>/dev/null || true
  fi
fi
if [ "$action" = finished ]; then
  rm -f "$stamp" 2>/dev/null || true
fi
finish
