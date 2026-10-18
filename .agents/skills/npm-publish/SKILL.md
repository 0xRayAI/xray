---
name: npm-publish
description: >
  Use when publishing to npm, an OTP link, an approval link, or https://www.npmjs.com/auth/cli.
  The release script is the only stamp. Run npm publish in the live TTY and paste the link.
---

# npm publish

The skill is this file. The longer gate is `grok-bot/skills/ship-ready-mill-gate/SKILL.md`. This lens is the default find.

1. The only stamp is `node scripts/foundry/release.mjs patch --i-mean-it`. Reconcile `--apply` and the stamper refuse to run alone on this repo.
2. When `package.json` is already the next version, run `node scripts/foundry/release.mjs --publish-only --i-mean-it`.
3. In the live TTY run `npm publish --access public`. No `--auth-type=web`. No `--otp=` from chat. Do not pipe it through `tee`. A 401 from `npm whoami` does not skip this command.
4. The CLI prints `Authenticate your account at:` and `https://www.npmjs.com/auth/cli/<id>`. Paste that URL. Do not press Enter. Do not open a browser here. Do not ask for a 6-digit code.
5. Wait on that same CLI for `+ <name>@<version>`. Poll `npm view <name> version` until it matches. Then push the annotated tag `v<version>` on that commit, and open the GitHub Release.
