#!/bin/sh
# Tiny host-invoke probe. Logs spawn before the Cursor hook script runs.
# Does not change gate / Station behavior.
set -eu
ROOT="${XRAY_AI_PATH:-.}"
STATE="${ROOT}/.xray/state"
mkdir -p "$STATE"
EVENT="${XRAY_HOOK_EVENT:-unknown}"
NODE_BIN="$(command -v node 2>/dev/null || true)"
{
  printf 'ts=%s event=%s cwd=%s node=%s\n' "$(date -Iseconds)" "$EVENT" "$PWD" "${NODE_BIN:-MISSING}"
} >> "${STATE}/cursor-hook-invoke.log" 2>/dev/null || true
export XRAY_AI_PATH="$ROOT"
if [ -z "$NODE_BIN" ]; then
  printf '{"permission":"allow","user_message":"invoke-probe: node missing"}\n'
  exit 0
fi
exec "$NODE_BIN" "$@"
