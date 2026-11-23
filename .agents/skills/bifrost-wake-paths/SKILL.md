---
name: bifrost-wake-paths
description: >
  Read the bifrost wake paths plate. Use when a Bifrost inbox line,
  the wake filter, a nudge ladder, a tripwire, HITL, a doorbell, or a seat wake is the page.
---

# bifrost-wake-paths

The plate is `docs-site/docs/plates/bifrost-wake-paths.md`.

1. Read the plate left to right. Left is what arrives. The Bifrost box is the server. Right is whether a seat is woken, the line is only stored, or a side channel rings.
2. Cite `house/live/app/server.mjs` for inbox, wake, and stall paths, and `wake-filter.mjs` for allow or drop.
3. The plate is recited against bifrost main `1fae9b1`.
4. HITL (human in the loop) posts `needs_human`. A line to a human is stored and does not wake a seat.
5. A cursor webhook is stored and does not wake a seat.
6. After #109, a superseded review or critic_fail settles via lineDone and the nudge stops. A green-head return wakes critic once githubHeadRuns has cached an all-green run list for the full sha; only a partial green is still filtered.
7. After #110, a ready handoff is offered and can wake even when the seat is busy. Queued critic_fail, merge, live_pass, and ci_fail are stored, not offered.
8. The doorbell rings on ready and ci_pass.
