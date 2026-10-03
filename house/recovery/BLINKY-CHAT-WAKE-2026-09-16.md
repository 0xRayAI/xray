# BLINKY CHAT WAKE — 2026-09-16

**A friend would hear:** Blinky’s boards still update, but his chat often won’t wake — the long server transcript is timing out, and he has no memory parachute.

## Evidence
- Ops group renamed `blinky is broke why?` (~09:22 CT)
- Host log: `server-agent-proxy` transcript tail **ECONNRESET / ETIMEDOUT** (incl. attempt 4 exhausted); blinky most-pinned; retained tails ~900 rows
- Local `memory/` empty · store snapshot “No facts recorded yet”
- Local transcript mirror tiny (rename events) — temporal history is server-side
- `automations/` empty on disk vs [`ROUTINES-INVENTORY.md`](../ROUTINES-INVENTORY.md) claiming armed
- Attachments still arrive; asset generation stopped after Sep 15

## Fix ladder
1. **Disk parachute (done by New Bot):** STATION + this note + memory seed files
2. **Wake test:** priority ping blinky → must Reply to Blaze from WAVEBOARD truth
3. **Blaze UI:** open blinky 1:1; check Routines panel; if still dead → **new chat / compact** after reading STATION (nuclear for bloated server thread)
4. **Ops cover:** re-add sync to ops when unparked, or seat New Bot/forge as temporary ops member
5. **Platform:** escalate transcript-tail ConnectError for agent `17ca6f67-…` / serverId `2618156`

## CoS law (unchanged)
ASSIGN DON'T DO · no CloudAgent · card forge · friend-test H-lane · KEEP MOVING
