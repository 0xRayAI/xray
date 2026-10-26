# Board prompt

Another fleet copies this after `grok-bot house init`. Do these in order.

1. Set `name:` once under `## Owner` in `house/HOUSE.md`. The template example is `name: Ada`.
2. Paste this line onto every seat description: `Points at station. Station is the boot. This file is not a second boot.`
3. Read `grok-bot/skills/board-prompt/SKILL.md`. Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` beside `live-inbox <seat> --cloud launch --agent <bc-id> --tag <card>` on first start or `--cloud reply` on resume, and `live-inbox <seat> --turn end --tag "bc-<first8>"` beside `live-inbox <seat> --cloud finished --agent <bc-id> --tag <card>` (cancel is `--cloud cancel`). The tag is owner/repo#n or xray#n. The cloud agent does not post that line. `--from owner` is required today.
4. When that prompt is why a PR or issue is opened, put `Prompt: <id>` in the body. The id is what the command printed.
5. After one day on the live board, record the owner-prompts count, the byte total, and the p50 post time.

Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`.

History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.

A house with no `LIVE_URL` still posts when the seat has the inbox env. The hand-kept `house/WAVEBOARD.md` does not grow a fake tile. The strip exists on the Bifrost board.
