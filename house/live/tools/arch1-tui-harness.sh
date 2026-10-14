#!/usr/bin/env bash
# Install the local TUI runtimes and run the 0xRay .cjs/.mjs harnesses.
# One log names the xray commit and, per runtime, the installed version and pass/fail.
# The checkout is the public 0xRayAI/xray repo. Nothing here is pushed upstream.
# Usage: tools/arch1-tui-harness.sh [--list] [--log PATH]
set -uo pipefail

XRAY_REPO="${XRAY_REPO:-https://github.com/0xRayAI/xray.git}"
XRAY_REF="${XRAY_REF:-main}"
WORK="${ARCH1_HARNESS_WORK:-/tmp/arch1-tui-harness}"
LOG="${ARCH1_HARNESS_LOG:-$WORK/harness.log}"
HARNESS_TIMEOUT="${ARCH1_HARNESS_TIMEOUT:-1200}"
RED=0

# Confirmed on 0xRayAI/xray main. There is no scripts/test/test-cursor-e2e.mjs.
# Cursor's .cjs harnesses are wear/unwear. suit-all is invoked with --install
# because its default only verifies bridges that are not worn yet.
# Fields: runtime|path|extra args
HARNESS_ROWS=(
  "opencode|scripts/test/test-opencode-e2e.mjs|"
  "openclaw|scripts/test/test-openclaw-e2e.mjs|"
  "hermes|scripts/test/test-hermes-e2e.mjs|"
  "grok|scripts/test/test-grok-cli-e2e.mjs|"
  "plugins|scripts/test/validate-plugins-e2e.cjs|"
  "repertoire|scripts/test/test-repertoire-organ-isolated.mjs|"
  "framework|scripts/test/test-unified-framework.mjs|"
  "suit-all|vendor/@0xray/repertoire/scripts/confirm-suit-all.mjs|--install"
  "opencode-suit|vendor/@0xray/repertoire/scripts/verify-opencode-suit.mjs|"
  "openclaw-suit|vendor/@0xray/repertoire/scripts/verify-openclaw-suit.mjs|"
  "hermes-suit|vendor/@0xray/repertoire/scripts/verify-hermes-suit.mjs|"
  "grok-suit|vendor/@0xray/repertoire/scripts/verify-grok-suit.mjs|"
  "grok-harness|vendor/@0xray/repertoire/scripts/confirm-suit-harness.mjs|"
  "cursor|scripts/node/wear-cursor-hooks.cjs|"
  "cursor|scripts/node/unwear-cursor-hooks.cjs|"
)

redact_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  sed -E -i \
    -e 's#x-access-token:[^@[:space:]]+#x-access-token:[redacted]#g' \
    -e 's#gh[pousr]_[A-Za-z0-9_]+#[redacted]#g' \
    -e 's#github_pat_[A-Za-z0-9_]+#[redacted]#g' \
    -e 's#xai-[A-Za-z0-9_-]+#[redacted]#g' \
    -e 's#sk-[A-Za-z0-9_-]+#[redacted]#g' \
    -e 's#(api[_-]?key|token|secret|authorization|bearer)[=:][^[:space:]]+#\1=[redacted]#Ig' \
    -e 's#(auth token found \()[^)]+#\1[redacted]#g' \
    "$file" || true
}

say() { printf '%s\n' "$*" | tee -a "$LOG"; }

mark_fail() { RED=$((RED + 1)); }

exit_result() {
  local red="${1:-$RED}"
  if [ "$red" -gt 0 ]; then
    say "result: fail $red"
    return 1
  fi
  say "result: pass"
  return 0
}

list_harness() {
  printf '%s\n' "xray repo: $XRAY_REPO ref: $XRAY_REF"
  printf '%s\n' "runtime|harness|args"
  local row runtime path extra
  for row in "${HARNESS_ROWS[@]}"; do
    runtime="${row%%|*}"
    extra="${row#*|*|}"
    path="${row#*|}"
    path="${path%%|*}"
    printf '%s|%s|%s\n' "$runtime" "$path" "$extra"
  done
}

