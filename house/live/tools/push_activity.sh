#!/usr/bin/env bash
# Box activity uploader: sends new lines of a local activity JSONL (seat turns, prompts, a human's messages,
# cloud agents; written by live-act-append.sh or any hook) to the board's POST /activity/ingest in batches.
# Append-only: never deletes, truncates or rotates ACTIVITY_FILE. A cursor (inode + byte offset) in ACTIVITY_CURSOR
# means a line is sent once; it advances only after HTTP 200. A truncated/replaced file restarts at byte 0.
# Config (env only, nothing hardcoded):
#   LIVE_URL            board base URL                       (required unless DRY_RUN=1)
#   LIVE_INGEST_SECRET  ingest secret, sent as X-Live-Ingest (required unless DRY_RUN=1; never printed or in argv)
#   ACTIVITY_FILE       JSONL to upload                      (required)
#   ACTIVITY_CURSOR     cursor file          (default $ACTIVITY_FILE.cursor)
#   PUSH_LOG            log (codes/counts only; default stderr)
#   INTERVAL            seconds between passes (default 5)   RETRY  backoff after a failure (default 30)
#   BATCH_LINES  lines per POST (default 200)   ONCE=1 drain then exit   DRY_RUN=1 print the next batch, send nothing, cursor untouched
# Needs bash + curl (flock optional, keeps one instance per cursor).
set -u
umask 077
F=${ACTIVITY_FILE:-}; [ -n "$F" ] || { echo "ACTIVITY_FILE not set" >&2; exit 2; }
CUR=${ACTIVITY_CURSOR:-$F.cursor}
INTERVAL=${INTERVAL:-5} RETRY=${RETRY:-30} BATCH=${BATCH_LINES:-200} DRY=${DRY_RUN:-0}
if [ "$DRY" != 1 ] && { [ -z "${LIVE_URL:-}" ] || [ -z "${LIVE_INGEST_SECRET:-}" ]; }; then
  echo "LIVE_URL and LIVE_INGEST_SECRET must be set (or DRY_RUN=1)" >&2; exit 2; fi
log() { if [ -n "${PUSH_LOG:-}" ]; then printf '%s %s\n' "$(date -Iseconds)" "$1" >> "$PUSH_LOG"; else printf '%s %s\n' "$(date -Iseconds)" "$1" >&2; fi; }
if command -v flock >/dev/null 2>&1; then exec 9>"$CUR.lock"; flock -n 9 || { log "already running"; exit 1; }; fi

ino() { ls -di "$F" 2>/dev/null | awk '{print $1}'; }
pass() {  # 0 sent a batch, 2 nothing to send, 1 failed send
  [ -f "$F" ] || return 2
  local i size c_ino=0 off=0 tmp n code out added rej
  i=$(ino); size=$(wc -c < "$F" | tr -d ' ')
  [ -s "$CUR" ] && read -r c_ino off < "$CUR"
  if [ "$c_ino" != "$i" ] || [ "${off:-0}" -gt "$size" ]; then off=0; fi
  [ "$off" -lt "$size" ] || return 2
  tmp=$(mktemp) || return 1
  # complete lines only (a half-written last line waits for the next pass)
  tail -c +"$((off + 1))" "$F" | head -c "$((size - off))" | head -n "$BATCH" > "$tmp"
  if [ "$(tail -c 1 "$tmp" | od -An -c | tr -d ' ')" != '\n' ]; then
    n=$(grep -c '' "$tmp"); [ "$n" -gt 1 ] && head -n "$((n - 1))" "$tmp" > "$tmp.c" && mv "$tmp.c" "$tmp" || : > "$tmp"
  fi
  n=$(wc -c < "$tmp" | tr -d ' '); [ "$n" -gt 0 ] || { rm -f "$tmp"; return 2; }
  if [ "$DRY" = 1 ]; then cat "$tmp"; log "dry-run lines=$(grep -c '' "$tmp") (cursor not moved)"; rm -f "$tmp"; return 2; fi
    out=$(mktemp)
    code=$(printf 'header = "X-Live-Ingest: %s"\n' "$LIVE_INGEST_SECRET" |
      curl -sS -o "$out" -w '%{http_code}' --config - --max-time 30 -H 'Content-Type: application/x-ndjson' \
        --data-binary @"$tmp" "${LIVE_URL%/}/activity/ingest" 2>/dev/null) || true
    code=${code:-000}
  if [ "$code" = 200 ]; then
    added=$(sed -n 's/.*"added":\(-\{0,1\}[0-9]*\).*/\1/p' "$out"); rej=$(grep -o '"n":' "$out" | wc -l | tr -d ' ')
    printf '%s %s\n' "$i" "$((off + n))" > "$CUR.tmp" && mv "$CUR.tmp" "$CUR"
    log "activity $code lines=$(grep -c '' "$tmp") added=${added:-?} rejected=$rej"
    rm -f "$tmp" "$out"; return 0
  fi
  log "activity $code (cursor kept)"; rm -f "$tmp" "$out"; return 1
}
while :; do   # the loop is the supervisor; ONCE=1 drains what is there and exits (for cron / systemd timers)
  pass; r=$?
  case $r in
    0) continue ;;
    2) [ "${ONCE:-0}" = 1 ] && exit 0; sleep "$INTERVAL" 9>&- ;;
    *) [ "${ONCE:-0}" = 1 ] && exit 1; sleep "$RETRY" 9>&- ;;
  esac
done
