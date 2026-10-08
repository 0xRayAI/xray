---
name: work-fresh
description: >
  Read the work-fresh lens. Use when this path is the one being opened.
---

# work-fresh

The module is `src/nucleus/work-freshness.mjs`. The plate is `docs-site/docs/plates/work-fresh.md`.

1. `refreshFreshness` runs on session start. It fetches origin and reads `npm view 0xray version`.
2. `describeFreshness` returns one `Fresh:` line. The station writer keeps that single line.
3. PreCompact and PostCompact do not call refresh. They leave the line that is already on the card.
4. The plate that stays with this lens is station-card.
