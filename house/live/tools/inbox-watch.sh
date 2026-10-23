#!/usr/bin/env bash
# Poll live-inbox <seat> (default arch1) every 60s.
# FAIL once per distinct error. The line names LIVE_URL and the expected URL, then backs off.
# A JSON line whose GitHub item is closed or merged is acked and logged as auto-ack.
# A held line (hold label, or a card whose state is held) prints once as "held: N".
# Every poll with open, non-held lines prints ACTION_REQUIRED and those lines.
# live-inbox <seat> --turn start --tag wake when that printed work first appears.
# live-inbox <seat> --turn end once the inbox is empty again.
# Never prints the key. A gh miss, or a failed ack, leaves the line open.
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
class_py="$(mktemp)"
cat > "$class_py" << 'PY'
import json, os, re, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

seat = sys.argv[1]
lines_path = Path(sys.argv[2])
out_dir = Path(sys.argv[3])
REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
ID_RE = re.compile(r"^[^\s\x1f]{1,300}$")


def hold_names():
    raw = os.environ.get("GITHUB_HOLD_LABEL")
    if raw is None:
        names = ["on-hold"]
    else:
        names = [part.strip() for part in raw.split(",") if part.strip()]
    return {name.casefold() for name in names}


def parse_line(raw):
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return obj if isinstance(obj, dict) else None


def split_gh(text):
    parts = text.split("\t")
    state = (parts[0] if parts else "").strip().casefold()
    merged = (parts[1] if len(parts) > 1 else "").strip().casefold()
    labels = []
    if len(parts) > 2:
        labels = [part.strip() for part in parts[2].split(",") if part.strip()]
    if not state and not merged and not labels:
        return None
    return state, merged, labels


