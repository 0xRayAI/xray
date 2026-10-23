# collector/ (assembled, not committed)

Only this README is committed. `assemble-collector.sh` (run by `deploy.sh`) fills this folder with the feed
modules and `house/live-mesh/fetch_feed.py`. The Dockerfile refuses to build when it is not assembled, so a
Railway build straight from git fails loudly instead of shipping a dead board. Deploy only via `deploy.sh`.
The collector writes the feed under `$MESH_DATA_DIR` (default `/data`). Railway mounts that volume as root at container start. A build-time chown of `/data` does not survive that mount. `docker-entrypoint.sh` chowns the directory and drops to the image `node` user (#580).
