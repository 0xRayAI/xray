---
name: setup-house
description: use this when a team has no house/ folder yet
---

# Set up a house

The operating page is the same for every team. Your house is who you are, where you post, and what you allow.

1. Run `grok-bot house init`. It copies `templates/house/` into `./house` and refuses if a target file already exists.
2. Fill HOUSE.md from what the owner has already said. Ask the owner only for what's missing, one question at a time.
3. Show the owner the filled HOUSE.md. Nothing in Allowed counts until they approve it.
4. Run `grok-bot doctor` until it passes.
5. Tell every seat to read `house/` on its next wake.

Change the house when the owner says a rule twice. Don't put rules there that belong on the operating page.
