---
name: setup-house
description: use this when a team has no house/ folder yet
---

# Set up a house

The operating page is the same for every team. Your house is who you are, where you post, and what you allow.

1. Run `grok-bot house init`. It copies `templates/house/` into `./house`, including `watchers/` and `fleet/`, and refuses if a target file already exists. The board is `house/WAVEBOARD.md` when `LIVE_URL` is unset, and Bifrost (`GET /cards`) when `LIVE_URL` is set. Read `house/ATTENTION_STATE.md` in either case. The copied `bifrost-waves.json` is an empty wave list. If the board is still `ops/WAVEBOARD.md`, or an existing HOUSE.md has no Cadence section, run `grok-bot house init --migrate`. That moves the board to `house/WAVEBOARD.md`, starts `ATTENTION_STATE.md` and any missing watcher or fleet files, appends the template Cadence block when HOUSE.md lacks it, and leaves a file you already changed (including a ledger). When both boards exist and `house/WAVEBOARD.md` is not the untouched template, migrate exits 1 and writes nothing.
2. Fill HOUSE.md from what the owner has already said. Ask the owner only for what's missing, one question at a time. Set `name:` to the owner name and `OP-PROC:` to the procedure file (`grok-bot/OP-PROC.md` unless the house has an overlay). Delete the Cadence section if this house has no code loop. Otherwise name the four watcher owners and set the stall thresholds. ROLE-MAP.md is an optional roster (role, seat name, agent id). Leave it blank until you have ids. The label and the BOOT line live under that table.
3. Show the owner the filled HOUSE.md. Nothing in Allowed counts until they approve it. Paste the same Ask first and Allow lines into AUTO-REVIEW.md. That file is the only house file that enforces them.
4. Run `grok-bot doctor` until it passes. A HOUSE.md line that is exactly `wallet off` skips Open Wallet, Clearing, and hangar pay steps.
5. Tell every seat to read `house/` on its next wake. Each new seat runs `seat-label` in its own chat, then uses `~/bin/gh-<seat>` instead of plain `gh`. Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --turn end --tag "bc-<first8>"`. `--from owner` is required today. Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`. History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.

Change the house when the owner says a rule twice. Don't put rules there that belong on the operating page.
