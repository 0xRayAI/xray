# Ship runbook (#298)

Rules: pack [OP-PROC](../OP-PROC.md) (Seat identity, Branch + PR always). After the deploy: [CRITIC.md](CRITIC.md).

0. On a wake, follow [Station boot](../OP-PROC.md#station-boot).
1. Implementer hands over a branch head on main, with tests and the docs check green.
2. The PR body carries the template's `Plates read:` field as the implementer filled it; critic reads it and notes gaps. Not a gate: an empty field alone never fails a PR, there is no CI check, and critic blocks only if the diff contradicts a stamped plate. Ship seat opens one PR as its GitHub App, never a personal account. The body opens with the outside yes-ask, tagging the real login from `/routing`, then the Closes and Refs lines.
3. Reviewer pre-reviews the head and posts one PASS or FAIL. Nits don't block. An identical rebase gets a fast re-stamp.
4. The ship seat squash-merges when the reviewer has passed and the gates for the tier are in. Green CI alone does not merge. A hotfix is the one exception: it merges only on green CI, never before. See [Review](../OP-PROC.md#review).
5. Deploy follows Blaze's 09:35 CT ruling, 2026-10-21: a small hotfix of a few lines can be deployed directly by forge once tests are green; anything bigger is deployed by a cloud agent, once, with `house/live/app/deploy.sh` and `APP_PUBLIC_ORIGIN` set. See [Clouds + churn](../OP-PROC.md#clouds-churn) and [Hotfix bypass](../OP-PROC.md#hotfix-bypass).
6. Check health. A broken production change follows [Hotfix bypass](../OP-PROC.md#hotfix-bypass): no merge before CI is green. Fix forward, no rollback.
7. Post one receipt to the room with the PR, merge SHA, deployment ID and health result. Then the reviewer runs `bifrost check` live, and any failing rule becomes a card.
8. **Two hats:** a merge, deploy or receipt rule the ship seat follows or hears is written into this runbook, OP-PROC or the lexicon on the next wave; a chat-only rule counts as missing.
9. Merges, deploys and outside writes go out from the ship seat's 1:1, never a group room.

The ship seat also takes dev cards when the cloud agent is full; the reviewer still reviews its heads.

## Hotfix

The rule is [Hotfix bypass](../OP-PROC.md#hotfix-bypass). No merge before CI is green. Merge and deploy on green CI, and critic reviews after the merge. The authority is Blaze's owner ruling, 2026-10-21 08:37 CT. Fix forward, no rollback. The cloud agent writes the fix and the regression test. Forge merges as forge0x1 when CI is green. Blaze's 09:35 CT ruling, 2026-10-21: "A small hotfix of a few lines can be deployed directly by forge once tests are green; anything bigger is deployed by a cloud agent," with `house/live/app/deploy.sh`. Blaze's 09:35 CT ruling, 2026-10-21: board (Bifrost) fixes are a hotfix class. If the critic pass fails, the next fix is another hotfix. The room gets the receipt only.
