# Operating procedure

How the roles work. Read this first. Who you are, where you post, and which repos you may push live in `house/`. If that folder is missing, start from `templates/house/`. Name your seats anything. [Example house (names are illustrative)](templates/house/EXAMPLE.md).

- **Coordinator never:** deploy, publish a package, change production, launch a cloud agent, post in public, spend, or merge. A seat never merges code it wrote: the implementer writes code and opens PRs; the publisher keeps continuity, gates and the merge chain.
- **Roles:** The seat field is the role, not a personal name. Code, pull requests, cloud work, deploys, and package publish = **implementer**. Shipping after review = **publisher**. Ship, live, security, and identity review = **reviewer** (a short note, no merge). Public posts, listings, and audio are optional **specialists**. The coordinator is also called CoS. Money, credentials, and deletes = the **human owner**. **New seat before any ship work:** clear role description; fasten suit (mill+inspect) with inspect receipt on disk (`ok: true`, suit fastened, costume false); orientation + KB (role card, scope, grow mem from receipts); seat reads KT/orientation and acks before first carded job; if role was announced publicly, standing ROLE board card matching the announcement; CoS cards first work — seat quiet until carded; a new seat starts with only its profile + new-hire packet. A chat packet alone is not a suit.
- **Card:** one GitHub issue or pull request (`repo#number`). Fields: title, url, owner seat, stage (`open` > `review` > `fix` > `merge` > `retest` > `done`), and state (`live`, `parked`, or `closed`). A chat ping is not a card.
- **Packet:** the card's eight fields — goal, constraints, path, acceptance, gates, evidence, next owner, escalate. `gates:` is set by the implementer; the reviewer may raise it, never lower it; it locks once review starts. They come from a `## Packet` block in the issue or pull request body, or from one line. Each field is at most 200 characters, and links are allowlisted. If acceptance or next owner is missing, the card is amber with a `no packet` badge. Evidence fills from the latest beat.
- **Handoff = packet + wake.** Every handoff to a seat is two things: (1) the packet on that seat's Bifrost board inbox, which is the tracked record (ack, board, nudges); (2) a one-line message through the fleet's own internal messaging that points to the packet, which is the wake. Never one without the other. A webhook is the wake only when a fleet has no internal messaging.
- **Beat:** one real event — a pull request opened or pushed, a review verdict, a CI result, a merge, a merge-queue tick, an owner message, or a blocker. A watcher run whose start and end fall in the same second is never a beat. An idle loop on parked work is theater. The station is the survival strip. Wake on a PR, a person, or a compact.

Packet template:

```
## Packet
- goal:
- constraints:
- path:
- acceptance:
- gates:
- evidence:
- next owner:
- escalate:
```

One line, when the job is short: `goal: … · constraints: … · path: … · acceptance: … · gates: … · evidence: … · next owner: … · escalate: …`
- **Done** = a live receipt (a URL, a registry view, a GitHub Release URL, or reviewer PASS). Green CI is only gate A. Gates: A CI green, B the pack installs, C the docs match, D published and proven live (fresh install and upgrade, annotated tag pushed, GitHub Release so Latest flips). A pushed tag alone is FAIL for gate D. **Floor:** gates A and C on every merge. B and D are set per PR by scope (subsystem, module, component touched) in the packet's `gates:` field: does it work across all TUI environments, and are the docs updated throughout. Per-scope criteria: set per PR for now. TUI environments: Cursor, Grok CLI, Hermes, OpenCode, OpenClaw. **Gate B runs on the owner's machine** (seat computers lack these environments): when `gates:` calls for B, the packed tarball plus a per-environment checklist (git and non-git folder, temp home, run and update the `.cjs`/`.mjs` files for each TUI environment) is run either by a seat through owner-approved local tool steps, or handed to the deep-review seat in a PR comment when it runs locally there. Cloud runs (cloud agents, cloud deep review) never satisfy B. Whoever runs it posts the receipt; B stays unverified until that receipt exists. A chat "looks good" is not done.
- **Review:** Light and Normal = implementer + CI. Strict only for ship, live, security, or identity. Doc copies = Normal. Label every finding blocker, nit, or unverified. The first review lists every blocker; a re-review checks only those; nits never start a round. One fix round per PR; a second FAIL goes to the human owner. Outage fixes may iterate in small rounds. Merge needs the reviewer PASS posted as a GitHub App review on the PR; a chat PASS or a personal-account approval never counts.
- **Disk, not chat.** After compact: read the station, then the board, then memory, then resume the same role. Don't start a second copy. Read `house/WAVEBOARD.md` and `house/ATTENTION_STATE.md` first; if missing, use `templates/house/`. No board file means the board is theater.
- **You first.** The human's direct message beats bot pings. Reply first. Anything a human reads should land in about three seconds. **Public voice** (account, spacing, replies) is a placeholder in `house/`. Don't open with "Locked:". If you say you will share something, do it the same turn. **Quiet** when someone only repeats CLOSED, MERGED, or LIVE.
- **Money and ship:** Ask first before you publish, change production, pay, touch secrets, or delete — unless `house/` names an exception. Git push only to repos named in `house/`. A "merge deploys this repo" exception is named there, one repo at a time.

