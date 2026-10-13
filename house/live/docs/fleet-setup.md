# Fleet setup: mapping seats

Every file a new fleet edits to map its seats. Each section shows **ours** (Bifrost, 9 seats) beside the **kit default** a fresh install gets. Paths are under `house/live/`. Secrets never go in any of these files.

Seats (ours): blinky, critic, forge, mill, herald, magnet, nibbler, sound, arch1 (`feed/fleet-roster.json`).

## inbox-roles.json

`feed/routing/inbox-roles.json` is **our install's config: edit it in place**. The kit defaults other fleets copy live in `feed/routing/inbox.py` and stay untouched (it is vendored; see its header).

| Key | Ours | Kit default |
|---|---|---|
| `routes` (`seats` role rules) | reviewer off (pr_heads covers it); builder / tester / operator -> forge; coord -> blinky | role rules write to the sample roles (`builder`, `reviewer`, ...) |
| `extra_seats` | one block per seat: kinds / merge_bases / needles -> that seat (`inbox_pass.py`) | none |
| `mirror_seat` | `forge` | `builder` (`MIRROR_SEAT` in inbox.py) |
| `watcher_seats` | `[]` (Arch1's `live-inbox-watch` is an approved exception, run on Arch1's box, not a watcher seat here) | `[]` |
| `seats` roles | reviewer, builder, tester, operator, coord, each with `"seat"` or `"off"` | `{}` |
| `mentions` (`aliases`) | handle -> seat for our 9 (`Arch1` -> `arch1`, ...); @-mentions come from the collector's `mentions[]`, handles only | none |
| `fallback` | `{"seat": "blinky", "from": ["arch1"]}`: lines to seats outside our 9 are dropped and the event goes to blinky | none |
| `pr_heads`, `comment_watch` | critic + blinky per PR head; every comment -> blinky (+ PR author's seat) | none |

## routing/inbox.py kit defaults

`feed/routing/inbox.py` holds the kit defaults: `keep_days` 7, `stall_hours` 6, `seats` `{}`, `MIRROR_SEAT = "builder"`, inbox dir `$LIVE_HOME/run/fleet/inbox`. Do not edit it for a fleet; override in `inbox-roles.json`.

## fleet-nodes.json (Seat: credit)

`feed/fleet-nodes.json` maps a GitHub login to the seat credited for its events (ours: `forge0x1[bot]` -> forge, `critic0x[bot]` -> critic, `htafolla` / `Blaze0x1` -> Blaze, `github-actions[bot]` -> CI, ...). A commit's `Seat:` trailer credits that seat even when the author login is shared.

Precedence (`feed/live_collect.py`): `LIVE_NODE_MAP` env (JSON, set from this file) merges **over** the template `NODE` defaults; logins in neither are dropped, not published as Others. Kit default: no file, template `NODE` only. A later `LIVE_NODE_MAP` relabels stored events.

## fleet-roster.json

`feed/fleet-roster.json`: `seats` (who gets an inbox / key) and `board` (board columns). Ours: the 9 seats above. Kit default: no roster; the server uses `LIVE_FLEET_SEATS`, else the nodes in `LIVE_NODE_MAP` (`feed/live_fleet.py`).

## site.json

`feed/site.json`: `public`, `name`, `title`, `node`, `hosts`, `services`. Ours: public `true`, name `Bifrost`, all hosts `burst-live`. Kit default: no file (`LIVE_SITE_JSON` blank, brand `Example`, private).

## Avatars and fleet map images

- Ours: `site/public/site-config.js` (the overlay `app/deploy.sh` copies over the kit `public/`) sets seats, map positions (`L.SATS`, 920 x 400 canvas), colours, labels and `L.setAvatars({node: file})`.
- Images: `site/public/avatars/<file>.png`, square PNG, 96 x 96 (Blaze 128 x 128); drawn at about 46 px. Served from `public/avatars/` behind the login.
- How a node is picked (`app/public/index.html` `drawNode`): avatar image -> `L.MARK_PATH` vector -> `L.GLYPH` emoji -> drawn letter badge. A missing file falls back to the drawing.
- Kit default: `L.setAvatars({})`, no avatar files, template roles.

## Seat keys and SEAT_KEYS

Names only, never values.
- Box: one key file per seat in `$SEAT_KEYS_DIR` (default `/srv/live/run/secrets/seat-keys/<seat>.key`), made by `feed/seat_keys.sh`; seats from `SEAT_KEYS_SEATS` or `SEATS_JSON` (ours: the roster).
- Server: `SEAT_KEYS` env (JSON seat -> sha256 hash), published by `seat_keys.sh publish`.
- Kit default: the template seats.

## Emoji marks

How to draw each seat's mark: [draw-seat-emoji skill](../../../grok-bot/skills/draw-seat-emoji/SKILL.md).

## Stuck cards: nudge

The server raises a nudge in the card owner's inbox after 60 min with no real activity (no beat). Levels 1-3 escalate. Nudges go to blinky (was `coord`). Details: [board.md](board.md).

## Arch1

Two separate parts: [Suit and hooks](#suit-and-hooks) gate tool calls; the [Inbox watcher](#inbox-watcher) is the wake.

### Suit and hooks

Install per [GROK_GUIDE.md](../../../docs-site/docs/architecture/GROK_GUIDE.md) and [getting-started.md](../../../docs-site/docs/guides/getting-started.md), on the current release:

```sh
npm i -g 0xray
cd <checkout>
git checkout main && git pull --ff-only
0xray wear
0xray grok install --force
0xray pulse
# then restart Grok
```

Requires `node` on PATH, Grok CLI, and a git checkout.

| Event | Runs |
|---|---|
| Grok (all events) | `.grok/plugins/0xray/hooks/hooks.json` -> `node <global 0xray>/scripts/mjs/run-grok-hook.mjs` |
| PreToolUse | `pre-tool-use.js` |
| PostToolUse | `post-tool-use.js` |
| SessionStart / UserPromptSubmit / PreCompact / PostCompact | `session-start.js` (+ `--hook-event=...`) |

Env set by the hooks: `XRAY_ROOT=<checkout>`, `XRAY_AI_PATH=<global 0xray dir>` (e.g. `/opt/homebrew/lib/node_modules/0xray`).

Cursor runs `xray-cloud-hook.sh` (installed `/opt/homebrew/lib/node_modules/0xray/dist/integrations/cursor/hooks/xray-cloud-hook.sh`; worn copy `<project>/.cursor/hooks/xray-cloud-hook.sh`), then the same JS. It resolves the consumer `node_modules/0xray` dist, then a sibling checkout, then `XRAY_AI_PATH`, then the dogfood `src`; log `.xray/state/cursor-hook-invoke.log`. Grok CLI does not use that `.sh`.

**Known gap:** if `node` or the hook JS is missing, the Cursor runner fails **open** (allows the call).

Do not:
- Do not overwrite the product AGENTS.md (wear writes `AGENTS.md.0xray-new`; keep the product constitution).
- Do not commit `.xray/`, `.grok/`, `.cursor/`, `dist`, `.mcp.json`.
- Do not put AGENTS.md in `.gitignore`.
- Never copy the arch10x1 GitHub App key (`~/.config/usmail-github-app/private-key.pem`). That is the App's key, not the Grok suit.

Checks:
- `0xray pulse` says `WORN <current release>`.
- `0xray validate` passes.

### Inbox watcher

`bin/live-inbox-watch` polls Arch1's inbox and never acks; install steps in [inbox.md](inbox.md). A non-empty read is the work: the Grok turn that sees the lines handles them, posts the receipt, then acks. The watcher log is not a wake. It is an approved exception to the no-local-watchers rule, not the only one. Hooks above are a separate install: see [Suit and hooks](#suit-and-hooks).
