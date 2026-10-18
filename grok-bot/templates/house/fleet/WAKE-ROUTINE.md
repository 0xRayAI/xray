# Seat wake routine (template)

The prompt each seat installs as its webhook-triggered Bifrost inbox wake routine (inbox docs: `house/live/docs/inbox.md` in the repo). Copy the commands below as they are. Replace `<seat>` only. Set `SEAT_KEYS_DIR`, `LIVE_CURSORS` and `LIVE_URL` as folder or URL names only, never a key value. These commands post straight to the board with the seat's own key. The box pusher is not in this routine.

Env first, on every turn, in the same shell as the commands below. `live-inbox` is installed at `$HOME/.burst/bin/live-inbox` (fetched from `house/live/tools/live-inbox` on main); a box that installs it elsewhere sets `LIVE_INBOX_BIN` to that folder (on the forge box, `/home/box/burst-run/bin`). `live-inbox` never guesses: a missing `LIVE_URL`, `SEAT_KEYS_DIR` or `LIVE_CURSORS` exits 2 and names it.

```bash
export PATH="${LIVE_INBOX_BIN:-$HOME/.burst/bin}:$PATH" LIVE_URL="${LIVE_URL:-https://burst-live-production.up.railway.app}" SEAT_KEYS_DIR="${SEAT_KEYS_DIR:-$HOME/.burst/seat-keys}" LIVE_CURSORS="${LIVE_CURSORS:-$HOME/.burst/cursors}"
```

0. On an owner message (a 1:1 or a room), run `live-inbox <seat> --prompt --from blaze` first, and add `--room <name>` when the message was in a room. Every turn runs `live-inbox <seat> --turn start --tag wake`: every webhook wake (including one with no owner message) and every 1:1 or room turn, not only webhook wakes. Every turn ends with step 7.
1. Read `.xray/state/STATION.md` after a compact, and on every wake (the station ticket; never hand-edit it), then read `.xray/state/NOTES.md` (the working page), and resume the same role and job. A compaction is a wake.
2. Read your inbox: `live-inbox <seat>`. A non-empty read is the work.
3. Handle each open line on its GitHub issue or PR, then ack it: `live-inbox <seat> --ack <id>`. Closed or merged lines are `live-inbox <seat> --ack stale` and then `--apply`. `--upto <id>` acks the stored prefix through that id, including live lines. `--ack all` acks every open line. A missing card, and an old handoff on a live card, stay until `--ack <id>`. When this seat owes a handoff, run `live-inbox <seat> --handoff <to> --pr <owner/repo#n> --kind <ready|critic_fail|live_pass|merge|ci_fail> --sha <head>` and send the printed line as a 1:1. A room post is never a handoff and never a wake: seats may not ack in a room, so a room receipt cannot be relied on.
4. One cloud agent per card. Before launching, check the board's `cloud_agent` lines and the CloudAgent list. If an agent for the card is running, or finished with a PR, steer that one instead of launching. One critic verdict per head. Every seat's deep work goes to a cloud agent, including long reviews and the reviewer's live passes. The agent wears the suit first (plates, the station ticket, the notes). The seat chat posts only the verdict and acks. Never hand-edit the station ticket to record this.
5. Notes after every beat: append to `.xray/state/NOTES.md` right after each real beat (PR opened or pushed, verdict, CI result, merge, deploy, handoff, blocker, cloud agent launch or cancel), with evidence (links, SHAs, comment ids). There is no pre-compact signal, so continuous writes are the only protection.
6. Last, update `.xray/state/NOTES.md`: the intent and the next cut. No secrets: never a key, token or PEM text, only the env var name where a secret lives. Never commit NOTES.md.
7. Turn end: `live-inbox <seat> --turn end --tag wake`. Run it on every exit path (empty inbox, early return, error), even when you leave before this step.
