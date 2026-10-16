---
name: pickup-stamp
description: >
  Read the pickup-stamp lens. Use when stampNotesPickup writes the notes line.
---

# pickup-stamp

The function is `stampNotesPickup` in `src/integrations/hooks/station-hook-runtime.cjs`. The plate is `docs-site/docs/plates/pickup-stamp.md`.

1. It replaces the pickup line and leaves the rest of NOTES.md alone.
2. It does not check that the working notes are present.
3. Compact sets `Notes: THIN` or `Notes: present` on the station card. This function does not write that body.
4. The plate that stays with this lens is notes-page. The seat writes the body before this runs.

