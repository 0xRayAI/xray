# Station boot

Another fleet does this in order after `grok-bot house init`.

1. Set `name:` under `## Owner` in `house/HOUSE.md` to the owner name the board should show. Set `OP-PROC:` to that fleet’s procedure file. The pack default is `grok-bot/OP-PROC.md`. A missing `name:` is not how the prompt chooses `from`.
2. Read `grok-bot/skills/board-prompt/SKILL.md` and `grok-bot/skills/station/SKILL.md`. Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --turn end --tag "bc-<first8>"`. `--from owner` is required today. Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`. History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name. The public board does not serve the history archive or the kanban yet.
3. Each new seat runs `seat-label` in its own chat. The skill fills `You are <seat>, <role> on the <plane> plane. Run the station skill first (suit <suit path>).` Planes are core, integration, ecosystem, distribution, and live. It calls `UpdateProfile` with `title` only. One seat does not label another.
4. Wear `@0xray/grok-bot` so `station`, `seat-github-key`, and `seat-label` are on the seat. The profile description opens with one line: `BOOT: on any owner message, after a summary, or on a wake, run the station skill first (suit <path>, seat <seat>).`
5. `seat-label` writes `Plane:` and `Skills:` on `.xray/state/STATION.md`. `Keys:` names `gh-<seat>` only.
6. Install `~/bin/gh-<seat>` so every call runs `~/.config/<seat>/github-app-mint-token.sh`. A seat with no App hands the branch and the PR body to a seat that has one. The wrapper prints neither the token nor the PEM.
7. Keep `house/fleet/TRACKS.md`. Write the cloud id when the launch starts.
8. The board posts every pull-request handoff and every review handoff. The coordinator acks only dev lines.
9. Do not launch or resume a cloud agent when the card id is missing. On the way out write the card title, url, owner seat, stage, and state.
10. The public board is https://bifrost.0xray.dev. Docs are https://docs.0xray.dev/.
11. Run `npx @0xray/grok-bot doctor`. A warning names a missing hook, a station card older than NOTES, or a missing `Skills:` or `Keys:` line. A warning does not fail the plant.

## MIGRATION

From `@0xray/grok-bot` 0.1.10. `house init` will not overwrite a house file you already have. Do these by hand.

1. Add `name:` under `## Owner` in `house/HOUSE.md`, and `OP-PROC: grok-bot/OP-PROC.md`. Point `OP-PROC:` at the fleet overlay when there is one. Replace the example name with the name in house config. A missing `name:` warns. That warning is not the board rule.
2. Each existing seat runs `seat-label` in that seat’s own chat.
3. Install `~/bin/gh-<seat>` and stop using plain `gh`.
4. Point the wake at `house/fleet/WAKE-ROUTINE.md`. `house init` does not overwrite a house file the fleet already has. Copy the notes below by hand when the fleet's cadence still has the old prompt. Start is `--turn start --tag "bc-<first8> <track>"`. Finish is `--turn end --tag "bc-<first8>"`. Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --turn end --tag "bc-<first8>"`. `--from owner` is required today. Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`. History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name. The public board does not serve the history archive or the kanban yet.
5. Copy `fleet/TRACKS.md` with `grok-bot house init --migrate` when that file is missing.
6. Put `Plane:`, `Skills:`, and `Keys:` on `.xray/state/STATION.md`. `Keys:` is `gh-<seat>`, never a secret.
7. Stop sending pull-request and review handoffs as direct messages. The board posts them. The coordinator acks only dev lines.
8. Do not launch without a card id. On the way out write title, url, owner seat, stage, and state, plus STATION judgement, TRACKS, and the closing activity line.
9. Set `LIVE_URL` to https://bifrost.0xray.dev when this fleet uses the public board.
10. Read docs at https://docs.0xray.dev/.
11. Run `npx @0xray/grok-bot doctor`.
