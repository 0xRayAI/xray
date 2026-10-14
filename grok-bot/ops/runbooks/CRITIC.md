# Critic runbook: `bifrost check`

The reviewer's live pass is one command any fleet runs after it deploys: `house/live/tools/bifrost-check`.
It prints `PASS` / `FAIL` / `SKIP` per rule with the pack [OP-PROC](../../OP-PROC.md) line it checks, and exits non-zero on any FAIL.
The output goes on the PR as the live-pass comment.

| Rule | What it proves | OP-PROC |
|---|---|---|
| routing | every seat routed; every route @-mentions the seat's real GitHub login (`fleet-nodes.json`), no nickname-only route | **Routing** |
| deliver-sim | an issue and an @-comment naming each seat route to that seat (the kit's router) | **Two loops** |
| deliver (live) | a real issue and @-comment per seat, posted on `--repo`, land in that seat's inbox on `--target` | **Two loops** |
| resolve (live) | every routing-map login resolves on GitHub, as `--target`'s `GET /routing` reports | **Routing** |
| ack (live) | one delivered line acks with the seat key, non-interactively; the running seat confirms no approval card | **Ack** |
| tripwire | an empty board and a stalled board each start the timed run once per window (`governor.mjs`) | **Tripwire** |
| nudge | a stuck line nudges its owner L1 -> L3, then wakes the coordinator once (kit server, local fake seats) | **Nudge** |
| names | docs and plates hold none of the stale phrases in `tools/bifrost-stale.json` | **Names** |

## Run
```
house/live/tools/bifrost-check --dry-run                                   # offline rules; prints the live plan, writes nothing
house/live/tools/bifrost-check --repo <org>/<sandbox> --target https://<bifrost-host>   # full pass after deploy
```
- Live writes go only to `--repo` (use a sandbox repo) and read/ack only on `--target`. Test issues are closed after (`--keep` leaves them).
- `gh` must be signed in as the checking seat's App, never a personal login. Seat keys come from `SEAT_KEYS_DIR` and are never printed.
- `--wait` (default 240 s) covers the collector's ~1 min poll. `--only rule,rule` runs a subset. `--seats` overrides the roster.
- Tripwire and nudge run against the deployed commit's own code locally; emptying or stalling the production board is not done by the script.

A FAIL goes back on the lap with its OP-PROC line.
