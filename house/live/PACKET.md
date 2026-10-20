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

## Checks

`node --test` on `presence.test.mjs`, `page.test.mjs`, `board-folds.test.mjs`, `board-group.test.mjs`, `theme-colors.test.mjs`, and `kanban-board.test.mjs`. Playwright checks that the roster count is above 3, that the theme toggle is the rightmost header control, that a kanban click's detail matches the wave card, that those links look like links in light and dark, that the grouping control is right-aligned and narrower than its header, that in the dark theme a wave card's hover and open backgrounds both differ from the resting card, and that the band under the mesh is at most 24px.

## Turn state

Forge lit during a cloud run because `applyStoredActivity` treated every open turn as the seat's turn. On main, `house/live/app/server.mjs:2711` built the turn key with `kind === 'turn' ? '-'`, so the tag `bc-9748f0dc track` was discarded and the line shared `forge:turn:-`. The open-key loop at `server.mjs:2734` then set `fleet.working.forge`.

Critic lit because a running cloud row's seat is canonicalized, then stamped working. `house/live/app/server.mjs:292` sets `REVIEW` to `'critic'`, and `server.mjs:306` maps `reviewer: REVIEW`. `canonSeatToken` at `house/live/app/worktrack.mjs:39` resolves that alias. On main, `applyCloudOwners` at `worktrack.mjs:599` set that seat `working: true` and `working_via: 'cloud'`. The `bc-` tag is not parsed into a seat. `applyTrackWorking` at `server.mjs:1514` copied the same owner off an agent item.

A cloud turn (`bc-<id>` or `bc-<id> <track>`) now marks that agent on its own card and on the cloud-agent node. The posting seat stays idle unless its own turn is open (no `bc-` tag). A row seated `reviewer` does not light critic. A woken packet and a GitHub mark still light their seat.

## Wave card detail

`#486` (`c5874959e`) replaced the wave click. Before that, `house/live/app/public/index.html` set `wb.open[k]` and toggled `.open`, and `.wcard.open .wdetail` showed the timeline. On main `0965e9737` the listener calls `openFromCardKey`, and `openCardPop` fills the dialog without setting `wb.open`. `.wdetail` stays `display: none`, so the expanded timeline, links, packet, owner, and status never appear. Kanban still opens that dialog.

The wave click toggles `.open` again. `mountCardDetail` is the only renderer: the expanded wave card and the kanban dialog both receive the same card.

## Brief badge

The badge is `packet_ok === false`. `house/live/feed/live_board.py` set that from `missing = [f for f in ("acceptance", "next owner") if not pk.get(f)]` and then `packet_ok=not missing`. The packet dict comes only from the PR or issue body (`live_collect.card_fields` → `live_packet.parse`). An issue body has no packet, so all 36 issues on the live board were false. Packet card `#485` is born in `ensurePacketCard` (`house/live/app/server.mjs`) with `packet: {}` and `packet_ok: false`. PR `#493` names `PACKET.md` on the branch and the body parser returns `{}`. Release PR `#490` (`release(grok-bot): 0.1.11`, follow-up issue `#491`) has no packet. PR `#388` has neither a packet block nor `PACKET.md` on the branch, so it still needs a brief.

An issue, a packet card, a title that starts with `release`, a `packet:` alias, or a body or branch that carries a packet (`PACKET.md`, a packet heading, or `Packet:`) is `packet_ok` with an empty `missing` list. The collector records `packet_file` and checks `PACKET.md` at the pull head. A pull that has none of those still needs acceptance and next owner.

## Cloud card link

`boardCloudAgents` flagged `card missing` when both `card` and `pr` were empty (`house/live/app/worktrack.mjs`). It never read a turn tag or a `head_ref`. A `bc-<id> <track>` turn (`#485`, `485`, or `owner/repo#n`) and a branch or `head_ref` that contains the id now fill the card from the board. A finished agent whose pull URL is already set does not get the flag.
