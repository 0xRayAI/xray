Plane: dev
From:
Digest: This checkout.
Plate:
Entry: package.json, src, and grok-bot/OP-PROC.md.
Exit: A change that stays in this repo.
Files: src, grok-bot, docs-site, AGENTS.md, package.json, README.md
Skills: SKILLS.md
Setup: You are in this repo.
Teardown: Leave other repos alone.
Worn:

Plane: integration
From: dev
Digest: How one part calls the next.
Plate:
Entry: The hook, the dispatch, or the bridge this file sits on.
Exit: The next call. Stop there.
Files: src/integrations, src/nucleus, src/governance, src/mcps, src/processors, src/reporting, src/core/boot-orchestrator.ts, grok-bot/lib, grok-bot/templates
Skills: SKILLS.md
Setup: One connection at a time.
Teardown: Do not sweep the rest of the repo.
Worn:

Plane: domain
From: dev
Digest: The drawing of one area.
Plate: docs-site/docs/plates
Entry: The plate under docs-site/docs/plates, or the plate reader.
Exit: The entry and exit written on that plate.
Files: docs-site/docs/plates, src/integrations/hooks/plates.cjs, .agents/skills
Skills: .agents/skills
Setup: One plate is in the frame.
Teardown: The plate is the drawing. The code stays on dev or integration.
Worn:

Plane: ecosystem
From: dev
Digest: What this repo wears from outside.
Plate:
Entry: scripts/foundry, and the @0xray packages this repo wears.
Exit: Back to this checkout when the change is here.
Files: scripts/foundry, node_modules/@0xray
Skills:
Setup: The outside package is not this repo.
Teardown: Do not edit a worn package from here.
Worn: node_modules/@0xray
