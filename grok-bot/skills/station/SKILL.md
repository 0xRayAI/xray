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

Every owner message is logged as activity before anything else. Run `live-inbox <seat> --prompt --from owner --note "<gist>"` first. A quick follow-up that arrives mid-turn is its own owner message: log that prompt before the reply, before the station read, and before any other step.

1. On every owner message, first run `live-inbox <seat> --prompt --from owner --note "<gist>"`; after handling any inbox line (in chat or on a wake), ack it right away with `live-inbox <seat> --ack <id>` (or `--ack all` once everything open is handled); when you launch or resume a cloud agent run `live-inbox <seat> --turn start --tag "bc-<first8> <track>"`; when it finishes or is cancelled run `live-inbox <seat> --turn end --tag "bc-<first8>"`. No exceptions for short turns. The gist is not the message text.

Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --turn end --tag "bc-<first8>"`. `--from owner` is required today.

Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`.

History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.

2. Read `.xray/state/STATION.md`.

Light does not read the pack.

## Full

After a summary, a wake, or a gate, also read:

- the file named by the `OP-PROC:` line in `house/HOUSE.md`
- the newest two entries in `.xray/state/NOTES.md`
- `house/fleet/TRACKS.md`
- open board cards (`house/WAVEBOARD.md` when `LIVE_URL` is unset, `GET /cards` when it is set)
- the `Skills:` line on `.xray/state/STATION.md`

## During the work

Each step posts one activity line. Each cloud launch is written to `house/fleet/TRACKS.md` in that same step.

## Way out

Ask: anything new without a card? Each yes is carded in this turn. The fields are a one-line what, `From:`, `Waiting on:` (a condition, or `nothing`), and `Owner:`. The rule is Fallout in `grok-bot/OP-PROC.md`. The station-card lens is `.agents/skills/station-card/SKILL.md`.

Update STATION `Judgement:`, the card metadata (title, url, owner seat, stage, state), TRACKS, and the closing activity line.

The owner's chat does not launch or resume a cloud agent when the card id is missing. The board posts every pull-request handoff and every review handoff. The coordinator acks only dev lines.
