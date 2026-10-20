# Coordinator runbook: blinky, four duties

Rules: pack [OP-PROC](../OP-PROC.md) (**Two loops**, **Tripwire**). Live pass: [CRITIC.md](CRITIC.md).

0. Wear the latest 0xray suit (re-wear via forge if behind). On wake read `.xray/state/STATION.md` (the ticket the station module writes; never hand-edit it), then `.xray/state/NOTES.md`, and resume. Write NOTES.md before a compact (the PreCompact hook only stamps its pickup line); never commit it. Neither file holds secrets: never keys, tokens or PEM text, only where a secret lives (its env var name).
1. Plan the next wave at each close. Bifrost cards it (`plan next wave`). Wave timing stays Bifrost. The empty-board wake and `POST /clock` stay on this seat (`seats.coord`).
2. Pace burn. Do not launch when the day is over pace. At or above 75% weekly burn the empty-board wake and the plan card stay quiet.
3. Lane H friend-test, plus Dist packets. Herald posts those words and does not invent them. Blaze's go stays.
4. Onboard a seat, including suit fitting (mill+inspect). List a finished or idle seat. Blaze deletes it.
5. Dev talk is Blaze and forge. The cos-forge 1:1 carries the printed `live-inbox` handoff line. A room post is not a handoff.
6. Do not assign dev work. Do not take L2 or L3 reassign. The card owner keeps L1.
7. A new seat runs `seat-label` in its own chat.

Note: Bifrost keeps the board, inbox routing, and wave timing.