# Allowlist. env -u would still hand BIFROST_KEY and any other parent secret to installers.
clean_env() {
  local -a keep=()
  local name
  for name in PATH HOME USER LOGNAME SHELL TERM LANG LC_ALL LC_CTYPE TMPDIR TMP TEMP \
    http_proxy https_proxy HTTP_PROXY HTTPS_PROXY no_proxy NO_PROXY \
    npm_config_cache NODE_PATH \
    XRAY_REPO XRAY_REF XRAY_SHA ARCH1_HARNESS_WORK ARCH1_HARNESS_LOG ARCH1_HARNESS_TIMEOUT
  do
    if [ -n "${!name+x}" ]; then
      keep+=("$name=${!name}")
    fi
  done
  env -i "${keep[@]}" "$@"
}

path_refresh() {
  local dir candidate
  for dir in "$HOME/.local/bin" "$HOME/.opencode/bin" "$HOME/.grok/bin" "$HOME/.hermes/bin" "$HOME/.openclaw/bin"; do
    [ -d "$dir" ] && export PATH="$dir:$PATH"
  done
  for candidate in \
    "$HOME/.opencode/bin/opencode" \
    "$HOME/.local/bin/opencode" \
    "$HOME/.openclaw/bin/openclaw" \
    "$HOME/.local/bin/openclaw" \
    "$HOME/.hermes/bin/hermes" \
    "$HOME/.local/bin/hermes" \
    "$HOME/.grok/bin/grok" \
    "$HOME/.local/bin/grok" \
    "$HOME/.local/bin/agent" \
    "$HOME/.local/bin/cursor-agent"
  do
    if [ -x "$candidate" ]; then
      export PATH="$(dirname "$candidate"):$PATH"
    fi
  done
}

search_bin() {
  local name="$1" root hit
  shift
  command -v "$name" >/dev/null 2>&1 && return 0
  for root in "$@"; do
    [ -d "$root" ] || continue
    hit="$(find "$root" -maxdepth 5 -type f -name "$name" -perm -111 2>/dev/null | head -n 1 || true)"
    if [ -n "$hit" ]; then
      export PATH="$(dirname "$hit"):$PATH"
      say "found $name at $hit"
      return 0
    fi
  done
  return 1
}

run_in() {
  local seconds="$1" outfile="$2" workdir="$3"
  shift 3
  (
    cd "$workdir" || exit 97
    clean_env timeout "$seconds" "$@"
  ) >"$outfile" 2>&1
  local code=$?
  redact_file "$outfile"
  return "$code"
}

version_of() {
  local bin="$1" out
  if ! command -v "$bin" >/dev/null 2>&1; then
    printf '%s' "not-installed"
    return 0
  fi
  out="$(clean_env "$bin" --version 2>&1 | head -n 1 | tr -d '\r' || true)"
  printf '%s' "$out" | sed -E 's#(api[_-]?key|token|secret)[=:][^[:space:]]+#\1=[redacted]#Ig'
}

tail_note() {
  local label="$1" outfile="$2"
  [ -f "$outfile" ] || return 0
  say "$label: $(tail -n 8 "$outfile" | tr '\n' ' ' | cut -c 1-500)"
}

rollback_runtime() {
  local name="$1"
  case "$name" in
    opencode)
      rm -rf "$HOME/.opencode"
      rm -f "$HOME/.local/bin/opencode"
      ;;
    openclaw)
      rm -rf "$HOME/.openclaw"
      rm -f "$HOME/.local/bin/openclaw"
      ;;
    hermes)
      rm -rf "$HOME/.hermes"
      rm -f "$HOME/.local/bin/hermes" "$HOME/.hermes/bin/hermes"
      ;;
    grok)
      rm -rf "$HOME/.grok"
      rm -f "$HOME/.local/bin/grok"
      ;;
    cursor-agent|cursor)
      rm -f "$HOME/.local/bin/agent" "$HOME/.local/bin/cursor-agent"
      ;;
    *)
      return 1
      ;;
  esac
}

fail_install() {
  local name="$1" code="${2:-1}"
  rollback_runtime "$name"
  mark_fail
  say "install $name: failed exit $code"
}

