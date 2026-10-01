# Reflection

UNREVIEWED

Cloud: bc-56bc3b5d-12e3-5aed-add7-656a9f094b7d
PR: https://github.com/0xRayAI/xray/pull/166
Branch: cursor/github-release-on-npm-ship-4b7d

## What I did

Updated the npm publish rule so a ship stays open until both of these exist: an annotated tag `vX.Y.Z` on the published commit, and a GitHub Release for that tag so the Releases page Latest badge moves. The ship receipt includes the release URL. A pushed tag alone is FAIL for gate D.

The release body is the CoS pattern, not a one-line stub. Forge drafts it from CHANGELOG in the same pass as npm. Critic friend-tests it in plain words a builder would hear. Blaze publishes it, or gives an explicit GO. Title: `vX.Y.Z — <short friend line>`. Sections: What's new (3–7 bullets of shipped value), Who it helps (one line), How to get it (npm, tag, link to the full CHANGELOG), and Breaking / notes only when there is something real.

The same rule is on the general OP-PROC page, the house page, the ship-ready mill gate (publish steps 6–7; the Light / Normal / Strict table is unchanged), the lead-cadence gate D row, and the orchestrator publish bullet. The foundry release script still stops at the tag. The GitHub Release is a seat step after that.

`plates.test.ts` still keeps the one-page procedure at 30 lines, and still rejects `Kind 0` everywhere except the npm row, where the banned list has to name it.

Local tests passed: plates, lead-cadence, grok-bot house template (13 tests).

## What went wrong

The VM checkout was one commit behind origin/main (goggles pipeline, #160). CHANGELOG [4.0.31] was not in that stale tree. Fetched before branching.

The general OP-PROC file cannot grow past 30 lines, so the note pattern had to fit inside the existing npm row. A new section would fail `plates.test.ts`.

That same test rejects the text `Kind 0` on the page. The CoS banned list names `Kind 0`. The first draft dropped the token to stay green, which would have been a paraphrase. The test now allows it only on the npm row, inside `gate jargon (Kind 0,`.

There is no `forge-suit/` tree in this checkout and no `forge-suit` repo under 0xRayAI. Cloud notes in this repo live at `grok-bot/ops/cloud-memory/`.

## What I'd do differently

Read the 30-line cap and the `Kind 0` assertion before writing the npm row. The row would have been one line from the start, and the test exception would have been part of the first commit instead of a follow-up.
