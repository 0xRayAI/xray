---
name: foundry
description: >
  Use when the release script, an npm publish, an OTP link, or an approval link is the page.
  The release script is the only stamp.
---

# foundry

The file is `scripts/foundry/release.mjs`. The plate is `docs-site/docs/plates/foundry.md`. The OTP link is `npm-publish`.

1. Read this lens. The skill is this file.
2. The only stamp is `node scripts/foundry/release.mjs patch --i-mean-it`, in the live TTY. Reconcile and the stamper refuse to run alone on this repo.
3. While that script waits, paste the `auth/cli` URL. Do not press Enter. The script publishes and pushes the tag. The GitHub Release is the step after it exits.
