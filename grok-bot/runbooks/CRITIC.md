# Critic runbook: `bifrost check`

The reviewer's live pass is one command any fleet runs after it deploys: `house/live/tools/bifrost-check`.
It prints `PASS` / `FAIL` / `SKIP` per rule with the pack [OP-PROC](../OP-PROC.md) line it checks, and exits non-zero on any FAIL.
The output goes on the PR as the live-pass comment.

| Rule | What it proves | OP-PROC |
|---|---|---|
| routing | every seat routed; every route @-mentions the seat's real GitHub login (`fleet-nodes.json`), no nickname-only route | **Routing** |
| deliver-sim | an issue and an @-comment naming each seat route to that seat (the kit's router) | **Two loops** |
| edit-sim | a comment edited to add an @-mention routes exactly one line to the newly mentioned seat | **Two loops** |
| edit (live) | a real comment edited to add the seat's @-mention lands as one `…:edit:<handle>` line | **Two loops** |
| deliver (live) | a real issue and @-comment per seat, posted on `--repo`, land in that seat's inbox on `--target` | **Two loops** |
| nodes | every `fleet-nodes.json` bot login resolves on GitHub (users API); a 404 fails | **Routing** |
| resolve (live) | every routing-map login resolves on GitHub, as `--target`'s `GET /routing` reports | **Routing** |
| board-page (live) | the board page and `/healthz` answer 200, no server error | **Card** |
| board-cards (live) | every open issue/PR on `--repo` is exactly one card: none missing, none duplicated | **Card** |
| board-owner (live) | every open card's owner is a seat in the routing map | **Card** |
| addressed (live) | the test posts reach no seat they weren't addressed to (comment-watch / PR-head / issue_open watch seats excepted) | **Two loops** |
| ack (live) | one delivered line acks with the seat key, non-interactively; the running seat confirms no approval card | **Ack** |
| tripwire | an empty board and a stalled board each start the timed run once per window (`governor.mjs`) | **Tripwire** |
| nudge | a stuck line nudges its owner L1 -> L3, then wakes the coordinator once (kit server, local fake seats) | **Nudge** |
| lexicon | every bolded term in the pack OP-PROC and runbooks has a row in `grok-bot/LEXICON.md` | OP-PROC line 3 |
| names | docs and plates hold none of the stale phrases in `tools/bifrost-stale.json` | **Names** |

## Run
```
house/live/tools/bifrost-check --dry-run                                   # offline rules; prints the live plan, writes nothing
house/live/tools/bifrost-check --repo <org>/<sandbox> --target https://<bifrost-host>   # full pass after deploy
```
- Live writes go only to `--repo` (use a sandbox repo) and read/ack only on `--target`. Test issues are closed after (`--keep` leaves them).
- `gh` must be signed in as the checking seat's App, never a personal login. Seat keys come from `SEAT_KEYS_DIR` and are never printed.
- `--wait` (default 240 s) covers the collector's ~1 min poll. `--only rule,rule` runs a subset. `--seats` scopes the run (and the routing rule) to those seats. `--self-seat` (or `$BIFROST_SEAT`) marks the checking seat: its own delivery is SKIP unless `--alt-token-env` names another seat's token to post with.
- Tripwire and nudge run against the deployed commit's own code locally; emptying or stalling the production board is not done by the script.

- Seats with no GitHub login (`login: null`) are never posted as `@seat` (that handle belongs to someone else on GitHub); they are inner-loop only.
- A board-cards / board-owner FAIL marked *known* is today's per-agent board layout; it clears with the next-wave card restructure.

## Review steps
0. Wear the latest 0xray suit (re-wear via forge if behind). On wake read `.xray/state/STATION.md` (the ticket the station module writes; never hand-edit it), then `.xray/state/NOTES.md`, and resume. Write NOTES.md before a compact (the PreCompact hook only stamps its pickup line); never commit it. Neither file holds secrets: never keys, tokens or PEM text, only where a secret lives (its env var name). A STATION.md or NOTES.md holding a key, token or PEM text is a FAIL.
1. Before passing any routing-map change, look up every login through the GitHub users API (`curl https://api.github.com/users/<login>`). A 404 is a FAIL; #303 once passed with three fake logins.
2. The live pass needs a real issue and PR created on GitHub that land in the right seat's inbox. Test wakes alone don't count.
3. When a PR adds a rule that overlaps an existing one, name the pair in the review (it feeds the next **boil-up**).
4. Read the PR body's `Plates read:` field and note any gap (a plate for the touched area that is not listed) in the review. Not a gate: an empty field alone never fails a PR, there is no CI check, and critic blocks only if the diff contradicts a stamped plate.
5. `bifrost check` waits one collector poll before editing (`--edit-delay`, default poll + 5 s = 50 s), so call an edit line missing only after that poll.

A FAIL goes back on the wave with its OP-PROC line.

**Two hats:** a review rule the critic applies (or a check it runs by hand) is written into this runbook, OP-PROC or the lexicon, and becomes a `bifrost check` rule when it can; a chat-only rule counts as missing.
