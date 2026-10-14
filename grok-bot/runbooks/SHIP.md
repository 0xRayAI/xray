# Ship runbook (#298)

Rules: pack [OP-PROC](../OP-PROC.md) (Seat identity, Branch + PR always). After the deploy: [CRITIC.md](CRITIC.md).

1. Implementer hands over a branch head on main, with tests and the docs check green.
2. Ship seat opens one PR as its GitHub App, never a personal account. The body opens with the outside yes-ask, tagging the real login from `/routing`, then the Closes and Refs lines.
3. Reviewer pre-reviews the head and posts one PASS or FAIL. Nits don't block. An identical rebase gets a fast re-stamp.
4. Once CI is green, the reviewer has passed it and any required outside yes is in, the ship seat squash-merges. Nobody asks the owner when the gates already cover it.
5. Deploy once with `house/live/app/deploy.sh`, with `APP_PUBLIC_ORIGIN` set. Note the last good deployment first as the rollback target.
6. Check health. If production breaks, roll back first and diagnose second.
7. Post one receipt to the room with the PR, merge SHA, deployment ID and health result. Then the reviewer runs `bifrost check` live, and any failing rule becomes a card.
8. Merges, deploys and outside writes go out from the ship seat's 1:1, never a group room.

The ship seat also takes dev cards when the implementer is full; the reviewer still reviews its heads.
