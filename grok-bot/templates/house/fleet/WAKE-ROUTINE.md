# Seat wake routine (template)

The prompt each seat installs as its webhook-triggered Bifrost inbox wake routine (inbox docs: `house/live/docs/inbox.md` in the repo). Replace `<seat>`; set `SEAT_KEYS_DIR`, `LIVE_CURSORS` and `LIVE_URL` as folder or URL names only, never a key value.

1. Read `.xray/state/STATION.md` (the station ticket; never hand-edit it), then read `.xray/state/NOTES.md`, and resume the same role and job.
2. Read your inbox: `live-inbox <seat>`. A non-empty read is the work.
3. Handle each open line on its GitHub issue or PR, then ack it: `live-inbox <seat> --ack <id>`.
4. Last, update `.xray/state/NOTES.md`: the intent and the next cut. No secrets: never a key, token or PEM text, only the env var name where a secret lives. Never commit NOTES.md.

Every handoff uses one command: `live-inbox <seat> --handoff <to> --pr <owner/repo#n> --kind <ready|critic_fail|live_pass|merge|ci_fail> [--sha <head>]`. It posts the inbox packet. Send the one line it prints as a 1:1 to the next seat. A room post is not a handoff and does not replace that line.
