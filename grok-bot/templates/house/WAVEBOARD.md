# WAVEBOARD

This file is the board when `LIVE_URL` is unset. When `LIVE_URL` is set, open cards are Bifrost (`GET /cards`) and new work goes there.

Open cards. One card, one owner.

The live board is filled from the feed. A card is one GitHub issue or pull request (`repo#number`): title, url, owner seat, stage (`open` > `review` > `fix` > `merge` > `retest` > `done`), state (`live`, `parked`, or `closed`).

A packet is that card's seven fields. A beat is one real event: opened or pushed, review verdict, CI, merge, merge-queue tick, owner message, or blocker. A watcher run whose start and end fall in the same second is not a beat.

```
## Packet
- goal:
- constraints:
- path:
- acceptance:
- evidence:
- next owner:
- escalate:
```
