# Packet: live roster, theme toggle

## Root cause

The roster chips are the three-name strip in `house/live/site/public/site-config.js` (the `STRIP` assignment and the `L.AGENTS` / `L.SEAT_NAMES` replace). `house/live/app/public/index.html` paints that list once and does not read the feed.

On Railway, `LIVE_FLEET_SEATS` and `LIVE_NODE_MAP` are set. The live feed `seats` is the collector board: `house/live/feed/live_mesh.py` sets `ff.SEATS` from `live_fleet.BOARD_SEATS`. That board is mill, forge, critic, and blinky. `fleet.seats` is wider. The strip still wins, so the page shows blinky, critic, and forge.

#476 drew the role on each chip and left status on the dot. #473 (`b061c3271`) then cut the strip from four seats to three, and `house/live/tests/board-folds.test.mjs` locked the count at 3. The chip face from #476 stayed. The seat list regressed.

A short `board` array is the counted header, not the roster. Invalid `LIVE_FLEET_SEATS` used to fall through to the kit default in the collector. The page never consulted either source.

## Fix

`configuredRoster` in `house/live/app/presence.mjs` unions a valid `LIVE_FLEET_SEATS` value with every committed `fleet-roster.json` `seats` list. A `board` subset is used only when that source has no `seats`. When no seat list exists, the node map supplies the names and rails stay off. The server writes `roster` and `roster_roles` on the feed header. The page paints those chips. The overlay no longer installs a fixed strip.

The theme toggle is the last control in the header title row, pushed to the far right.

## Kanban detail

A kanban click and a wave click both call `openCardPop`. That used to fill `#cardPop` from a second field list. The wave card builds its detail with `mountCardDetail`. The dialog now mounts that same function into `#cardPopDetail`, so the timeline, the GitHub issue or pull request link, the linked `bc-` agent link, the packet, the owner, and the status are one render.

## Links

Kanban, wave, and activity anchors that have an `href` use the focus color, an underline, a pointer, and a teal hover. Both themes already define `--focus` and `--teal`.

## Checks

`node --test` on `presence.test.mjs`, `page.test.mjs`, `board-folds.test.mjs`, `theme-colors.test.mjs`, and `kanban-board.test.mjs`. Playwright checks that the roster count is above 3, that the toggle is the rightmost header control, that a kanban click's detail matches the wave card, and that those links look like links in light and dark.
