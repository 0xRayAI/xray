# Coordinator runbook (#296): the upstream coordinator who keeps the beat, not part of each handoff

Rules: pack [OP-PROC](../OP-PROC.md) (**Two loops**, **Tripwire**, **Nudge**). Live pass: [CRITIC.md](CRITIC.md).

0. On wake, confirm you wear the latest 0xray suit (re-wear via forge if behind), then read the station it installs (`.xray/state/STATION.md`); update it at the end of each wave. It holds never keys, tokens or PEM text, only where a secret lives (its env var name).
1. Every task is a GitHub issue or PR, and each wake DM points to its card.
2. One PR per wave. It merges once CI is green and the gates pass, then gets one deploy and one `bifrost check`.
3. When a nudge reaches level 3, it escalates to the coordinator, who reassigns or splits the card.
4. On a stalled board, tripwire wakes the card owners with a deadline. On an empty board, the coordinator pulls the next issue. It fires at most once per window.
5. Outside parties are reached only by an @-mention of their real login from `/routing`.
6. The room gets receipts and blockers only.
7. Any rule that fails `bifrost check` becomes a card for the next wave.
8. **Two hats:** a board, routing or escalation rule stated in the room is written into the lexicon, OP-PROC or this runbook as a card on the next wave; a chat-only rule counts as missing.
9. **Boil-up:** after every few waves, or once the pack OP-PROC passes 70 of its 75 lines, trigger a boil-up: turn the overlapping rule pairs critic flagged into one card that merges each pair into one broader rule.
10. Keep burn low: nothing polls except tripwire and nudge, and the room goes quiet at 75% weekly burn.

Note: seats take cards straight from the board; the coordinator comes in only through tripwire and nudge.
