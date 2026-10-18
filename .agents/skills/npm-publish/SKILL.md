---
name: npm-publish
description: >
  Use when publishing to npm, an OTP link, an approval link, or https://www.npmjs.com/auth/cli.
  The release script is the only stamp. Run it in the live TTY and paste the link it prints.
---

# npm publish

The skill is this file. The longer gate is `grok-bot/skills/ship-ready-mill-gate/SKILL.md`. This lens is the default find.

1. Run `node scripts/foundry/release.mjs patch --i-mean-it` in the live TTY. When `package.json` is already the next version, run `node scripts/foundry/release.mjs --publish-only --i-mean-it`. That script is the only stamp. Do not run `npm publish` or `git tag` beside it.
2. While it waits, the script's `npm publish` prints `Authenticate your account at:` and `https://www.npmjs.com/auth/cli/<id>`. Paste that URL. Do not press Enter. Do not open a browser here. Do not pass `--otp`. Do not ask for a 6-digit code. A 401 from `npm whoami` does not skip the script.
3. The script polls `npm view`, pushes the annotated tag, and runs Gate D. After it exits 0, the only manual step is the GitHub Release.
