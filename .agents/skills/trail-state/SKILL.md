---
name: trail-state
description: >
  Read the trail-state lens. Use when session boot, the lens line, or other suit state is the page.
---

# trail-state

Session boot is written through `src/integrations/hooks/station-hook-runtime.cjs`.

The suit writes `.xray/state`. The agent reads it. When a plane is named and its Entry and Exit rows are missing, `.xray/state/LENS.md` gains that card: Plane, From, Digest, Plate, Entry, Exit, Files, Skills, Setup, Teardown, Worn. Later passes read the stored card. Commit `.xray/state/LENS.md`. Do not commit the rest of `.xray/state`. The plates that stay with this lens are write-home and suit-organs.

