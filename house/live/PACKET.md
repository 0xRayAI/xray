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

The badge is `packet_ok === false`. It used to come from `missing = [f for f in ("acceptance", "next owner") if not pk.get(f)]`. An issue body has no packet, so every issue on the live board was false. Packet card `#485` is born in `ensurePacketCard` (`house/live/app/server.mjs`). PR `#493` names `PACKET.md` on the branch. Release PR `#490` has no packet.

The badge stays only when the card is a packet PR (the title starts with `Packet`, or the alias is `packet:`) and `packet_file` is false. `packet_file` is the body carrying a packet or naming `PACKET.md`, or `PACKET.md` at the pull head. Docs `#388` (`docs: seek map…`, branch `cursor/seek-map-bfe6`) is not a packet PR and has no root `PACKET.md`. Hotfix `#500` (`fix(live): brief only packet PRs…`) is not a packet PR, and root `PACKET.md` is on `cursor/live-brief-ci-credit-69c9`. Neither shows the badge. A `Packet:` title with no file still does. Acceptance and next owner do not drive the badge.

## CI who

`put()` stores CI events with `from` `CI` and `to` `GitHub`. `credit_of` already writes the seat (`forge`, `Blaze`). `applyFeed` maps `CI` and `forge` onto the GitHub node, so the mesh source stays GitHub. The activity and history who label is `whoTag`: for `workflow_run`, `check_run`, `check_suite`, `ci_pass`, `ci_fail`, and `commit_status` it shows that credit. A credit of `github` or `CI` still reads `GITHUB`. A non-CI line from forge still reads `FORGE`.

## Cloud card link

`boardCloudAgents` flagged `card missing` when both `card` and `pr` were empty (`house/live/app/worktrack.mjs`). A `bc-<id> <track>` turn, a branch or `head_ref` that contains the id, and the card cell on `TRACKS.md` (`owner/repo#n` or `packet:…`) fill the card. The page renders that card as `.wbadge.cloud` with the GitHub href. A run with no pull and no named card shows `no card` and does not set the flag.
