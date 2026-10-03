<!-- Mirror of the CoS suit board (blinky-suit), copied 2026-09-25. The CoS suit is the source of truth. -->
# WAVEBOARD

**Owner:** blinky (CoS). **Reconciled:** 2026-09-25 10:30 America/Chicago (full cleanup; prior board archived in the CoS suit, not mirrored here).

## Words (Blaze one-page proc, 2026-09-25)
- **Card**: one ticket, one seat, with an ID, owner, status (OPEN, IN FLIGHT, BLOCKED, CLOSED), and acceptance.
- **Packet**: the seven-part handoff that assigns a card: goal, constraints, path, acceptance, evidence, next owner, escalate. Free-text pings are not a card.
- **Receipt**: the live proof that closes a card (URL, `npm view`, critic PASS). Green CI is gate A only. Chat LGTM is not done.
- **Station**: a seat's survival strip on disk.
- **Beat**: a real event (Blaze, a PR event, a compact), not a timer.
- **Wave**: a batch of cards.

## Rule
Every packet CoS sends gets a card here first. Every receipt closes or updates its card the same turn. The Dist watch appends Dist cards under **In flight** in the same format.

## In flight
### Card — MOLTBOOK-LIVE (IN FLIGHT · owner forge · 2026-09-25)
- **Goal:** 0xray bot on Moltbook runs fully on Railway with zero dependency on Blaze's Mac.
- **State:** repo 0xRayAI/0xray-moltbook main, PR #1 and #3 merged (critic PASS), Railway auto-deploys from main, xAI login auto-refreshes (tokens on the /data volume). DRY_RUN=false per Blaze GO at 04:17. Posts at 10:00 and 16:00 CT, max 2/day.
- **Acceptance:** first live post URL, slot recorded, 10:30 run skips as slot-used, token refresh OK. Forge proof check at 10:50 CT goes to critic and CoS.
- **Fallback:** box heartbeat routine PAUSED (not deleted). Old Mac xAI retry routine deleted.

### Card — WAVEBOARD-NAME-CLAIM (IN FLIGHT · owner forge (search), CoS (spec text) · 2026-09-25)
- **Goal:** dated public first use of "0xRay Waveboard" as a product name.
- **Found:** first public "WAVEBOARD" in 0xRayAI/xray commit `291f743` (PR #33), 2026-09-13 07:46 CT; also in npm @0xray/grok-bot@0.1.1 the same day.
- **Next:** spec PR `grok-bot/WAVEBOARD.md` from the one-page proc words; docs PR, Normal (forge + CI). Forge spec step on HOLD until PROCESS-AUDIT closes.
- **Blaze only:** trademark filing (capital, lawyer clearance first).

### Card — PROCESS-AUDIT (IN FLIGHT · owner CoS · 2026-09-25)
- **Goal:** one real process with one set of words.
- **Found:** board had become an X-reply log; eng work lived only in chat; STATION stale since 9/23; ACTIVE-HANDOFF stale since 9/24; weekday digest paused since 9/21; handoff form unused; card/ticket and handoff/packet were duplicates; a second flow exists in 0xRayAI/xray (per-cloud ticket files like `docs/WAVEBOARD-CLEANSE-001.md`).
- **Done:** board reconciled; STATION + ACTIVE-HANDOFF refreshed; weekday digest rearmed; Blaze locked the one-page proc and kept card/packet (10:26). **Next:** forge replaces OP PROC with the one page and mirrors WAVEBOARD + ATTENTION_STATE into `grok-bot/ops/` (packet OPPROC-ONE-PAGE).

### Card — CONTENT-SCHEDULE (IN FLIGHT · owner CoS · 2026-09-25)
- **Goal:** Moltbook posts at 10:00 and 16:00 CT rotate the 12 critic-passed topics; ship note replaces 16:00 on release days.
- **Next:** review the first live posts for friend-test; tune the voice prompt via forge if they drift.

## Open backlog (encode when seats are awake)
- **AGENT-COMMAND-LEXICON**: Dist HOLD per Blaze. Stamp the house command vocabulary into seats. Source https://x.com/Blaze0x1/status/2103073249038860606
- **HOT-SWAP-SUIT-DELTA**: record Blaze's result (keyword lost after compaction without the suit, kept with it) in the survive-compact skill.
- **MEMORY-ENCODE**: merged from GROK47-SCORE-MEM-PLATES, HOT-SWAP-COMPACTION-SURVIVAL-V1, ARCH1-HOLD-LINE-MEMORY, ARCH1-MEMORY-BREAKFIX. One memory break/fix track, first failure case still unnamed.
- **DIGRESSIVE-INVERSION**: put "answer what was asked, one next step" into seat contracts and the grok-bot mirror.
- **REBASE-NEXT-WAVEBOARD**: every "~ next" becomes a ticket here. Now covered by the Rule above; close when the wave-loop skill says it.

## Blocked on Blaze
- Attract ZERO-FOREIGN broken (7 foreign); Attract HOLD until the Rippel-canvas dogfood.
- Delete magnet-DUPLICATE-DELETE-ME from the sidebar.
- Reconcile Auto Review always-allows against capital.

## Closed (recent)
- BLAZE-JUST-DO-WEIGH-IN: reply https://x.com/0xRayAI/status/2103422395625488452
- HOT-SWAP-SUIT-BOUNDARY: replies https://x.com/0xRayAI/status/2103419095257612375 and https://x.com/0xRayAI/status/2103421589962531150, likes verified
- LIKE-BLAZE-ESCAPE-HATCH: like verified
- LIKE-BLAZE-RESONATE: path live (herald browser like); Dist watch keeps scanning
- GIGA-SPAGHET-CLEANUP: dropped, stale since 9/22 with no follow-up from Blaze
- Earlier Dist tickets: see archive

## Verify (needs fresh probe)
- npm versions, Clearing and blips health. Last probe on the old board was 2026-09-23, so treat it as stale.
