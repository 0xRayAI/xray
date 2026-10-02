---
source: framework
name: npm-auth
description: "Open npm's browser approval when publish or login has no terminal"
author: Xray Framework
version: 1.0.0
schema_version: "1.0"
category: devops
tags: [npm, publish, auth]
dependencies: []
---

# npm auth

Open the npm approval page and finish the publish. The agent shell is not a terminal. npm prints the page on a PTY that stays open.

## Open the page

1. Run `npm login --auth-type=web` or `npm publish --access public` on a PTY. Leave that PTY open until npm exits by itself.
2. When npm says Press ENTER, send one newline.
3. Hand the user the URL npm prints.
   - Login: `https://www.npmjs.com/login?next=/login/cli/<uuid>`
   - Publish: `https://www.npmjs.com/auth/cli/<uuid>`
4. Poll `https://registry.npmjs.org/-/v1/done?authId=<uuid>`. The body is the token. Do not print it, paste it into chat, or commit it.
5. If npm does not finish on its own, run `npm publish --access public --otp=<token>` without logging the token.
6. Poll `npm view <name>@<version>` until the registry lists the version. Tag only after it lists.

## When the saved token is dead

`npm whoami` returns 401. `npm publish` then returns 404 for a package that is already on the registry. Start `npm login --auth-type=web` and use the new page. A publish under `auth-and-writes` still needs its own approval page on the write.

## Keep the PTY

A closed stdin makes npm print the page and then exit with `Exit handler never called!` That done id is dead. A pipe with no PTY throws `EOTP` and prints no page.
