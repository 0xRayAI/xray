---
name: notes-page
description: >
  Read the notes-page lens. Use when writing .xray/state/NOTES.md so a compact survives.
  The default depth is the full working notes, not a pickup line.
---

# notes-page

The page is `.xray/state/NOTES.md`. The default depth is the working notes: enough that a compact or a host change continues the job with no paste.

`stampNotesPickup` in `src/integrations/hooks/station-hook-runtime.cjs` updates only the pickup line. PreCompact calls it. Grok runs `session-start.js --hook-event=pre_compact`. Cursor runs `pre-compact.js`. Both go through `applyStationHeat`, and on a compact event the pickup line is stamped and the rest of the page is left alone. Cursor cannot block the compact. Grok ignores hook stdout. The hook does not check that the working notes are present. The seat writes the body, at this depth, before that hook runs.

1. The pickup line equals the station intent. Leave both alone unless the job on the table changed.
2. Under the pickup line, keep a short index and a Working notes body. The body holds the point, what is already on a lens, the library table, the open pull requests and their heads, the rituals, the standing orders, and the next cut. A one-line resume is the index, not the page.
3. When the job moves, rewrite that body in the same change. A stale body is the bug this skill exists to close.
4. Do not commit this file. Do not feed it to Repertoire. Do not mint a law from it.
5. Compact sets the station line `Notes: THIN` or `Notes: present` and does not rewrite this body.
