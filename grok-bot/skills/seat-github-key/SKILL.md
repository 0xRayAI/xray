---
name: seat-github-key
description: >
  ~/bin/gh-<seat> mints a fresh GitHub App install token on every call and
  fails closed. Never print the token or the PEM.
---

# Seat GitHub key

`~/bin/gh-<seat>` is the only GitHub CLI this seat runs.

1. Every call runs `~/.config/<seat>/github-app-mint-token.sh` and the env file in that directory.
2. The wrapper mints a fresh App install token on that call. It does not reuse a cached token.
3. A failed mint exits non-zero. It does not fall through to `GITHUB_TOKEN`, plain `gh`, or another seat's key.
4. The wrapper prints neither the token nor the PEM. Those words stay out of stdout, stderr, and the board.
5. A seat with no App does not mint. It hands the branch and the PR body to a seat that has one.

`Keys:` on `.xray/state/STATION.md` is the wrapper name `gh-<seat>`, never a secret.
