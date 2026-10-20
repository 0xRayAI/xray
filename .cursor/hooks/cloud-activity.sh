#!/bin/sh
# Post {kind:cloud_agent, action:launch|finished} for this bc- agent.
# Fail open. Always exit 0. Stdout is {}. The key is LIVE_ACTIVITY_KEY from
# the environment only and is never printed. Stdin is the hook payload, not
# the key. A file stamp dedupes launch across processes. Curl gives up inside
# the 2s hook limit.
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
if [ "$action" = launch ] && [ -f "$stamp" ]; then
  finish
fi

t_raw=$(TZ=America/Chicago date +%Y-%m-%dT%H:%M:%S%z 2>/dev/null || true)
t_ct=$(printf '%s' "$t_raw" | sed -E 's/([+-][0-9]{2})([0-9]{2})$/\1:\2/')
printf '%s' "$t_ct" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[+-][0-9]{2}:[0-9]{2}$' || finish

body=$(printf '{"kind":"cloud_agent","action":"%s","agent":"%s","t_ct":"%s"}' "$action" "$id" "$t_ct")
if [ "$action" = launch ]; then
  mkdir -p "$stamp_dir" 2>/dev/null || finish
  : > "$stamp" 2>/dev/null || finish
fi

base=${url%/}
curl -sS --max-time 1 --connect-timeout 1 -o /dev/null \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${key}" \
  --data-binary "$body" \
  "${base}/activity" >/dev/null 2>&1 || true

if [ "$action" = finished ]; then
  rm -f "$stamp" 2>/dev/null || true
fi
finish
