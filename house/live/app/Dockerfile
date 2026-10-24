# live-mesh: Node server + the read-only GitHub collector (python3 stdlib only; tzdata for zoneinfo)
# Railway root-mounts the volume at container start. A build-time chown of /data
# does not survive that mount (#580). No USER here: this image stays root only
# until docker-entrypoint.sh chowns the data dir and drops to the image node user.
FROM node:24.22.1-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 tzdata ca-certificates gosu \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json server.mjs feed-read-worker.mjs presence.mjs source.mjs archive.mjs origin.mjs routes.mjs governor.mjs arch1-launch.mjs worktrack.mjs handoff.mjs wave-schedule.mjs bifrost-waves.json chicago-stamp.mjs pr-batch.mjs wake-gate.mjs ./
COPY public ./public
COPY collector ./collector
# deploy.sh writes this one-line file from the house config name:. LIVE_OWNER overrides it.
COPY owner-name ./owner-name
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod 0755 docker-entrypoint.sh
# collector/ is assembled by deploy.sh (assemble-collector.sh); only its README is in git (#292)
RUN test -f collector/upstream/fetch_feed.py && test -f collector/live_mesh.py || { \
      echo "ERROR: collector/ is not assembled. Deploy only via house/live/app/deploy.sh (see collector/README.md)." >&2; exit 1; }
ENV NODE_ENV=production TZ=America/Chicago
# railway.json startCommand is this script. Railway replaces ENTRYPOINT, so a
# start command of `node server.mjs` would skip the chown (#580).
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.mjs"]
