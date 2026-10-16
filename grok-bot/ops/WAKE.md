# WAKE — canonical wake script

Routines say "follow the script at <path>". This file is the only copy. Do not paste it into routines.

1. **Read only your own board inbox.**
2. **Is an open line assigned to you?** It must be addressed to you, not settled, not posted by you, and not an echo of finished work.
3. **No → stop.** Ack any settled lines and end the turn. Skip the STATION and WAVEBOARD reads. Skip health and version checks, inspect, the STATION write, and any room post.
4. **Yes → work.** Read STATION, then WAVEBOARD. Do the work. Run inspect before you call ship done. Update STATION. Ack the line.
5. **Escalate to the human only for a real decision.** Do not escalate status, FYIs, or anything already cleared.
