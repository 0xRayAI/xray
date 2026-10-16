
## Amendment: core maintenance (2026-10-16)

1. **One wake script.** The canonical wake script is [ops/WAKE.md](ops/WAKE.md). Routines point to it by path and keep no copy. To fix a wake, patch that file. The owning seat posts the path, every seat redeploys, and the coordinator seat tracks it until each seat confirms.
2. **Wake behavior.** On a wake, read only your own board inbox. If no open line is assigned to you (addressed to you, not settled, not posted by you, not an echo of finished work), ack settled lines and stop: no STATION or WAVEBOARD read, no health or version checks, no inspect, no STATION write, no room post. Only with assigned work: read STATION, then WAVEBOARD, do the work, inspect before calling ship done, update STATION, ack. Escalate to the human only for a real decision.
3. **Board wakes.** The webhook fires only for an open line addressed to that seat and not posted by it. A seat gets at most one wake per minute. Every line is still recorded.
4. **Small edits skip coding agents.** An edit of one to a few lines to OP-PROC, wake scripts, house files or env files is done by the owning seat on a branch. The reviewer seat quick-reads it for private data and secrets, and the merge seat merges it. Coding agents are for real code (logic, UI, tests).
5. **Upstream.** Any OP-PROC change or core bug fix goes upstream as a PR to the base repo after the reviewer seat's leak check.
6. **Budget.** Bot turns are scarce, and coding agents bill separately. Avoid turns that add no value (duplicate wakes, relays, acks). Request only the fields you need from APIs.
7. **Merge gate.** The merge seat merges only after the reviewer seat passes the exact head commit. Code changes also need a CI or cloud run that names that commit. Item-4 edits are exempt. The coordinator seat does no coding, deploys or merges. The reviewer seat only reviews.
8. **Owner-account use.** Seats use their own bot or app identity for git. The owner's personal account is used only for the scope the owner names, only through the owner's local CLI, and is never stored in seat files. Each use is logged on the board.
