---
name: board-prompt
description: On any message, run the board-prompt skill first; it posts the turn and points at OP-PROC.
---

# Board prompt

Run this skill once, before other work, on any inbound message: from the owner, from another seat (a seat DM), or in a room.

The rules for the turn are [grok-bot/OP-PROC.md](../../OP-PROC.md) and the house overlay [house/OP-PROC.md](https://github.com/0xRayAI/xray/blob/main/house/OP-PROC.md).

## Order

1. Owner message only: `live-inbox <seat> --prompt --from owner --note "<gist>"`. Add `--room <name>` when that owner message was in a room. A seat DM and a room message from anyone else do not post `--prompt`.
2. After handling any inbox line, ack it with `live-inbox <seat> --ack <id>` or `--ack all`.
3. When you launch or resume a cloud agent, before the work: `live-inbox <seat> --turn start --tag "bc-<first8> <track>"`. A webhook wake skips this post. WAKE-ROUTINE step 0 is that one start.
4. The work.
5. When the cloud finishes or is cancelled: `live-inbox <seat> --turn end --tag "bc-<first8>"`. A webhook wake skips this post. The WAKE-ROUTINE EXIT trap is that one end.

A webhook wake uses WAKE-ROUTINE for its one `--prompt`, its `--turn start`, and its `--turn end`, and does not also run this skill. A chat turn uses this skill and does not also run step 0.

## Note

An owner message always passes `--note "<gist>"`. `<gist>` is one short summary the seat wrote, inside the plain-line cap (1–240 characters). The gist is not the message text. A DM, a room post, and any inbound message text stay out of `--note`, out of `--tag`, and out of every other field. A note outside that charset is refused and posts nothing.

Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --turn end --tag "bc-<first8>"`. `--from owner` is required today.

Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`.

History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.

## When a post fails

A failed post (missing env, 401, 429, no network) is said in one line. The skill does not retry and does not invent a local file. Continue the reply. A failed turn post follows the same rule: say it in one line, do the work, and still run turn end on the way out.

## What this skill does not do

The skill posts those lines. It does not launch a cloud, open a card, or paste the chat. It does not send a reply whose only job is to mark the turn.

When the prompt is why a GitHub issue or pull request is opened, put `Prompt: <id>` in the body. The id is the `id` in the `{ok, id}` line the command printed. The key is never printed.
