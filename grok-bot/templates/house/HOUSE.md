# House

OP-PROC: grok-bot/OP-PROC.md

[OP-PROC](https://github.com/0xRayAI/xray/blob/main/grok-bot/OP-PROC.md) holds the process rules (terms in [LEXICON](https://github.com/0xRayAI/xray/blob/main/grok-bot/LEXICON.md)). This file holds only this house's values: names, handles, repos, URLs, and exceptions.

## Owner
(example) Ada — the human who decides money, credentials, deletes, and taste.

name: Ada

## Seats
(example) Coordinator. Never deploys, publishes, or spends. Implementer and publisher. Reviewer. Never merges. Public-posts specialist. Never invents the words. Listings. Audio.

## Public voice
(example) @example. Root posts at least 4 hours apart. Reply only when you mean to.

## Allowed
(example) git push to org/app. Merge to main on org/app is the deploy. No other repo.

## Ask first
(example) Package publish, production deploy, payments, secrets, and deletes.

## Board
(example) Open cards: house/WAVEBOARD.md when LIVE_URL is unset. Bifrost cards (GET /cards) when LIVE_URL is set. What needs the owner now: house/ATTENTION_STATE.md. The ranked waves live in bifrost-waves.json. See WAVE-SCHEDULE.md.

## Cadence
Optional. Delete this section if your house has no code loop. The process rules (verdicts, review plate, merge gate, watchers, stall sweep, live mesh) are in [CADENCE](https://github.com/0xRayAI/xray/blob/main/grok-bot/CADENCE.md#seat-loop); station boot, the station nudge and the owner-message steps are in [OP-PROC](https://github.com/0xRayAI/xray/blob/main/grok-bot/OP-PROC.md#station-boot). This section holds only this house's values. Rename the roles to your seats.
- Watcher owners: PR watcher, issue gate and issue sweep = reviewer. Merge watcher = lab tester. Stall sweep = name the seat that runs it.
- Stall thresholds: hourly, 24/7. No verdict after 30m; unticked queue line or PASS unmerged after 60m; open P0/P1 with no PR after 2h.
- Watcher files: `house/watchers/merge-queue.md`, `house/watchers/issue-sweep-last.txt`, `house/watchers/review-sent.log`, `house/watchers/stall-sweep.log`.
- Merge target: the integration branch. Main and production need the owner.
- Cloud cap: one cloud agent per repo area with fixed file ownership, at most 4 at once, in waves.
- Wake routine: [fleet/WAKE-ROUTINE.md](fleet/WAKE-ROUTINE.md).

## Roster
Optional. Role, seat name, and agent id: [ROLE-MAP.md](ROLE-MAP.md). Leave it blank until you have ids.

Ask first and Allow are enforced only in [AUTO-REVIEW.md](AUTO-REVIEW.md).

## Scope
Optional. A line that is exactly `wallet off` skips Open Wallet, Clearing, and hangar pay steps in `grok-bot doctor`. Leave the line out to keep those steps.

## Constitution
This page is not the constitution. Grok Bot has no pre-tool hooks. The constitution is the suit's `codex.json`. Seats that wear a suit read their slice every turn:
- Implementer: all terms. 11, 29, 69, and 70 are hard lines.
- Reviewer: judge a Strict review against the constitution and cite term numbers.
- Coordinator: 52-59 and 61.
- Tester: 8, 48, 61, 62, 63, 65, and 66.
- Non-code seats: no terms.

Term 70: before an edit, be on the latest main and run the current package. Compare set-aside work to main before you throw it away. Seat rules, spend, and the board stay here.
