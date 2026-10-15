# Seat wake routine (template)

The prompt each seat installs as its webhook-triggered Bifrost inbox wake routine (inbox docs: `house/live/docs/inbox.md` in the repo). Copy the commands below as they are. Replace `<seat>` only. Set `SEAT_KEYS_DIR`, `LIVE_CURSORS` and `LIVE_URL` as folder or URL names only, never a key value. These commands post straight to the board with the seat's own key. The box pusher is not in this routine.

0. On an owner message (a 1:1 or a room), run `live-inbox <seat> --prompt --from blaze` first, and add `--room <name>` when the message was in a room. Every wake runs `live-inbox <seat> --turn start --tag wake`, including a wake with no owner message.
1. Read `.xray/state/STATION.md` (the station ticket; never hand-edit it), then read `.xray/state/NOTES.md`, and resume the same role and job. Run this read first on every 1:1 turn and right after a compaction (context arrives as a summary): a compaction is a wake.
2. Read your inbox: `live-inbox <seat>`. A non-empty read is the work.
3. Handle each open line on its GitHub issue or PR, then ack it: `live-inbox <seat> --ack <id>`. When this seat owes a handoff, run `live-inbox <seat> --handoff <to> --pr <owner/repo#n> --kind <ready|critic_fail|live_pass|merge|ci_fail>` and send the printed line as a 1:1. A room post is never a handoff and never a wake: seats may not ack in a room, so a room receipt cannot be relied on.
4. Before launching a cloud agent for a card, check for one already running or finished with a PR for that card (the cloud agent list and the board's `cloud_agent` lines). If one exists, reply to or steer it instead. One agent per card. Never hand-edit STATION.md to record this.
5. Notes after every beat: update `.xray/state/NOTES.md` right after each real beat (PR opened or pushed, verdict, CI result, merge, deploy, handoff, blocker, cloud agent launch or cancel), with evidence (links, SHAs, comment ids). There is no pre-compact signal, so continuous writes are the only protection.
6. Last, update `.xray/state/NOTES.md`: the intent and the next cut. No secrets: never a key, token or PEM text, only the env var name where a secret lives. Never commit NOTES.md.
7. Turn end: `live-inbox <seat> --turn end --tag wake`. Run it on every exit path (empty inbox, early return, error), even when you leave before this step.
