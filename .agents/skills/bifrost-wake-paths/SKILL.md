---
name: bifrost-wake-paths
description: >
  Read the bifrost wake paths plate. Use when a Bifrost inbox line,
  the wake filter, a stall clock, HITL, or a seat wake is the page.
---

# bifrost-wake-paths

The plate is `docs-site/docs/plates/bifrost-wake-paths.md`.

1. Read the plate left to right. Left is what arrives. The Bifrost box is the server. Right is whether a seat is woken or the line is only stored.
2. Cite `house/live/app/server.mjs` for inbox, wake, and stall paths, and `wake-filter.mjs` for allow or drop.
3. HITL (human in the loop) posts `needs_human`. A line to a human is stored and does not wake a seat.
4. The plate is drawn at bifrost@55ab0253.
5. A cursor webhook is stored and does not wake a seat.
