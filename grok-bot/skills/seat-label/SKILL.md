---
name: seat-label
description: >
  This seat sets its own profile title with UpdateProfile title only, then
  checks profile.json. Run it in this seat's own chat.
---

# Seat label

This seat sets its own profile. It does not call `UpdateProfile` for any other seat.

1. Fill the label: `You are <seat>, <role> on the <plane> plane. Run the station skill first (suit <suit path>).` Planes are core, integration, ecosystem, distribution, and live.
2. Call `UpdateProfile` with `title` only. Do not send `description` on that call.
3. Read `profile.json`. `title` is the label. `description` opens with `BOOT: on any owner message, after a summary, or on a wake, run the station skill first (suit <path>, seat <seat>).` When that opening is missing, fix this seat's description.
4. Write `Plane:` and `Skills: station, seat-label, seat-github-key` on `.xray/state/STATION.md`.

Getting-started runs this skill once in each new seat's own chat.
