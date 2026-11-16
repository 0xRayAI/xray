---
name: bifrost
description: >
  Read the bifrost lens. Use when the live board or the nudge path is the page.
---

# bifrost

The plate is `docs-site/docs/plates/bifrost.md`. The server is `house/live/app/server.mjs`.

1. `evalNudges` is the nudge path.
2. Tripwire minutes default to 30.
3. A cloud agent is a board row.
4. `LIVE_URL` chooses the collector board or the hand-kept waveboard. The seat doctor reads that variable.
5. The plate that stays with this lens is house.
6. A cloud agent records the board with `node house/live/tools/record-board-replay.mjs --from <CT ISO> --to now --secs 30`. `--secs` is 15 to 30. `--theme` defaults to dark. The command cache-busts https://bifrost.0xray.dev/, serves this repo's current board files on that URL, waits for the live feed, sets `#speed` from the window length, and replays activity only. Seat nodes stay. Artifacts are `/opt/cursor/artifacts/board-replay.mp4` and `/opt/cursor/artifacts/board-replay-mid.png`.
