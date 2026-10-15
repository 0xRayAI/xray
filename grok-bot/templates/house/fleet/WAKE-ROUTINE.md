# Seat wake routine (template)

The prompt each seat installs as its webhook-triggered Bifrost inbox wake routine (inbox docs: `house/live/docs/inbox.md` in the repo). Copy the commands below as they are. Replace `<seat>` only. Set `SEAT_KEYS_DIR`, `LIVE_CURSORS` and `LIVE_URL` as folder or URL names only, never a key value. These commands post straight to the board with the seat's own key. The box pusher is not in this routine.

0. On an owner message (a 1:1 or a room), run `live-inbox <seat> --prompt --from blaze` first, and add `--room <name>` when the message was in a room. Every wake runs `live-inbox <seat> --turn start --tag wake`, including a wake with no owner message.
1. Read `.xray/state/STATION.md` (the station ticket; never hand-edit it), then read `.xray/state/NOTES.md`, and resume the same role and job.
2. Read your inbox: `live-inbox <seat>`. A non-empty read is the work.
3. Handle each open line on its GitHub issue or PR, then ack it: `live-inbox <seat> --ack <id>`. When this seat owes a handoff, run `live-inbox <seat> --handoff <to> --pr <owner/repo#n> --kind <ready|critic_fail|live_pass|merge|ci_fail>` and send the printed line as a 1:1. A room post is never a handoff and never a wake: seats may not ack in a room, so a room receipt cannot be relied on.
4. Last, update `.xray/state/NOTES.md`: the intent and the next cut. No secrets: never a key, token or PEM text, only the env var name where a secret lives. Never commit NOTES.md.
5. Turn end: `live-inbox <seat> --turn end --tag wake`. Run it on every exit path (empty inbox, early return, error), even when you leave before this step.
