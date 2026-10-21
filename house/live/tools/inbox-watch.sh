#!/usr/bin/env bash
# Poll live-inbox <seat> (default arch1) every 60s.
# FAIL once per distinct error. ACTION_REQUIRED plus the lines when the read changes.
# live-inbox <seat> --turn start --tag wake when work first appears.
# live-inbox <seat> --turn end once the inbox is empty again.
# Never acks. Never prints the key.
set -u
seat="${1:-arch1}"
if ! [[ "$seat" =~ ^[a-z0-9-]{2,16}$ ]]; then
  echo "usage: inbox-watch.sh [seat]" >&2
  exit 2
fi
interval="${INBOX_WATCH_INTERVAL:-60}"
: "${LIVE_URL:=https://bifrost.0xray.dev}"
: "${SEAT_KEYS_DIR:=$HOME/.burst/seat-keys}"
# The cursor folder rule is grok-bot/OP-PROC.md#cursor-folder. This overwrites a pre-set folder.
export LIVE_URL SEAT_KEYS_DIR
export LIVE_CURSORS="$HOME/.burst/cursors"
if [[ -n "${LIVE_INBOX:-}" ]]; then
  bin="$LIVE_INBOX"
else
  here="$(cd "$(dirname "$0")" && pwd)"
  case "$here" in
    */.burst/bin)
      bin="${XRAY_MAIN:?set XRAY_MAIN to the main checkout}/house/live/tools/live-inbox"
      ;;
    *)
      if [[ -x "$here/live-inbox" ]]; then
        bin="$here/live-inbox"
      else
        bin="${XRAY_MAIN:?set XRAY_MAIN to the main checkout}/house/live/tools/live-inbox"
      fi
      ;;
  esac
fi
last_err=""
last_out=""
had_work=0
n=0
max="${INBOX_WATCH_MAX:-0}"
while true; do
  errf="$(mktemp)"
  out="$("$bin" "$seat" 2>"$errf")"
  code=$?
  err="$(cat "$errf")"
  rm -f "$errf"
  if [[ "$code" -ne 0 ]]; then
    if [[ "$err" != "$last_err" ]]; then
      printf 'FAIL\n%s\n' "$err"
      last_err="$err"
    fi
  else
    last_err=""
    if [[ -n "$out" ]]; then
      if [[ "$out" != "$last_out" ]]; then
        printf 'ACTION_REQUIRED\n%s\n' "$out"
        last_out="$out"
      fi
      if [[ "$had_work" -eq 0 ]]; then
        "$bin" "$seat" --turn start --tag wake >/dev/null 2>&1 || true
        had_work=1
      fi
    else
      if [[ "$had_work" -eq 1 ]]; then
        "$bin" "$seat" --turn end >/dev/null 2>&1 || true
        had_work=0
      fi
      last_out=""
    fi
  fi
  n=$((n + 1))
  if [[ "${INBOX_WATCH_ONCE:-}" == "1" ]]; then
    break
  fi
  if [[ "$max" != "0" && "$n" -ge "$max" ]]; then
    break
  fi
  sleep "$interval"
done
