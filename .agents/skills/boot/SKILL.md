---
name: boot
description: >
  Read the boot lens. Use when BootOrchestrator.executeBootSequence is the page.
---

# boot

The class is `BootOrchestrator` in `src/core/boot-orchestrator.ts`. The plate is `docs-site/docs/plates/boot.md`.

1. `executeBootSequence` brings the engine up.
2. The plate stays the boot list. Do not redraw it from this skill.
3. The suit turn is worn-turn. The plate that stays with this lens is suit-wear.
4. When Bifrost is on, suit boot enables the only TUI monitor in the local TUI: `$XRAY_MAIN/house/live/tools/inbox-watch.sh <seat>`. The TUI wearing the suit runs it. No inline loop. No `~/.burst/bin` copy. The watcher rule is [Inbox watcher](../../../grok-bot/OP-PROC.md#inbox-watcher).
5. Suit boot starts the local reminder with `node $XRAY_MAIN/house/live/tools/remind-local.mjs`. That script writes station.md. It does not restate the watcher rule.
