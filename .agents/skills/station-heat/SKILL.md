---
name: station-heat
description: >
  Read the station-heat lens. Use when applyStationHeat runs on a compact.
---

# station-heat

The file is `src/integrations/hooks/station-hook-runtime.cjs`. The plate is `docs-site/docs/plates/station-heat.md`.

1. `isCompactHook` is true when the hook name contains compact.
2. On that event `applyStationHeat` calls `stampNotesPickup` with the intent.
3. The plates that stay with this lens are pickup-stamp and notes-page.

