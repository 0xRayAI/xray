---
name: payload-heat
description: >
  Read the payload-heat lens. Use when buildSessionBootPayload is the path.
---

# payload-heat

The file is `src/integrations/grok/hooks/grok-hook-utils.js`. The plate is `docs-site/docs/plates/payload-heat.md`.

1. `buildSessionBootPayload` calls `applyStationHeat` and `writeStationMarkdown`.
2. The plates that stay with this lens are station-heat and pickup-stamp.

