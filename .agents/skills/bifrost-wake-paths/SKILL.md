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
3. The plate is recited against bifrost main `8a43b6c`.
4. HITL (human in the loop) posts `needs_human`. A line to a human is stored and does not wake a seat.
5. A cursor webhook is stored and does not wake a seat.
6. bifrost#108 is still open on this head: never settles, and return filtered.
