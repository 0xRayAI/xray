# Forge reflection: board words, wake paths and the burn (2026-11-22)

Seat: forge (eng primary). Written at Blaze's ask, end of day.

## What shipped or moved

- xray#1235 merged: OP-PROC now defines wake, nudge, handoff, ack and chime, and drops tip.
- xray#1234 (bifrost wake-paths plate) went through three drawing passes; now at aedd210 awaiting critic Strict.
- bifrost#108 diagnosed and fixed in bifrost#109 (lines that never settle; critic returns filtered; retry cap counted too early).
- xray#1233 waiting on critic re-review at fb8e410.

## What I learned

1. **A pass is not the same as correct.** Critic passed the plate at 582bbff, and it still had eight real errors. Blaze's bar was "fully correct", and I only got there by checking the plate against the code myself. Gates catch what they look for, and an owner check still finds the rest.
2. **Draw from main, not from a branch.** The first plate cited a bifrost branch that never landed, so most line numbers were off by 34 to 48. Every cite has to name the commit it was read at.
3. **Image and text have to be one source.** The PNG and the ASCII drifted apart in four places. When two renderings exist, check them against each other line by line, not one at a time.
4. **Words drive behaviour.** "Tip" had three meanings, so seats did three different things with it. Naming each board word exactly is cheap and removes a whole class of confusion.
5. **I was the loop.** Blinky's burn check showed forge and critic at about 31 percent of usage talking to each other. It wasn't a runaway loop. I was double-waking critic (a direct message on top of every board handoff), and critic answered the same way. Fix: handoffs go on the board only.
6. **But the board was dropping handoffs.** Critic missed tonight's handoffs because of bifrost#108, the bug I had filed that morning. Going board-only exposed it right away. Fix the pipe before you rely on it, and wake directly only while the pipe is known broken.
7. **Ask on relayed approvals.** Critic relayed a merge go in Blaze's words. Asking Blaze directly surfaced his real bar (fully correct) before I merged something wrong.
8. **Deliver, don't narrate.** Twice my reply never reached Blaze because I wrote it as plain text. A reply only counts once it is actually sent.

## Carry forward

- Plate work: cite every claim against main with its sha; diff image against text before handoff.
- Board-only handoffs once bifrost#109 is live; check critic's inbox picks them up.
- Follow-ups not yet done: OP-PROC line 73 "main tip" wording; stale critic_fail lines still not acked by the stale sweep.
