#!/usr/bin/env bash
# Assemble <dst>/collector from this repo: feed modules, inbox routing, committed roster/site json, and
# house/live-mesh/fetch_feed.py. One source of truth for deploy.sh and the build-guard test (#292).
# Usage: assemble-collector.sh <dst-dir>   (writes <dst-dir>/collector; keeps its README.md)
set -euo pipefail
APP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
FEED="$APP/../feed"
C="${1:?usage: assemble-collector.sh <dst-dir>}/collector"
mkdir -p "$C"
find "$C" -mindepth 1 -maxdepth 1 ! -name README.md -exec rm -rf {} +
[ -f "$C/README.md" ] || cp "$APP/collector/README.md" "$C/"
mkdir -p "$C/upstream" "$C/routing"
cp "$FEED"/live_mesh.py "$FEED"/live_collect.py "$FEED"/live_flow.py "$FEED"/live_fleet.py "$FEED"/push_payload.py "$FEED"/live_packet.py \
   "$FEED"/live_site.py "$FEED"/live_board.py "$FEED"/upstream.py "$FEED"/jira_source.py "$FEED"/deploy_status.py "$FEED"/host_poll.py "$C/"
cp "$APP/../../live-mesh/fetch_feed.py" "$C/upstream/"            # house/live-mesh in this repo
# server inbox routing (same rules as the box pusher): inbox_pass.py + routing/ beside it
cp "$FEED"/inbox_pass.py "$C/"
cp "$FEED"/routing/inbox.py "$FEED"/routing/board.py "$FEED"/routing/inbox-roles.json "$C/routing/"
# fleet roster + seat login map, and site mode (feed/site.json): committed, never hand-set Railway vars.
# Another install deletes or edits feed/site.json (no file = gated + masked); LIVE_PUBLIC=1|0 on the service still wins.
cp "$FEED"/fleet-roster.json "$FEED"/fleet-nodes.json "$FEED"/site.json "$C/"