# Fresh tree every run. A reused checkout can still be a stale commit.
replace_checkout() {
  local dest="$1" url="$2" sha="${3:-}"
  rm -rf "$dest"
  mkdir -p "$(dirname "$dest")"
  clean_env git clone --filter=blob:none "$url" "$dest" >&2 || return 1
  clean_env git -C "$dest" remote set-url origin "$url" >&2 || return 1
  if [ -n "$sha" ]; then
    if ! git -C "$dest" cat-file -e "${sha}^{commit}" 2>/dev/null; then
      clean_env git -C "$dest" fetch --filter=blob:none origin "$sha" >&2 || return 1
    fi
    clean_env git -C "$dest" checkout --detach --force "$sha" >&2 || return 1
  else
    clean_env git -C "$dest" fetch --filter=blob:none origin "${XRAY_REF:-main}" >&2 || return 1
    clean_env git -C "$dest" checkout --detach --force "origin/${XRAY_REF:-main}" >&2 || return 1
  fi
  clean_env git -C "$dest" clean -fdx >&2 || return 1
  git -C "$dest" rev-parse HEAD
}

install_one() {
  local name="$1" seconds="$2" bin="$3" url="$4"
  shift 4
  local out="$WORK/logs/install-${name}.log" code
  say "install $name: start ($url)"
  run_in "$seconds" "$out" "$WORK" bash -c 'set -o pipefail; curl -fsSL "$1" | bash -s -- "${@:2}"' bash "$url" "$@"
  code=$?
  if [ "$code" -ne 0 ]; then
    fail_install "$name" "$code"
    tail_note "install $name" "$out"
    return 0
  fi
  path_refresh
  search_bin "$bin" "$HOME/.local" "$HOME/.$name" "$HOME/.hermes" "$HOME/.openclaw" "$HOME/.grok" "$HOME/.opencode" || true
  if ! command -v "$bin" >/dev/null 2>&1; then
    fail_install "$name" "$code"
    tail_note "install $name" "$out"
    return 0
  fi
  say "install $name: ok ($(command -v "$bin")) exit $code"
}

prepare_openclaw() {
  local status_log="$WORK/logs/openclaw-gateway-status.log" i
  if ! command -v openclaw >/dev/null 2>&1; then
    say "openclaw note: binary missing after install-cli.sh. This VM's Node is $(node -v). OpenClaw documents Node 24.16+ or 26.1+. The installer is supposed to bring its own runtime under ~/.openclaw."
    return 0
  fi
  say "openclaw note: CLI is installed. Onboard is non-interactive with auth skipped. No provider API key is set. systemd user services are not available here, so the gateway is a foreground process."
  say "openclaw onboard: non-interactive, auth skipped, no provider key"
  if run_in 180 "$WORK/logs/openclaw-onboard.log" "$WORK" openclaw onboard --non-interactive --accept-risk --auth-choice skip --skip-channels --skip-skills --skip-search --skip-ui --skip-hooks --gateway-auth token --gateway-bind loopback --no-install-daemon --suppress-gateway-token-output; then
    say "openclaw onboard: ok"
  else
    say "openclaw onboard: failed"
    tail_note "openclaw onboard" "$WORK/logs/openclaw-onboard.log"
  fi
  if run_in 30 "$status_log" "$WORK" openclaw gateway status && grep -q "Connectivity probe: ok" "$status_log"; then
    say "openclaw gateway: listening on loopback"
    return 0
  fi
  say "openclaw gateway: starting openclaw gateway run"
  clean_env openclaw gateway run >"$WORK/logs/openclaw-gateway-run.log" 2>&1 &
  printf '%s\n' "$!" >"$WORK/openclaw-gateway.pid"
  i=0
  while [ "$i" -lt 15 ]; do
    i=$((i + 1))
    sleep 2
    if run_in 20 "$status_log" "$WORK" openclaw gateway status && grep -q "Connectivity probe: ok" "$status_log"; then
      say "openclaw gateway: listening on loopback"
      return 0
    fi
  done
  say "openclaw gateway: not listening. The e2e harness exits without that WebSocket."
  tail_note "openclaw gateway" "$status_log"
}

