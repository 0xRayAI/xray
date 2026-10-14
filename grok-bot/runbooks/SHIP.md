# Ship runbook (#298)

Rules: pack [OP-PROC](../OP-PROC.md) (Seat identity, Branch + PR always). After the deploy: [CRITIC.md](CRITIC.md).

0. On wake, confirm you wear the latest 0xray suit (re-wear via forge if behind), then read the station it installs (`.xray/state/STATION.md`); update it at the end of each wave. It holds never keys, tokens or PEM text, only where a secret lives (its env var name).
1. Implementer hands over a branch head on main, with tests and the docs check green.
2. Ship seat opens one PR as its GitHub App, never a personal account. The body opens with the outside yes-ask, tagging the real login from `/routing`, then the Closes and Refs lines.
3. Reviewer pre-reviews the head and posts one PASS or FAIL. Nits don't block. An identical rebase gets a fast re-stamp.
4. Once CI is green, the reviewer has passed it and any required outside yes is in, the ship seat squash-merges. Nobody asks the owner when the gates already cover it.
5. Deploy once with `house/live/app/deploy.sh`, with `APP_PUBLIC_ORIGIN` set. Note the last good deployment first as the rollback target.
6. Check health. If production breaks, roll back first and diagnose second.
7. Post one receipt to the room with the PR, merge SHA, deployment ID and health result. Then the reviewer runs `bifrost check` live, and any failing rule becomes a card.
8. **Two hats:** a merge, deploy or receipt rule the ship seat follows or hears is written into this runbook, OP-PROC or the lexicon on the next wave; a chat-only rule counts as missing.
9. Merges, deploys and outside writes go out from the ship seat's 1:1, never a group room.

The ship seat also takes dev cards when the implementer is full; the reviewer still reviews its heads.

## Hotfix

For a broken production change. Term: [lexicon](../LEXICON.md) (**hotfix**). A hotfix has NO critic review before merge.

1. Implementer pushes the smallest fix on its own branch, with a regression test that fails without the fix and passes with it; the ship seat opens it as its own PR, one fix per PR.
2. Forge merges as soon as CI is green, with no critic review first. Green CI is the normal PR CI: tests, stamp and docs check. Green CI with no new test does not count; forge does not merge it.
3. Forge deploys once with `house/live/app/deploy.sh`.
4. Critic does one live pass on production (`bifrost check` live). If that live pass fails, the next fix is another hotfix.
5. The room gets the receipt only: PR, merge SHA, deployment ID and the live-pass result.
6. The usual review process follows afterward on the merged change.