def run_hook(cmd, repo, number):
    try:
        proc = subprocess.run([cmd, repo, str(number)], capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if proc.returncode != 0:
        return None
    return proc.stdout


def gh_lookup(hook, repo, number):
    if hook:
        text = run_hook(hook, repo, number)
        if text is None:
            return None
        return split_gh(text)
    try:
        proc = subprocess.run(
            ["gh", "api", "repos/%s/issues/%s" % (repo, number),
             "--jq", '[.state, (if (.pull_request.merged // false) then "merged" else "" end), ((.labels // []) | map(.name) | join(","))] | @tsv'],
            capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if proc.returncode != 0:
        return None
    return split_gh(proc.stdout)


def load_cards():
    keys = os.environ.get("SEAT_KEYS_DIR", "").strip()
    base = os.environ.get("LIVE_URL", "").strip().rstrip("/")
    if not keys or not base:
        return {}
    path = Path(keys).expanduser() / ("%s.key" % seat)
    try:
        token = path.read_text().strip()
    except OSError:
        return {}
    if not token:
        return {}
    req = urllib.request.Request(
        base + "/cards?seat=" + urllib.parse.quote(seat),
        headers={"Authorization": "Bearer " + token})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode())
    except Exception:
        return {}
    found = {}
    cards = data.get("cards") if isinstance(data, dict) else None
    if not isinstance(cards, list):
        return {}
    for card in cards:
        if not isinstance(card, dict):
            continue
        repo = str(card.get("repo") or "").strip()
        number = card.get("number")
        if not repo or not isinstance(number, int):
            continue
        found[(repo.casefold(), number)] = str(card.get("state") or "").strip().casefold()
    return found


def card_state(hook, index, repo, number):
    if hook:
        text = run_hook(hook, repo, number)
        if text is None:
            return ""
        return text.strip().casefold()
    if index is None:
        return ""
    return index.get((repo.casefold(), number), "")


def main():
    hook_gh = os.environ.get("INBOX_WATCH_GH", "").strip()
    hook_card = os.environ.get("INBOX_WATCH_CARD", "").strip()
    wanted = hold_names()
    index = None
    cache = {}
    open_out = []
    held = []
    closed = []
    for raw in lines_path.read_text().splitlines():
        if not raw:
            continue
        obj = parse_line(raw)
        if obj is None:
            open_out.append(raw)
            continue
        repo = str(obj.get("repo") or "").strip()
        number = obj.get("number")
        if isinstance(number, str) and number.isdigit():
            number = int(number)
        ident = obj.get("id")
        ident_ok = isinstance(ident, str) and bool(ID_RE.match(ident))
        if not REPO_RE.match(repo) or not isinstance(number, int) or number < 1 or number > 9999999:
            open_out.append(raw)
            continue
        key = (repo.casefold(), number)
        if key not in cache:
            cache[key] = gh_lookup(hook_gh, repo, number)
        looked = cache[key]
        if looked is None:
            open_out.append(raw)
            continue
        state, merged, labels = looked
        if state in ("closed", "merged") or merged == "merged":
            if ident_ok:
                closed.append(ident + "\x1f" + raw)
            else:
                open_out.append(raw)
            continue
        held_label = any(label.casefold() in wanted for label in labels)
        if not held_label:
            if hook_card:
                state_card = card_state(hook_card, None, repo, number)
            else:
                if index is None:
                    index = load_cards()
                state_card = card_state("", index, repo, number)
        else:
            state_card = ""
        if held_label or state_card == "held":
            if ident_ok:
                held.append(ident)
            else:
                open_out.append(raw)
            continue
        open_out.append(raw)
    (out_dir / "open").write_text("".join(line + "\n" for line in open_out))
    (out_dir / "held").write_text("".join(line + "\n" for line in held))
    (out_dir / "closed").write_text("".join(line + "\n" for line in closed))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(1)
PY
trap 'rm -f "$class_py"' EXIT
last_err=""
last_held=""
had_work=0
n=0
max="${INBOX_WATCH_MAX:-0}"
started="$(date +%Y-%m-%dT%H:%M:%S%z)"
fail_sleep="$interval"
while true; do
  errf="$(mktemp)"
  out="$("$bin" "$seat" 2>"$errf")"
  code=$?
  err="$(cat "$errf")"
  rm -f "$errf"
  if [[ "$code" -ne 0 ]]; then
    if [[ "$err" != "$last_err" ]]; then
      printf 'FAIL\nLIVE_URL=%s expected=https://bifrost.0xray.dev\n%s\n' "$LIVE_URL" "$err"
      last_err="$err"
      fail_sleep="$interval"
    fi
    sleep_for="$fail_sleep"
    if [[ "$interval" -ne 0 ]]; then
      fail_sleep=$((fail_sleep * 2))
      if [[ "$fail_sleep" -gt 180 ]]; then
        fail_sleep=180
      fi
    fi
  else
    last_err=""
    fail_sleep="$interval"
    state_file="${INBOX_WATCH_STATE:-$HOME/.burst/inbox-watch.state}"
    pid_file="${INBOX_WATCH_PID:-$HOME/.burst/inbox-watch.pid}"
    mkdir -p "$(dirname "$state_file")" "$(dirname "$pid_file")"
    printf 'pid=%s\nstarted=%s\nlast_ok=%s\nlive_url=%s\nscript=house/live/tools/inbox-watch.sh\n' "$$" "$started" "$(date +%Y-%m-%dT%H:%M:%S%z)" "$LIVE_URL" > "$state_file"
    printf '%s\n' "$$" > "$pid_file"
    showed=0
    if [[ -n "$out" ]]; then
      dir="$(mktemp -d)" || exit 1
      printf '%s\n' "$out" > "$dir/lines"
      if python3 "$class_py" "$seat" "$dir/lines" "$dir"; then
        if [[ -s "$dir/closed" ]]; then
          while IFS= read -r rec || [[ -n "$rec" ]]; do
            [[ -z "$rec" ]] && continue
            id="${rec%%$'\x1f'*}"
            raw="${rec#*$'\x1f'}"
            if [[ "$id" == "$rec" || -z "$id" ]]; then
              printf '%s\n' "$rec" >> "$dir/open"
              continue
            fi
            if "$bin" "$seat" --ack "$id" >/dev/null 2>&1; then
              printf 'auto-ack %s\n' "$id"
            else
              printf '%s\n' "$raw" >> "$dir/open"
            fi
          done < "$dir/closed"
        fi
        if [[ -s "$dir/open" ]]; then
          printf 'ACTION_REQUIRED\n'
          cat "$dir/open"
          showed=1
        fi
        held_key=""
        held_n=0
        if [[ -s "$dir/held" ]]; then
          held_key="$(sort -u "$dir/held" | awk 'NF{printf "%s%s", sep, $0; sep=","}')"
          held_n="$(sort -u "$dir/held" | awk 'NF{n++} END{print n+0}')"
        fi
        if [[ -n "$held_key" && "$held_key" != "$last_held" ]]; then
          printf 'held: %s\n' "$held_n"
          last_held="$held_key"
          showed=1
        elif [[ -z "$held_key" ]]; then
          last_held=""
        fi
      else
        printf 'ACTION_REQUIRED\n%s\n' "$out"
        showed=1
      fi
      rm -rf "$dir"
      if [[ "$showed" -eq 1 && "$had_work" -eq 0 ]]; then
        "$bin" "$seat" --turn start --tag wake >/dev/null 2>&1 || true
        had_work=1
      fi
    else
      if [[ "$had_work" -eq 1 ]]; then
        "$bin" "$seat" --turn end >/dev/null 2>&1 || true
        had_work=0
      fi
      last_held=""
    fi
  fi
  if [[ "$code" -eq 0 ]]; then
    sleep_for="$interval"
  fi
  n=$((n + 1))
  if [[ "${INBOX_WATCH_ONCE:-}" == "1" ]]; then
    break
  fi
  if [[ "$max" != "0" && "$n" -ge "$max" ]]; then
    break
  fi
  sleep "$sleep_for"
done