prepare_hermes_plugin() {
  say "hermes plugin: install from this xray commit (e2e prerequisite)"
  if [ ! -f "$XRAY/dist/cli/index.js" ]; then
    say "hermes plugin: skipped, dist/cli/index.js missing"
    mark_fail
    return 0
  fi
  if run_in 180 "$WORK/logs/hermes-plugin.log" "$XRAY" node "$XRAY/dist/cli/index.js" hermes install --force; then
    say "hermes plugin: ok"
  else
    say "hermes plugin: failed"
    tail_note "hermes plugin" "$WORK/logs/hermes-plugin.log"
    mark_fail
  fi
}

fail_suit_prep() {
  local rep="$1" why="${2:-failed}"
  rm -rf "$rep/node_modules"
  mark_fail
  say "suit consumer: $why"
}

prepare_suit_consumer() {
  local pack_log="$WORK/logs/npm-pack.log" inst_log="$WORK/logs/suit-consumer.log" tarball
  local rep="$XRAY/vendor/@0xray/repertoire" consumer="$WORK/suit-consumer"
  say "suit consumer: pack this commit and install it where the suit scripts look up 0xray"
  if [ ! -d "$rep" ]; then
    fail_suit_prep "$rep" "repertoire directory missing"
    return 0
  fi
  rm -rf "$rep/node_modules"
  if ! run_in 180 "$pack_log" "$XRAY" npm pack --ignore-scripts; then
    fail_suit_prep "$rep" "npm pack failed"
    tail_note "npm pack" "$pack_log"
    return 0
  fi
  tarball="$(ls -1t "$XRAY"/0xray-*.tgz 2>/dev/null | head -n 1 || true)"
  if [ -z "$tarball" ]; then
    fail_suit_prep "$rep" "tarball missing"
    return 0
  fi
  # npm install --prefix into the repertoire package hits an npm arborist crash
  # (edgesOut). A fresh consumer install, then a node_modules link, is the same layout.
  # --ignore-scripts keeps the packed postinstall from seeing the parent environment.
  rm -rf "$consumer"
  mkdir -p "$consumer"
  printf '%s\n' '{"name":"suit-consumer","version":"1.0.0","private":true}' >"$consumer/package.json"
  if ! run_in 300 "$inst_log" "$consumer" npm install --ignore-scripts --no-audit --no-fund "$tarball"; then
    fail_suit_prep "$rep" "npm install failed"
    tail_note "suit consumer" "$inst_log"
    return 0
  fi
  if [ ! -f "$consumer/node_modules/0xray/scripts/node/bridge-mcp-wiring.cjs" ]; then
    fail_suit_prep "$rep" "bridge-mcp-wiring.cjs missing from the packed install"
    return 0
  fi
  rm -rf "$rep/node_modules"
  ln -s "$consumer/node_modules" "$rep/node_modules"
  say "suit consumer: ok $(basename "$tarball")"
}

timeout_for() {
  case "$1" in
    plugins) printf '%s' 2700 ;;
    framework) printf '%s' 2400 ;;
    suit-all) printf '%s' 1800 ;;
    *) printf '%s' "$HARNESS_TIMEOUT" ;;
  esac
}

run_cursor_hooks() {
  local wear_log="$WORK/logs/cursor-wear.log" unwear_log="$WORK/logs/cursor-unwear.log"
  local dir code
  if [ ! -f "$XRAY/scripts/node/wear-cursor-hooks.cjs" ] || [ ! -f "$XRAY/scripts/node/unwear-cursor-hooks.cjs" ]; then
    say "harness cursor wear-cursor-hooks.cjs: missing"
    say "harness cursor unwear-cursor-hooks.cjs: missing"
    mark_fail
    mark_fail
    return 0
  fi
  dir="$(mktemp -d "$WORK/cursor-XXXX")"
  git -C "$dir" init -q
  git -C "$dir" config user.email "harness@example.com"
  git -C "$dir" config user.name "Harness"
  : >"$dir/README.md"
  git -C "$dir" add README.md
  git -C "$dir" commit -qm "harness"
  if run_in 180 "$wear_log" "$XRAY" node "$XRAY/scripts/node/wear-cursor-hooks.cjs" "$dir"; then
    say "harness cursor wear-cursor-hooks.cjs: pass"
  else
    code=$?
    say "harness cursor wear-cursor-hooks.cjs: fail exit $code"
    tail_note "cursor wear" "$wear_log"
    mark_fail
  fi
  if run_in 180 "$unwear_log" "$XRAY" node "$XRAY/scripts/node/unwear-cursor-hooks.cjs" "$dir"; then
    say "harness cursor unwear-cursor-hooks.cjs: pass"
  else
    code=$?
    say "harness cursor unwear-cursor-hooks.cjs: fail exit $code"
    tail_note "cursor unwear" "$unwear_log"
    mark_fail
  fi
  rm -rf "$dir"
}

