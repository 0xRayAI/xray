#!/usr/bin/env bash
# Local tests (collector/adapter + Railway server), uses house/live-mesh/fetch_feed.py from this repo.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest tests/test_collect.py tests/test_flow_fleet.py tests/test_queue_seed.py tests/test_push.py tests/test_nochecks.py tests/test_restart_working.py tests/test_inbox_pass.py tests/test_board.py tests/test_nudges.py tests/test_ghost.py tests/test_upstream.py tests/test_host_board.py tests/test_install.py tests/test_fleet_seats.py
node --test tests/server.test.mjs tests/page.test.mjs tests/emitter.test.mjs tests/builder-cloud.test.mjs tests/presence.test.mjs tests/source.test.mjs tests/board-source.test.mjs tests/ingest-fleet-only.test.mjs
MESH_APP_DIR="$PWD/app" node --test tests/arch1.test.mjs tests/fleet-seats.test.mjs tests/collector-org.test.mjs tests/server-route.test.mjs
R=$(PYTHONDONTWRITEBYTECODE=1 python3 -B tests/route.py "$PWD/feed")
echo "$R"
printf '%s\n' "$R" | grep -qx "Arch1: deep review ask on #262 -> \['arch1', 'blinky'\]"
printf '%s\n' "$R" | grep -qx "Gate B run please -> \['arch1', 'blinky'\]"
printf '%s\n' "$R" | grep -qx "unrelated comment -> \['blinky'\]"
