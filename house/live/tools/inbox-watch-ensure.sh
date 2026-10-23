#!/usr/bin/env bash
# One inbox watcher. Restart when the pid is gone or last_ok is older than three polls.
# Never prints a key. Does not start a second copy while that pid is alive and fresh.
set -u
seat="${1:-arch1}"
if ! [[ "$seat" =~ ^[a-z0-9-]{2,16}$ ]]; then
  echo "usage: inbox-watch-ensure.sh [seat]" >&2
  exit 2
fi
interval="${INBOX_WATCH_INTERVAL:-60}"
case "$interval" in
  ''|*[!0-9]*) echo "inbox-watch-ensure: interval must be whole seconds" >&2; exit 2 ;;
esac
state="${INBOX_WATCH_STATE:-$HOME/.burst/inbox-watch.state}"
pid_file="${INBOX_WATCH_PID:-$HOME/.burst/inbox-watch.pid}"
here="$(cd "$(dirname "$0")" && pwd)"
script="${INBOX_WATCH_BIN:-$here/inbox-watch.sh}"
log="${INBOX_WATCH_LOG:-$HOME/.burst/inbox-watch.log}"
: "${LIVE_URL:=https://bifrost.0xray.dev}"
: "${SEAT_KEYS_DIR:=$HOME/.burst/seat-keys}"
export LIVE_URL SEAT_KEYS_DIR
export LIVE_CURSORS="${LIVE_CURSORS:-$HOME/.burst/cursors}"

decision="$(python3 - "$state" "$pid_file" "$interval" "$script" << 'PY'
import os, subprocess, sys
from datetime import datetime, timezone

state, pid_file, interval_s, script = sys.argv[1:5]
interval = int(interval_s)

def load(path):
    data = {}
    try:
        text = open(path, encoding="utf-8").read()
    except OSError:
        return data
    for line in text.splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip()
    return data

def parse_ts(raw):
    if not raw:
        return None
    text = raw
    if len(text) >= 5 and text[-5] in "+-" and text[-3] != ":":
        text = text[:-2] + ":" + text[-2:]
    try:
        stamp = datetime.fromisoformat(text)
    except ValueError:
        return None
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=datetime.now().astimezone().tzinfo)
    return stamp

def command_of(pid):
    try:
        proc = subprocess.run(
            ["ps", "-p", str(pid), "-o", "command="],
            capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.TimeoutExpired):
        return ""
    if proc.returncode != 0:
        return ""
    return proc.stdout.strip()

data = load(state)
raw = ""
try:
    raw = open(pid_file, encoding="utf-8").read().strip()
except OSError:
    raw = data.get("pid", "")
pid = int(raw) if raw.isdigit() else 0
ours = False
if pid > 0:
    try:
        os.kill(pid, 0)
    except OSError:
        pid = 0
if pid > 0:
    cmd = command_of(pid)
    base = os.path.basename(script)
    ours = bool(cmd) and (base in cmd or "inbox-watch.sh" in cmd)
last = parse_ts(data.get("last_ok", ""))
if interval == 0:
    fresh = last is not None
else:
    age = None if last is None else (datetime.now(timezone.utc) - last.astimezone(timezone.utc)).total_seconds()
    fresh = age is not None and age <= interval * 3
if ours and fresh:
    print("ok")
elif ours:
    print("restart %s" % pid)
else:
    print("start")
PY
)"

case "$decision" in
  ok)
    exit 0
    ;;
  "restart "*)
    old="${decision#restart }"
    kill -TERM "$old" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if ! kill -0 "$old" 2>/dev/null; then
        break
      fi
      sleep 0.2
    done
    ;;
  start)
    ;;
  *)
    printf 'inbox-watch-ensure: bad decision\n' >&2
    exit 1
    ;;
esac

mkdir -p "$(dirname "$state")" "$(dirname "$pid_file")" "$(dirname "$log")"
if [[ "${INBOX_WATCH_ENSURE_DRY:-}" == "1" ]]; then
  printf 'watcher restart\n'
  exit 0
fi
nohup "$script" "$seat" >>"$log" 2>&1 &
new=$!
disown "$new" 2>/dev/null || true
now="$(date +%Y-%m-%dT%H:%M:%S%z)"
started="$now"
if [[ -f "$state" ]]; then
  old_started="$(awk -F= '$1=="started"{print substr($0, index($0, "=")+1); exit}' "$state")"
  if [[ -n "$old_started" ]]; then
    started="$old_started"
  fi
fi
printf 'pid=%s\nstarted=%s\nlast_ok=%s\nlive_url=%s\nscript=house/live/tools/inbox-watch.sh\n' "$new" "$started" "$now" "$LIVE_URL" > "$state"
printf '%s\n' "$new" > "$pid_file"
printf 'watcher restarted pid %s\n' "$new"
