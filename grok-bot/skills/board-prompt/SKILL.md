---
name: board-prompt
description: Points at station. Station is the boot. This file is not a second boot.
---

# Board prompt

Station is the single boot. Run step 1 of [station](../station/SKILL.md). The rule is [Station boot](../../OP-PROC.md#station-boot). The house overlay is [house/OP-PROC.md](https://github.com/0xRayAI/xray/blob/main/house/OP-PROC.md).

A chat turn uses station. A webhook wake uses [WAKE-ROUTINE](../../templates/house/fleet/WAKE-ROUTINE.md) and does not also run station.

Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` beside `live-inbox <seat> --cloud launch --agent <bc-id> --tag <card>` on first start or `--cloud reply` on resume, and `live-inbox <seat> --turn end --tag "bc-<first8>"` beside `live-inbox <seat> --cloud finished --agent <bc-id> --tag <card>` (cancel is `--cloud cancel`). The tag is owner/repo#n or xray#n. The cloud agent does not post that line. `--from owner` is required today.

Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`.

History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.
