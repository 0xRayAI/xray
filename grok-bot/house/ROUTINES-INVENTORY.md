# Routines inventory (house list)

**Not the server objects** — human-readable SSOT for what should be armed. Updated 2026-09-16T10:21 CT.

| Name | Owner | Trigger | Status |
|------|-------|---------|--------|
| Weekday wave board digest | blinky | Weekdays 9:42 CT | enabled |
| ATTENTION pulse | blinky | Hourly :25 CT | **PAUSED** quiet-mode 89% util |
| Eng signal intake xray | blinky | GitHub 0xRayAI/xray PR/CI | **PAUSED** 2026-09-16 — stale backlog after #71 merge; self-quiet prompt patched; rearm only after Blaze/CoS + one clean new-PR fire |
| Dist grok thread watch | blinky | Weekdays */15 8–20 CT | **PAUSED** quiet-mode 89% util (was patched; rearm later)
| Dist watch health check | blinky | Weekdays 5,35 8–20 CT | **PAUSED** quiet-mode 89% util |
| Weekday Dist publish | blinky/herald | Weekdays 10:15 CT | enabled |
| Dist mail digest | blinky | Weekdays 11:20 CT | enabled |
| Weekday grok-bot ops mirror | forge/blinky | Weekdays 11:28 CT | enabled |
| Trade v1 SMA20 daily check | trade/risk | Daily 00:05 UTC | enabled |

## Intake self-quiet (HARD)
Before parent handoff: read [`ATTENTION_STATE.md`](ATTENTION_STATE.md). If PR already MERGED/CLOSED or beat marked CLOSED/LIVE/Verify closed → persist one quiet line, **stop**. No Blaze ping. No seat re-card for superseded heads.

Quiet-when-unchanged still applies to ATTENTION + empty digests.

SSOT miss: [`MISS-CHAT-WAKE-2026-09-16.md`](../ops/MISS-CHAT-WAKE-2026-09-16.md).

## QUIET MODE 2026-09-16
Blaze: ~89% utilization — silent unless capital / FAIL / Blaze poke. Rearm watches when util cools.

- **Monitor Dist reply Blaze commands post** (`monitor-dist-reply-blaze-commands-post`): ARMED — every 15m weekdays 12–20 CT until @0xRayAI replies to https://x.com/Blaze0x1/status/2100276010335731791; quiet until reply or ~90m stall; then self-delete.
- **Dist grok thread watch**: REARMED 2026-09-16 for that mention (was paused for quiet mode).
