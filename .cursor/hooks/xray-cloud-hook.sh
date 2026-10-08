#!/bin/sh
# Cloud-safe Cursor hook runner. Command in hooks.json must be a relative path.
# Do not put env-assignment in hooks.json — Cloud execs argv[0] without a shell.
#
# Resolution order (first existing file wins):
# 1. Consumer install. Walk upward from this script's directory, then from cwd.
#    Use node_modules/0xray/dist/integrations/cursor/hooks/${JS}.
#    Skip a directory whose package.json "name" is "0xray" (the factory repo).
#    That keeps dogfood on src/ and prefers a consumer install over a parent src/.
# 2. Sibling ${JS} when this runner lives under node_modules/0xray (installed dist).
# 3. XRAY_AI_PATH, if set: src then dist (explicit mill, dogfood path shape).
# 4. Dogfood repo source: cwd/src, cwd/../xray/src, cwd/repos/xray/src,
#    ${CURSOR_PROJECT_DIR}/repos/xray/src, then those roots' dist/, then
#    cwd/node_modules/0xray (dist then src).
# Consumer wear points hooks.json at the installed dist *.sh so step 1/2 run
# even when Cursor's cwd is a parent factory checkout.
set -eu

EVENT="${1:-preToolUse}"
JS="${2:-pre-tool-use.js}"
MILL=""
REL=""

pick_mill() {
  mill="$1"
  rel="$2"
  if [ -n "$mill" ] && [ -f "${mill}/${rel}" ]; then
    MILL="$mill"
    REL="$rel"
    return 0
  fi
  return 1
}

is_xray_package() {
  pkg="$1/package.json"
  [ -f "$pkg" ] || return 1
  grep -q '"name"[[:space:]]*:[[:space:]]*"0xray"' "$pkg" 2>/dev/null || return 1
  return 0
}

pick_consumer_from() {
  dir="$1"
  [ -n "$dir" ] || return 1
  while [ -n "$dir" ]; do
    if ! is_xray_package "$dir"; then
      if pick_mill "$dir/node_modules/0xray" "dist/integrations/cursor/hooks/${JS}"; then
        return 0
      fi
    fi
    parent="$(dirname -- "$dir")"
    if [ "$parent" = "$dir" ]; then
      break
    fi
    dir="$parent"
  done
  return 1
}

HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

pick_consumer_from "$HERE" || pick_consumer_from "$(pwd)" || true

if [ -z "$MILL" ]; then
  case "$HERE" in
    */node_modules/0xray/*)
      pick_mill "$HERE" "${JS}" || true
      ;;
  esac
fi

if [ -z "$MILL" ] && [ -n "${XRAY_AI_PATH:-}" ]; then
  pick_mill "${XRAY_AI_PATH}" "src/integrations/cursor/hooks/${JS}" || \
    pick_mill "${XRAY_AI_PATH}" "dist/integrations/cursor/hooks/${JS}" || true
fi

if [ -z "$MILL" ]; then
  pick_mill "$(pwd)" "src/integrations/cursor/hooks/${JS}" || \
    pick_mill "$(pwd)/../xray" "src/integrations/cursor/hooks/${JS}" || \
    pick_mill "$(pwd)/repos/xray" "src/integrations/cursor/hooks/${JS}" || \
    pick_mill "${CURSOR_PROJECT_DIR:-}/repos/xray" "src/integrations/cursor/hooks/${JS}" || \
    pick_mill "$(pwd)" "dist/integrations/cursor/hooks/${JS}" || \
    pick_mill "$(pwd)/node_modules/0xray" "dist/integrations/cursor/hooks/${JS}" || \
    pick_mill "$(pwd)/node_modules/0xray" "src/integrations/cursor/hooks/${JS}" || true
fi

if [ -n "$MILL" ] && [ -d "$MILL" ]; then
  MILL="$(cd "$MILL" && pwd)"
fi

JS_ABS=""
if [ -n "$MILL" ] && [ -n "$REL" ] && [ -f "${MILL}/${REL}" ]; then
  JS_ABS="$(CDPATH= cd -- "$(dirname -- "${MILL}/${REL}")" && pwd)/$(basename -- "${REL}")"
fi

NODE_BIN="$(command -v node 2>/dev/null || true)"

log_invoke() {
  dest="$1"
  mkdir -p "${dest}/.xray/state" 2>/dev/null || true
  {
    printf 'ts=%s event=%s cwd=%s mill=%s node=%s js=%s\n' \
      "$(date -Iseconds)" "$EVENT" "$(pwd)" "${MILL:-MISSING}" "${NODE_BIN:-MISSING}" "${JS_ABS:-MISSING}"
  } >> "${dest}/.xray/state/cursor-hook-invoke.log" 2>/dev/null || true
}

log_invoke "$(pwd)"
if [ -n "$MILL" ]; then
  log_invoke "$MILL"
fi

if [ -z "$NODE_BIN" ] || [ -z "$MILL" ] || [ ! -f "${MILL}/${REL}" ]; then
  printf '{"permission":"allow","user_message":"xray-cloud-hook: mill missing — fail open"}\n'
  exit 0
fi

export XRAY_HOOK_EVENT="$EVENT"
export XRAY_AI_PATH="$MILL"
export XRAY_ROOT="${XRAY_ROOT:-$(pwd)}"
exec "$NODE_BIN" "${MILL}/${REL}"
