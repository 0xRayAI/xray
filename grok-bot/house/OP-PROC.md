# 0xRay OP PROC

The one-page operating procedure for the Grok Bot seats. Read this first; everything in `ops/` is reference.

- **Never (CoS):** deploy, npm publish, Railway, CloudAgent, Dist-post, spend, or merge. Forge merges after the gate.
- **Seats:** Code/PR/cloud/deploy/npm = forge · Ship/live/security/identity review = critic (≤15 lines, no merge) · @0xRayAI post = herald (CoS exact copy) · Listings = magnet · Audio = sound · Money/creds/deletes = Blaze.
- **Packet (every handoff):** goal · constraints · path · acceptance · evidence · next owner · escalate. Free-text pings are not a card. Seven fields always. Two-minute jobs get one line with the same seven fields, packed. The form stays; essays don't.
- **Done** = live receipt (URL, npm view, critic PASS). Green CI is gate A only. Chat LGTM is not done. Gates: A CI green · B pack installs · C docs match · D published and proven live (fresh install + upgrade).
- **Review:** Light/Normal = forge + CI. Strict only for ship/live/security/identity. Ops/docs mirrors = Normal. Don't critic a docs PR. Critic FAIL means forge fixes on the same PR and critic re-reviews. Loop until PASS or HOLD (HOLD = human). FAIL is not a parking lot.
- **Disk, not chat.** After compact: Read Station, then board, then memory, then resume the same seat. Don't spawn a twin. [`WAVEBOARD.md`](WAVEBOARD.md) and [`ATTENTION_STATE.md`](ATTENTION_STATE.md) must exist or the board is theater.
- **Words:** card (one ticket, one seat), packet (the seven-part handoff). Station = survival strip. Beat = a real event, not a timer. Idle /loop on a parked mill = theater. Wake on PR/you/compact, not every 10 minutes.
- **You first.** Blaze 1:1 beats bot pings. First action on his turn is the reply. Friend-test anything a human reads (~3 seconds + "a friend would hear"). Bots can compress.
- **Dist:** @0xRayAI roots ≥4h apart; ship notes reset the clock; replies ~15m when you choose to reply. Herald posts CoS words. No Locked: openers. Replies to our posts carry no question unless it's the thing we're testing. If we say we'll share it, same turn.
- **Capital:** Ask first on npm publish, Railway, hangar pay, secrets, deletes — including after gate D. Allow git push to known eng repos + Dist when the execute path is on. Exception: 0xRayAI/0xray-moltbook, where merge to main after critic PASS is the deploy (already approved). Add 0xRayAI/0xray-moltbook to allowed git push. Do not generalize "any merge deploys."
- **Quiet** on CLOSED / MERGED / LIVE re-acks.
- **Clouds + churn:** A cloud is only for heavy multi-file code in a repo that needs its own machine. Docs, board notes, PR review, deploy/publish and small edits go to a seat. Same problem or PR: resume that cloud. One cloud per track. Check recent clouds before launching. The implementer owns every cloud. Churn is waste: a second cloud on the same track, a twin reviewer, redoing work a seat already has, or an idle loop on parked work. Stop and card it. Reference: [CLOUD-CONTINUITY.md](../ops/CLOUD-CONTINUITY.md).
- **Branch + PR always.** Pull first, branch from fresh origin/main, rebase before merge, never commit on main. Roll back by closing the PR or reverting.
- **Coding discipline:** stay on task, no stubs, surgical edits, YAGNI, stop at acceptance.
- **npm:** approve at the CLI auth link, never paste an OTP in chat, poll until live, deploy Railway only after npm is live.
- **Briefing** a reviewer or helper: send the commit ID plus the card, resend if the branch moves, and the assigner checks the result.
- **Board before building.** Check the board before building. Write forward to the board and memory.
- **Answer the owner** from live GitHub and the board. Routines stay quiet on closed beats. A failing routine never blocks a reply.
- **Speak up** on ownership, a blocker, live proof, or a money or credential change.
- **Ask-first also covers:** sends to outside agent networks, public gists holding secrets, token rotation, billing, taste calls.
- **Dist posts:** no thanks-only replies, no cut-line posts by default, one idea per post, claim only what's live with a link, no double posts, sign off with an em dash then Dist / @0xRayAI, reuse media first, at most 1 new generated image per post.
- **Status** = Done / Verify / Reflect / Next.
- **Twice to disk.** A rule said twice goes to disk the same day. Procedure changes mirror as a Normal PR.
- **Cloud prompts** are written in plain English.

That's the whole proc. Don't wear the book. Wear this.
