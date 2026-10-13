# Board

A card is one GitHub issue or pull request. A beat is a real event on it. A packet is the structured fields (goal, constraints, path, acceptance, evidence, next owner, escalate).

## Close

A merge, an issue close, or a pull request close sets the card to done and closed and clears its nudge. It does not stay live waiting for a retest tick. A failed retest after merge needs a new issue.

The owner's own comment that the work is resolved also closes the card. A comment from someone else does not.

## Holds

A card is held when any of these is true:

- the owner posts a comment whose first line is `Held: <reason>`, with an optional `until:` line
- the issue or pull request has a label in `GITHUB_HOLD_LABEL` (default `on-hold`)
- a Jira item's status matches `JIRA_HOLD_STATUS` (default `On Hold`), compared without case

A held card stays visible, is not a stall, and gets no level 1, 2, or 3 nudge. If it stays held with no beat past `HELD_MAX_S` (default 72 hours), the owner gets one nudge.

A `Parked:` comment still parks the card and wins over a hold.

## No nudge

`NO_NUDGE_REPOS` is a comma list of `owner/name` or `owner/*`. Those cards stay on the board and get no stall line and no nudge, including the past-max hold nudge. Unset means no repo is excluded.

## Layout

The page groups cards that a seat is working on, then pinned cards, then one group per seat. Issues whose title names a pull request in the same repo fold under that pull request. A run of more than three loose issues collapses to one line.

## Ghost cards

Each feed pass asks GitHub which issue and pull request numbers are still open. A card that is not closed and not pinned, whose repo answered, and whose number is absent, is closed. A repo whose query fails is left alone.

## Seat activity (#275)

Every seat must log these lines, or it goes dark on the board even while it's busy. The box status reporter pushes these files to the server. The server never reads chats.

| What | Where (box, under the run dir) | Line |
|---|---|---|
| Turn start / end, background task start / end (desktop runs too), watcher start / stop | `fleet/activity.jsonl` | `{"t_ct","seat","kind":"turn"\|"subagent"\|"watcher","action":"start"\|"end","tag"?}` |
| Owner → seat message, seat → seat or room message (a pulse) | `fleet/prompts.jsonl` | `{"t_ct","from","to"}` only. Never the text, never a secret |
| Cloud agent launch / finish | `fleet/cloud-agents.jsonl` | `{"t_ct","by","action":"launch"\|"reply"\|"finished"\|"cancel","agent"}` |

Seats off the box (for example Arch1) POST the same shapes to `/activity` with their seat key (`kind: prompt|turn|subagent|watcher|cloud_agent`). A seat counts as working while it has an open turn or task, or one of its cloud agents is running. Pulses never become inbox lines or wakes (see [inbox.md](inbox.md), routing guardrails).

Vocabulary: **cards** are the work items (one per PR or issue). **Beats** are real events on a card, and they reset its idle clock. **Pulses** are liveness signals only. **Packets** are tracked asks in an inbox, and **acks** close them. **Nudges** are packets the server creates after 60 min with no beat. **Wakes** are content-free webhook doorbells that follow packets. **Seat status** is the working or idle light.

## Page behaviour (lap2)

- The header "N of M bots active" counts the strip's seats with the same seat state the chips show (working > live > active > idle), so the two always agree. Server-side, a wake that lands, an inbox read or an ack also makes a seat active.
- Board grouping: each card sits under its seat (next owner, else owner). A card in review also shows as waiting under the review seat (`L.REVIEW_SEAT`; ours is critic), so the reviewer's group shows its queue, not only its done cards.
- Rewound or replaying, the Board shows the cards as of the timeline point (cards whose first beat is at or before it, beats up to it). Cards carry their last few beats only, so very old points are approximate.
- Packets fly for 2.6 s with a halo and a fading path, so each hop is visible seat to seat. The REPLAY badge shows once: on the pill during a replay pass, beside it only for the ambient replay loop.
- Lens labels are kept inside the canvas. The kit maps no avatars (it ships none); a fleet overlay maps the images it ships, the rest use the drawn badge.
