# Memory note

UNREVIEWED

## This track

- Cloud `bc-56bc3b5d-12e3-5aed-add7-656a9f094b7d`. One cloud for this track. Do not launch a second cloud for the GitHub Release procedure.
- PR https://github.com/0xRayAI/xray/pull/166 on `cursor/github-release-on-npm-ship-4b7d`, branched from fresh `origin/main` (`6a528390e`, feat(goggles): look at one pipeline).
- Run owner: Blaze. CoS seat is blinky. No Dist. Calling and Confer stay off. This PR does not bump a version and does not publish to npm.

## Publish done

- An npm publish of `0xray`, and of companion packages that get GitHub Releases, is not done until both are true: an annotated tag `vX.Y.Z` is pushed on the exact published commit, and a GitHub Release exists for that tag so Latest flips.
- A pushed tag alone is FAIL for gate D. The ship receipt includes the release URL.
- Roles: forge drafts the notes from CHANGELOG in the same pass as npm; critic friend-tests them in plain words a builder would hear; Blaze publishes the Release, or gives an explicit GO.
- Title: `vX.Y.Z — <short friend line>`.
- Body: ## What's new (3–7 plain bullets from CHANGELOG, shipped user/builder value only); ## Who it helps (one short line); ## How to get it (npm + tag + link to full CHANGELOG); ## Breaking / notes only if real, and omit that section if empty.
- Banned: one-liners and stub bodies ("wear-gated tarball only", "see CHANGELOG", empty); gate jargon (Kind 0, calling, organ, worn, OP-PROC internals); Dist/X voice, hype, emojis-as-substance; features that are not in CHANGELOG.
- `npx @0xray/foundry release` still ends at the tag. The GitHub Release is a seat step after the script.

## Constraints on the next edit

- `grok-bot/OP-PROC.md` is 30 lines. `src/__tests__/unit/plates.test.ts` fails if it grows, and fails if `Kind 0` or `outer plane` appears outside the npm row. The npm row must keep the text `gate jargon (Kind 0,`.
- House copy: `grok-bot/house/OP-PROC.md`. Its skill link is `../skills/ship-ready-mill-gate/SKILL.md`. No 30-line cap on that file.
- The Light / Normal / Strict table in `grok-bot/skills/ship-ready-mill-gate/SKILL.md` stays intact.
- CHANGELOG `[4.0.31]` on main says "Not published from this commit" and describes goggles. Blaze (2026-09-30 CT) said `0xray@4.0.31` shipped, the tag was annotated, and the GitHub Release was skipped so Latest stayed on v4.0.30. Do not treat that changelog sentence as a hold on this procedure PR, and do not republish from this docs change.
- Companion line in that changelog section: `@0xray/grok-bot` unchanged at 0.1.8.
- In-repo cloud notes live at `grok-bot/ops/cloud-memory/` and start with `UNREVIEWED`. There was no `forge-suit/ops/cloud-memory/` directory in this checkout.
