---
name: kept-line
description: >
  Read the kept-line lens. Use when this path is the one being opened.
---

# kept-line

The functions are `withOneFreshLine` and `mergeStationMarkdown` in `src/integrations/hooks/station-hook-runtime.cjs`. The plate is `docs-site/docs/plates/kept-line.md`.

1. A `Fresh:` line is stock. The preserve step does not keep a pile of them.
2. If the new card already has a Fresh line, that is the one line.
3. If it does not, the latest Fresh line from the old card is inserted once.
4. The plates that stay with this lens are station-card and work-fresh.
