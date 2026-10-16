---
name: trail-state
description: >
  Read the trail-state lens. Use when session boot, the lens line, or other suit state is the page.
---

# trail-state

Session boot is written through `src/integrations/hooks/station-hook-runtime.cjs`.

The suit writes `.xray/state`. The agent reads it. `.xray/state/LENS.md` opens with the Kind 0 line, then the held plane card: Plane, From, Digest, Plate, Entry, Exit, Files, Skills, Setup, Teardown, Worn. Do not commit `.xray/state`. The plates that stay with this lens are write-home and suit-organs.

