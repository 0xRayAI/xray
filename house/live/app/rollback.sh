#!/usr/bin/env bash
# Restore one burst-live deployment by id.
# `railway down` removes the latest deployment. It is not a rollback.
# `railway redeploy` rebuilds the latest deployment only. It takes no id.
# List ids: railway deployment list --service burst-live --environment production --json
# Then: house/live/app/rollback.sh <deployment-id>
set -euo pipefail
ID="${1:-}"
if [[ ! "$ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
  echo "usage: rollback.sh <deployment-id>" >&2
  echo "list: railway deployment list --service burst-live --environment production --json" >&2
  exit 2
fi
exec python3 - "$ID" <<'PY'
import json, os, sys, urllib.request
from pathlib import Path

API = os.environ.get("RAILWAY_API_URL", "https://backboard.railway.com/graphql/v2")
QUERY = "mutation($id: String!) { deploymentRollback(id: $id) }"


def token():
    env = os.environ.get("RAILWAY_TOKEN", "").strip()
    if len(env) > 20:
        return env
    path = Path.home() / ".railway" / "config.json"
    try:
        user = json.loads(path.read_text()).get("user") or {}
    except (OSError, ValueError):
        return ""
    if not isinstance(user, dict):
        return ""
    for key in ("accessToken", "token"):
        val = user.get(key)
        if isinstance(val, str) and len(val) > 20:
            return val
    return ""


def main():
    deployment = sys.argv[1]
    auth = token()
    if not auth:
        print("rollback: no Railway token", file=sys.stderr)
        return 1
    body = json.dumps({"query": QUERY, "variables": {"id": deployment}}).encode()
    req = urllib.request.Request(API, data=body, method="POST", headers={
        "Content-Type": "application/json",
        "User-Agent": "bifrost-rollback",
        "Authorization": "Bearer " + auth,
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            payload = json.loads(res.read().decode())
    except Exception as ex:  # noqa: BLE001
        print(f"rollback: {type(ex).__name__}", file=sys.stderr)
        return 1
    errors = payload.get("errors") if isinstance(payload, dict) else None
    if errors:
        msg = errors[0].get("message") if isinstance(errors[0], dict) else "graphql"
        print(f"rollback: {msg}", file=sys.stderr)
        return 1
    data = (payload or {}).get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict) or data.get("deploymentRollback") is not True:
        print("rollback: not accepted", file=sys.stderr)
        return 1
    print(f"rollback accepted {deployment}")
    return 0


sys.exit(main())
PY
