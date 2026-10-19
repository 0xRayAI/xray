# live-mesh: Node server + the read-only GitHub collector (python3 stdlib only; tzdata for zoneinfo)
FROM node:20-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 tzdata ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json server.mjs presence.mjs source.mjs archive.mjs origin.mjs routes.mjs governor.mjs arch1-launch.mjs worktrack.mjs handoff.mjs wave-schedule.mjs ./
COPY public ./public
COPY collector ./collector
# collector/ is assembled by deploy.sh (assemble-collector.sh); only its README is in git (#292)
RUN test -f collector/upstream/fetch_feed.py && test -f collector/live_mesh.py || { \
      echo "ERROR: collector/ is not assembled. Deploy only via house/live/app/deploy.sh (see collector/README.md)." >&2; exit 1; }
ENV NODE_ENV=production TZ=America/Chicago
CMD ["node", "server.mjs"]