run_cursor_units() {
  local list="$WORK/logs/cursor-unit-files.txt" outfile="$WORK/logs/cursor-units.log" rel code
  : >"$list"
  if [ -d "$XRAY/src" ]; then
    find "$XRAY/src" -path '*__tests__*' -name 'cursor*.test.ts' | sort >"$list"
  fi
  if [ ! -s "$list" ]; then
    say "cursor unit tests: none found (TypeScript tests, separate from the .cjs harness)"
    return 0
  fi
  say "cursor unit tests: $(paste -sd, "$list")"
  local args=()
  while IFS= read -r rel; do
    args+=("${rel#"$XRAY"/}")
  done <"$list"
  if run_in 900 "$outfile" "$XRAY" npx --no-install vitest run "${args[@]}"; then
    say "harness cursor unit: pass"
  else
    code=$?
    if [ "$code" -eq 124 ]; then
      say "harness cursor unit: fail timeout 900s"
    else
      say "harness cursor unit: fail exit $code"
    fi
    tail_note "cursor unit" "$outfile"
    mark_fail
  fi
}

run_one() {
  local runtime="$1" rel="$2" extra="$3" base outfile code seconds workdir
  base="$(basename "$rel")"
  outfile="$WORK/logs/${runtime}-${base}.log"
  if [ "$runtime" = "cursor" ]; then
    return 0
  fi
  if [ ! -f "$XRAY/$rel" ]; then
    say "harness $runtime $rel: missing"
    mark_fail
    return 0
  fi
  seconds="$(timeout_for "$runtime")"
  workdir="$XRAY"
  case "$rel" in
    vendor/@0xray/repertoire/*) workdir="$XRAY/vendor/@0xray/repertoire" ;;
  esac
  if [ -n "$extra" ]; then
    say "run $runtime $rel $extra"
  else
    say "run $runtime $rel"
  fi
  if [ -n "$extra" ]; then
    # shellcheck disable=SC2086
    run_in "$seconds" "$outfile" "$workdir" node "$XRAY/$rel" $extra
  else
    run_in "$seconds" "$outfile" "$workdir" node "$XRAY/$rel"
  fi
  code=$?
  if [ "$code" -eq 0 ]; then
    say "harness $runtime $base: pass"
  elif [ "$code" -eq 124 ]; then
    say "harness $runtime $base: fail timeout ${seconds}s"
    mark_fail
  else
    say "harness $runtime $base: fail exit $code"
    mark_fail
  fi
  tail_note "harness $runtime $base tail" "$outfile"
}

main() {
  if [ "${1:-}" = "--log" ]; then
    LOG="$2"
    shift 2
  fi

  mkdir -p "$WORK" "$(dirname "$LOG")" "$WORK/logs"
  : >"$LOG"

  safe_repo="$(printf '%s' "$XRAY_REPO" | sed -E 's#x-access-token:[^@]+#x-access-token:[redacted]#g')"
  case "$XRAY_REPO" in
    https://github.com/0xRayAI/xray|https://github.com/0xRayAI/xray.git) ;;
    *)
      say "refusing checkout of $safe_repo"
      say "this runner only clones the public 0xRayAI/xray repo"
      exit 2
      ;;
  esac

  say "ARCH1 TUI harness run"
  say "started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  say "host: $(uname -srm)"
  say "node: $(node -v 2>/dev/null || echo missing) npm: $(npm -v 2>/dev/null || echo missing)"
  say "CI is not passed to children, so the Grok harness does not skip its user-level install"
  say "parent credentials are not passed to installer or harness processes"

  XRAY="$WORK/xray"
  local pinned="${XRAY_SHA:-}"
  if ! XRAY_SHA="$(replace_checkout "$XRAY" "https://github.com/0xRayAI/xray.git" "$pinned")"; then
    say "checkout failed"
    mark_fail
    exit_result || exit 1
  fi
  say "xray commit: $XRAY_SHA"
  say "xray subject: $(git -C "$XRAY" log -1 --format=%s)"
  say "xray version: $(node -e 'const fs=require("fs"); process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).version)' "$XRAY/package.json" 2>/dev/null || echo unknown)"

  install_one opencode 300 opencode "https://opencode.ai/install"
  install_one openclaw 900 openclaw "https://openclaw.ai/install-cli.sh" --no-onboard
  install_one hermes 1800 hermes "https://hermes-agent.nousresearch.com/install.sh" --non-interactive --skip-browser --skip-computer-use
  install_one grok 300 grok "https://x.ai/cli/install.sh"
  install_one cursor-agent 300 agent "https://cursor.com/install"
  path_refresh
  if ! command -v agent >/dev/null 2>&1; then
    search_bin cursor-agent "$HOME/.local" "$HOME/.cursor" || true
  fi

  say "version opencode: $(version_of opencode)"
  say "version openclaw: $(version_of openclaw)"
  say "version hermes: $(version_of hermes)"
  say "version grok: $(version_of grok)"
  say "version agent: $(version_of agent)"
  say "version cursor-agent: $(version_of cursor-agent)"

  say "opencode note: installer is https://opencode.ai/install (v1 CLI; the harness calls opencode run). v2 is a different CLI and is not installed."
  prepare_openclaw
  if command -v hermes >/dev/null 2>&1; then
    say "hermes note: CLI is installed. No HERMES_API_KEY or XAI_API_KEY is set. The harness skips LLM-dependent tests when those are absent and still runs the CLI checks."
  else
    say "hermes note: binary missing. The CLI installer is https://hermes-agent.nousresearch.com/install.sh with --non-interactive --skip-browser --skip-computer-use. No API key is set."
  fi
  if command -v grok >/dev/null 2>&1; then
    say "grok note: CLI is installed. grok --version does not need a login. Headless grok login needs XAI_API_KEY, which this run does not set."
  else
    say "grok note: binary missing. The installer is https://x.ai/cli/install.sh. No XAI_API_KEY is set."
  fi
  say "cursor note: there is no scripts/test/test-cursor-e2e.mjs. The .cjs harnesses are scripts/node/wear-cursor-hooks.cjs and unwear-cursor-hooks.cjs. This VM has no Cursor desktop GUI. The headless CLI is the agent binary from https://cursor.com/install."

  say "xray npm install"
  if run_in 900 "$WORK/logs/npm-install.log" "$XRAY" npm install --no-audit --no-fund --prefix "$XRAY"; then
    say "xray npm install: ok"
  else
    say "xray npm install: failed"
    tail_note "npm install" "$WORK/logs/npm-install.log"
    mark_fail
  fi
  say "xray npm run build"
  if run_in 900 "$WORK/logs/npm-build.log" "$XRAY" npm run build --prefix "$XRAY"; then
    say "xray build: ok"
  else
    say "xray build: failed"
    tail_note "npm build" "$WORK/logs/npm-build.log"
    mark_fail
  fi
  prepare_hermes_plugin
  prepare_suit_consumer

  run_cursor_hooks
  run_cursor_units
  local row extra path
  for row in "${HARNESS_ROWS[@]}"; do
    extra="${row#*|*|}"
    path="${row#*|}"
    path="${path%%|*}"
    run_one "${row%%|*}" "$path" "$extra"
  done

  say "finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  say "log: $LOG"
  redact_file "$LOG"
  exit_result || exit 1
}

if [ "${1:-}" = "--list" ]; then
  list_harness
  exit 0
fi
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
