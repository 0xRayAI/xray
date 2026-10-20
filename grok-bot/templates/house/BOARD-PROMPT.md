# Board prompt

Another fleet copies this after `grok-bot house init`. Do these in order.

1. Set `name:` once under `## Owner` in `house/HOUSE.md`. The template example is `name: Ada`.
2. Paste this line onto every seat description: `On any message, run the board-prompt skill first; it posts the turn and points at OP-PROC.`
3. Read `grok-bot/skills/board-prompt/SKILL.md`. On any inbound message, post `--turn start --tag wake`, do the work, and post `--turn end --tag wake` on every exit. Post `live-inbox <seat> --prompt` only for an owner message, with no `--from`. Pass `--note` only as one fixed summary the seat wrote, or omit it.
4. When that prompt is why a PR or issue is opened, put `Prompt: <id>` in the body. The id is what the command printed.
5. After one day on the live board, record the owner-prompts count, the byte total, and the p50 post time.

A house with no `LIVE_URL` still posts when the seat has the inbox env. The hand-kept `house/WAVEBOARD.md` does not grow a fake tile. The strip exists on the Bifrost board.
