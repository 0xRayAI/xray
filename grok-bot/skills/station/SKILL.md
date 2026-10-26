---
name: station
description: >
  BOOT: on any owner message, after a summary, or on a wake, run the station
  skill first (suit <path>, seat <seat>).
---

# Station

One boot hook. Light on an owner message. Full after a summary, a wake, or a gate.

## Light

On any owner message:

1. On every owner message, first run `live-inbox <seat> --prompt --from owner --note "<gist>"`; after handling any inbox line (in chat or on a wake), ack it right away with `live-inbox <seat> --ack <id>` (or `--ack all` once everything open is handled); when you launch or resume a cloud agent run `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --cloud launch --agent <bc-id> --tag <card>` (resume uses `--cloud reply`); when it finishes or is cancelled run `live-inbox <seat> --turn end --tag "bc-<first8>"` and `live-inbox <seat> --cloud finished --agent <bc-id> --tag <card>` (cancel uses `--cloud cancel`). The tag is owner/repo#n or xray#n. The cloud agent does not post that line. No exceptions for short turns. The gist is not the message text. A quick follow-up that arrives mid-turn is its own owner message: log that prompt before the reply, before the station read, and before any other step.

Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` beside `live-inbox <seat> --cloud launch --agent <bc-id> --tag <card>` on first start or `--cloud reply` on resume, and `live-inbox <seat> --turn end --tag "bc-<first8>"` beside `live-inbox <seat> --cloud finished --agent <bc-id> --tag <card>` (cancel is `--cloud cancel`). The tag is owner/repo#n or xray#n. The cloud agent does not post that line. `--from owner` is required today.

Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`.

History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.

Owner-only `--prompt`, `--room`, the 1–240 gist cap, a failed post, `Prompt: <id>`, and the webhook split are [Station boot](../../OP-PROC.md#station-boot).

2. Read `.xray/state/STATION.md`.

Light does not read the pack.

## Full

After a summary, a wake, or a gate, read what [Station boot](../../OP-PROC.md#station-boot) names for Full. When `LIVE_URL` is set, the board is Bifrost (`GET /cards`).

## During the work

Each step posts one activity line. Each cloud launch is written to `house/fleet/TRACKS.md` in that same step.

## Way out

Ask anything new without a card, then update STATION, the card, TRACKS, and the closing line, as [Station boot](../../OP-PROC.md#station-boot) and [Card](../../OP-PROC.md#card) say. A packet and its card follow [Packet](../../OP-PROC.md#packet). The card key is the issue or pull. Do not hand-post a card.

Backstop: not built yet. Doctor does not flag a stale STATION or an incomplete card. It warns when `STATION.md` is older than `NOTES.md`, or when `Skills:` or `Keys:` is missing.
