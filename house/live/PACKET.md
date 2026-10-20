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

## Grouping control

`#cardGroup` sits in the Cards header bar, on the right, sized to the words "By agent". It is a transparent menu item: no border, a hover wash, and teal text while agent grouping is on. `bifrost-card-group` in localStorage is unchanged.

## Card hover and open

Wave cards use `--card-hover` and `--card-open`. Dark lifts the card from `#0b1120` to `#1a2744` on hover and `#243656` when it is open. Light uses `#e7eef8` and `#d5e2f4`. The title row uses those same fills.

## Mesh gap

`#agentPing` sits under the mesh and above the kanban. It stays hidden while it has no content, so it takes no height. The kanban fills the column under the mesh instead of leaving the board's 720px row empty on the left. A later sign-in card can append into `#agentPing` and the slot shows itself.

## Links

Kanban, wave, and activity anchors that have an `href` use the focus color, an underline, a pointer, and a teal hover. Both themes already define `--focus` and `--teal`.

## Brief badge and CI who

`needs a brief` is only a packet PR that has no acceptance or next owner. Issues never show it. A packet card does not. A PR shows it when the title, a `packet:` alias, or a packet field from the body says it is a packet, and acceptance or next owner is empty. Beat evidence alone is not a brief.

A cloud row with no card and no PR is `card missing`. TRACKS, a PR body that names the bc id, or the head branch links the row. The row then carries `.wbadge.cloud` and the GitHub link.

A CI row's `from` is the seat of its actor or its app. `forge0x1[bot]` is forge. `cursor[bot]` stays GitHub. Stored rows already marked GitHub or CI are rewritten the same way. The #492 reclaim only rewrote `Others`.

## Checks

`node --test` on `presence.test.mjs`, `page.test.mjs`, `board-folds.test.mjs`, `board-group.test.mjs`, `theme-colors.test.mjs`, `kanban-board.test.mjs`, `ci-credit.test.mjs`, and `cloud-board.test.mjs`. `python3 -m unittest` on the live brief fixture and the stored CI seat fixture. Playwright checks that the roster count is above 3, that the theme toggle is the rightmost header control, that a kanban click's detail matches the wave card, that those links look like links in light and dark, that the grouping control is right-aligned and narrower than its header, that in the dark theme a wave card's hover and open backgrounds both differ from the resting card, and that the band under the mesh is at most 24px.