| Rule | What to do |
|---|---|
| Clouds + churn | Heavy multi-file code only. Cloud work goes as a follow-up to the existing cloud agent session that holds the context; log its id on the Card. Launch a new agent only when (a) no session has context for that repo, or (b) **all three** hold: the context-holding agent already has 2+ jobs queued, the new job touches different files, and the job can be briefed from the docs alone. Otherwise, queue it as a follow-up on the existing session. [CLOUD-CONTINUITY.md](https://github.com/0xRayAI/xray/blob/main/grok-bot/ops/CLOUD-CONTINUITY.md). |
| Branch + PR always | Pull first, branch from fresh origin/main, rebase before merge, never commit on main. Roll back by closing the PR or reverting. |
| Coding discipline | Stay on task, no stubs, surgical edits, YAGNI, stop at acceptance. |
| npm | CLI auth, no OTP in chat, poll until live. Not done until both: an annotated tag `vX.Y.Z` pushed on the published commit, and a GitHub Release for that tag so Latest flips. A pushed tag alone is FAIL. The ship receipt includes the release URL. Railway after npm. [Publish](skills/ship-ready-mill-gate/SKILL.md). The implementer drafts the notes from CHANGELOG in the same pass as npm. The reviewer friend-tests them (plain words a builder would hear). The human owner publishes the Release (or an explicit GO). Title: `vX.Y.Z — <short friend line>`. The body is a real Release, not a tag annotation. ## What's new — 3–7 plain bullets from CHANGELOG (shipped user/builder value only). ## Who it helps — one short line (builders / suit wearers / …). ## How to get it — npm + tag + link to full CHANGELOG. ## Breaking / notes — only if real; omit the section if empty. Banned: one-liners / stub bodies ("wear-gated tarball only", "see CHANGELOG", empty); gate jargon (Kind 0, calling, organ, worn, OP-PROC internals); Dist/X voice, hype, emojis-as-substance; inventing features not in CHANGELOG. |
| Proof | Every fix ships with a test that fails when the fix is reverted. |
| Seat identity | Post, push and review only through the seat's own GitHub App. Never a personal token or a `GITHUB_TOKEN` fallback. Keys are never pasted. |
| Release order | Bump, stamp (`version-manager --artifacts-only`), docs-check (hard gate), pack, Strict, CI, merge, wear. Only the tested tarball ships. |
| Stacked fixes | A fix to another seat's or fleet's PR goes as a stacked PR from the seat's App, on a base branch at that PR's tip, plus a fold-ask comment. Never push to their branch. |
| Fold watch | When an awaited PR is folded or gets a new tip, the watcher posts it to the room at once. |
| Stuck tools | If Shell or tools break, reboot the seat computer first, then re-probe. |
| Briefing | Send the commit ID plus the card, resend if the branch moves, and the assigner checks the result. |
| Board before building | Check the board before building. Write forward to the board and memory. |
| Answer the owner | Answer from live GitHub and the board. Routines stay quiet on closed beats. A failing routine never blocks a reply. |
| Speak up | On ownership, a blocker, live proof, or a money or credential change. |
| Ask-first also covers | Sends to outside agent networks, public gists holding secrets, token rotation, billing, taste calls. |
| Dist | No thanks-only replies. No cut-lines by default. [VOICE.md](https://github.com/0xRayAI/xray/blob/main/grok-bot/ops/dist/VOICE.md). |
| Status | Done / Verify / Reflect / Next. |
| Twice to disk | A rule said twice goes to disk the same day. Procedure changes mirror as a Normal PR. |
| Cloud prompts | Written in plain English. |

**House.** The page above is the same for every team. Yours is `house/`: **Owner**, **Seats**, **Public voice**, **Allowed**, **Ask first**, **Board** (`house/WAVEBOARD.md`, `house/ATTENTION_STATE.md`). Seats read `house/` first; the house wins only for those six. Your five principles live in your `house/OP-PROC.md` after init. Optional roster (role, seat name, agent id): `house/ROLE-MAP.md`. Ask first and Allow are enforced only in `house/AUTO-REVIEW.md`. Setup: `grok-bot house init`, fill HOUSE.md, show the owner (nothing in Allowed counts until they approve), run `grok-bot doctor`. Change the house when the owner says a rule twice. The six higher-level rules, the Confer cadence, the Board rules and the RACI table are in [CADENCE.md](CADENCE.md). Goggles views one plane.
