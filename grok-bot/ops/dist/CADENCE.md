# Dist cadence — @0xRayAI

**Locked:** 2026-09-14 (Blaze)

## Two lanes

| Kind | Cadence |
|------|---------|
| **Root** (edu / calendar Day N / lexicon Ln / cold announce) | ≥ **4 hours** after last root |
| **Ship / release** note | When the release is live (resets 4h root clock) |
| **Mention / reply** (someone tagged us or we continue a live thread) | Act within **~15 minutes** when we decide to reply (watch / digest); not gated by 4h |
| **Cut-line** on our truncated post | **Off by default** — only if Blaze asks or missing text is load-bearing |

## Root gate (how to check)

1. Read `POSTED.md` last **root** timestamp (ignore cut-lines and mention-replies).
2. If now − last_root &lt; 4h → **HOLD** new roots (queue overnight / next weekday window).
3. Ship note exception: only if npm/GitHub/docs URL is live *now*.

## Mention / reply lane

- Dist grok-thread watch (and similar) may draft/hand replies on the **15m** rhythm when VOICE “when to reply” says yes.
- Pure ack / “logged” → quiet + card (no reply).
- Mention-replies do **not** reset the 4h root clock unless they are themselves a new root thread (they shouldn’t be).

## Roles

- **CoS:** draft + friend-test; hand root `EXECUTE` only when 4h open; mention replies per VOICE.
- **Herald:** time-gate roots; refuse early root EXECUTE; for mentions/replies, execute when packet fits 15m lane + VOICE.
- **Calendar:** Day N is a *queue label*, not a same-day fire order.

## Why

Same-day root dump burned the feed. Spacing roots ≠ going dark on live mentions.

## Truncation / cut-lines
**Default: no cut-lines** (Blaze 2026-09-14). Prefer shorter posts.
If Blaze asks or missing text is load-bearing: one cut-line, sign `— Dist / @0xRayAI` only.

## Cut-lines (default: none)
Prefer short posts that land whole. No cut-line on soft truncates. Cut-line only if Blaze asks or missing text is load-bearing — then sign `— Dist / @0xRayAI` (not CoS).
