#!/usr/bin/env bash
# Deploy app/ to one Railway service. The only supported deploy: a Railway build straight from git has no
# assembled collector/ and the Dockerfile refuses it (#292).
# LIVE_RAILWAY_PROJECT (default burst-live), LIVE_RAILWAY_SERVICE (default burst-live),
# MESH_APP_DEPLOY_DIR (default /srv/live/deploy). LIVE_PUBLIC_OVERLAY, when set, is a directory
# copied onto public/ after the kit files (live-config.js, avatars). Secret files in the deploy dir stay.
set -euo pipefail
PROJECT="${LIVE_RAILWAY_PROJECT:-burst-live}"; SERVICE="${LIVE_RAILWAY_SERVICE:-burst-live}"
APP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
DST="${MESH_APP_DEPLOY_DIR:-/srv/live/deploy}"
ENVN="${LIVE_RAILWAY_ENVIRONMENT:-production}"
if [ ! -d "$DST" ]; then   # fresh machine: create and link the deploy dir instead of stopping
  mkdir -p "$DST" && (cd "$DST" && railway link --project "$PROJECT" --service "$SERVICE" --environment "$ENVN" >/dev/null) \
    || { echo "deploy dir $DST missing and railway link failed (log in with the railway CLI first)" >&2; exit 1; }
fi
[ "$(cd "$DST" && pwd -P)" = "$APP" ] || {
  cp "$APP"/server.mjs "$APP"/feed-read-worker.mjs "$APP"/presence.mjs "$APP"/source.mjs "$APP"/archive.mjs "$APP"/origin.mjs "$APP"/routes.mjs "$APP"/governor.mjs "$APP"/arch1-launch.mjs "$APP"/worktrack.mjs "$APP"/handoff.mjs "$APP"/wave-schedule.mjs "$APP"/bifrost-waves.json "$APP"/chicago-stamp.mjs "$APP"/pr-batch.mjs "$APP"/wake-gate.mjs "$APP"/package.json "$APP"/railway.json "$APP"/.railwayignore "$APP"/Dockerfile "$APP"/docker-entrypoint.sh "$DST"/
  rm -rf "$DST/public.new"; cp -r "$APP/public" "$DST/public.new"; rm -rf "$DST/public"; mv "$DST/public.new" "$DST/public"
  # our install's committed page overlay (seats, nodes, avatars, favicon); another install has no house/live/site/
  if [ -d "$APP/../site/public" ]; then cp -a "$APP/../site/public"/. "$DST/public/"; fi
  if [ -n "${LIVE_PUBLIC_OVERLAY:-}" ]; then
    [ -d "$LIVE_PUBLIC_OVERLAY" ] || { echo "LIVE_PUBLIC_OVERLAY is not a directory" >&2; exit 1; }
    cp -a "$LIVE_PUBLIC_OVERLAY"/. "$DST/public/"
  fi
  if [ -d "$APP/.railway" ]; then rm -rf "$DST/.railway"; cp -a "$APP/.railway" "$DST/.railway"; fi
}
# collector/ = the feed modules + house/live-mesh/fetch_feed.py, assembled at deploy time (only its README is committed)
"$APP/assemble-collector.sh" "$DST"
# MESH_SEED_STORE=1 (one-time, first volume deploy): ship the box collector's store as collector/seed/ (the server
# copies it onto the volume only where no file exists yet). Scanned for token / key patterns first.
if [ "${MESH_SEED_STORE:-0}" = 1 ]; then
  RUNF="${MESH_RUN:-/srv/live/run}/feed"; mkdir -p "$DST/collector/seed/store"
  cp "$RUNF"/store/*.json "$DST/collector/seed/store/"
  cp "$RUNF/health-state.json" "$DST/collector/seed/"
  if grep -rEq 'gh[spou]_[A-Za-z0-9]{20,}|github_pat_|BEGIN [A-Z ]*PRIVATE' "$DST/collector/seed"; then
    rm -rf "$DST/collector/seed"; echo "seed holds a token-like string; refusing" >&2; exit 1; fi
  echo "seed: $(du -sh "$DST/collector/seed" | cut -f1) (one-time)"
fi
# One line, the house config name:. Empty when that line is missing, so the image COPY still succeeds.
HOUSE_FILE=""
if [ -n "${HOUSE:-}" ] && [ -f "$HOUSE" ]; then
  HOUSE_FILE="$HOUSE"
elif [ -f "$APP/../../HOUSE.md" ]; then
  HOUSE_FILE="$APP/../../HOUSE.md"
fi
owner_name=""
if [ -n "$HOUSE_FILE" ]; then
  owner_name="$("$APP/owner-name.sh" "$HOUSE_FILE" || true)"
fi
if [[ "$owner_name" =~ ^[A-Za-z0-9\ ._:@#+/-]{1,40}$ ]]; then
  printf '%s\n' "$owner_name" > "$DST/owner-name"
else
  : > "$DST/owner-name"
fi
cd "$DST"
st="$(railway status 2>/dev/null || true)"; grep -q "$PROJECT" <<<"$st" || { echo "deploy dir is not linked to $PROJECT; refusing" >&2; exit 1; }
railway up --service "$SERVICE" --detach
echo "check: railway deployment list --service $SERVICE   (expect SUCCESS)"
