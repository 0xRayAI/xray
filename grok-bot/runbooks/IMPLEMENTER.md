# Implementer runbook (one wave)

Written for the cloud agent forge launches. Forge pushes. Nothing here lives only in a seat's memory.
Rules it serves: pack [OP-PROC](../OP-PROC.md) (**Two loops**, **Routing**, Branch + PR always, Seat identity).

## 0. Station
- Wear the latest 0xray suit (re-wear via forge if behind). On wake read `.xray/state/STATION.md` (the ticket the station module writes; never hand-edit it), then `.xray/state/NOTES.md`, and resume. Write NOTES.md before a compact (the PreCompact hook only stamps its pickup line); never commit it. Neither file holds secrets: never keys, tokens or PEM text, only where a secret lives (its env var name).

## 0b. Read the plates first
- Before coding, read the stamped 0xray plates (`docs-site/docs/plates/*.md`) for the area you touch, and list them in the PR body's `Plates read:` field (PR template: `.github/pull_request_template.md` in the repo).

## 1. One branch per wave
- One wave = one branch = one PR. Code, docs, plates and nits for the wave all fold into it; no side PRs.
- Branch from fresh `origin/main` in its own worktree: `git fetch origin && git worktree add ../<seat>-lapN -b <seat>/<topic>-lapN origin/main`.
- Every item on the wave points at its GitHub issue or PR comment. Work with no GitHub record is not work.

## 2. Local commits only; the shipping seat pushes
- The cloud agent commits. Forge pushes with the forge App through `~/bin/gh-<seat>`, never plain `gh`. Do not keep a mill git identity.
- Never push, never open the PR, never comment as a personal login. The shipping seat (publisher) pushes through `~/bin/gh-<seat>`, never plain `gh`.
- One commit per coherent change, message `<area>: <what changed and why>`. Never commit secrets, wake URLs or keys.

## 3. Tests plus docs check
- Full suite: `house/live/tests/run_tests.sh` (Python, node, `bifrost init --check`, `bifrost check --dry-run`).
- Docs: `npm run release:docs-check` from the repo root (hard gate when the wave touches release docs).
- A flaky test is rerun alone several times (`node --test <file>` x5); fix it if the flake is real, never retry-until-green.

## 4. Restamp plates
- When a wave changes behavior a plate describes (`docs-site/docs/plates/*.md`, `house/live/docs/*.md`), update the plate text and its stamp in the same wave.
- Run `bifrost check --only names` so no stale name survives.

## 5. Write it down (**two hats**)
- Every wave includes the write-up for any rule it relies on or that was stated during it: a lexicon row, an OP-PROC line or a runbook step, in the same branch. A rule that only exists in chat counts as missing.

## 6. Sha handoff
Hand the shipping seat one packet (inbox line + DM pointing at it):
- branch and head sha, base sha;
- the commit list: `git log --oneline origin/main..HEAD`;
- test results (counts, exit codes) and the routing audit table (`bifrost-init --check --table`);
- the PR body: summary, the issues it closes, the `## Packet` block (goal, constraints, path, acceptance, gates, evidence, next owner, escalate), and any @-mention an outsider needs (real login, e.g. `@arch10x`).
Then stay quiet until the reviewer's PASS/FAIL or the shipping seat's ask.
