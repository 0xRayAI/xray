---
name: board-prompt
description: On any message, run the board-prompt skill first; it posts the turn and points at OP-PROC.
---

# Board prompt

Run this skill once, before other work, on any inbound message: from the owner, from another seat (a seat DM), or in a room.

The rules for the turn are [grok-bot/OP-PROC.md](../../OP-PROC.md) and the house overlay [house/OP-PROC.md](https://github.com/0xRayAI/xray/blob/main/house/OP-PROC.md).

## Order

1. Owner message only: `live-inbox <seat> --prompt`. Pass no `--from`. `from` is the `name:` in house config. Add `--room <name>` when that owner message was in a room. A seat DM and a room message from anyone else do not post `--prompt`.
2. Always, before the work: `live-inbox <seat> --turn start --tag wake`. A webhook wake skips this post. WAKE-ROUTINE step 0 is that one start.
3. The work.
4. On every exit, including an early return and an error: `live-inbox <seat> --turn end --tag wake`. A webhook wake skips this post. The WAKE-ROUTINE EXIT trap is that one end.

`--tag` is the word `wake`. A webhook wake uses WAKE-ROUTINE for its one `--prompt`, its `--turn start`, and its `--turn end`, and does not also run this skill. A chat turn uses this skill and does not also run step 0.

## Note

`--note` is either one fixed summary the seat wrote, or it is omitted. Omitting `--note` is the usual post. A DM, a room post, and any inbound message text stay out of `--note`, out of `--tag`, and out of every other field. A fixed summary stays inside the plain-line cap (1–240 characters). A note outside that charset is refused and posts nothing, so omit `--note` when there is no fixed summary and the prompt still posts.

## When a post fails

A failed post (missing env, 401, 429, no network) is said in one line. The skill does not retry and does not invent a local file. Continue the reply. A failed turn post follows the same rule: say it in one line, do the work, and still run turn end on the way out.

## What this skill does not do

The skill posts those lines. It does not launch a cloud, open a card, or paste the chat. It does not send a reply whose only job is to mark the turn.

When the prompt is why a GitHub issue or pull request is opened, put `Prompt: <id>` in the body. The id is the `id` in the `{ok, id}` line the command printed. The key is never printed.
