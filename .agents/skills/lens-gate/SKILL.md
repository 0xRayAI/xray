---
name: lens-gate
description: >
  Read the lens-gate lens. Use when this path is the one being opened.
---

# lens-gate

The function is `lensBeforeResearch` in `src/integrations/hooks/goggles-pipeline.mjs`. The plate is `docs-site/docs/plates/lens-gate.md`.

1. A session starts on dev. The card is in `.xray/state/LENS.md`.
2. The planes are dev, integration, domain, and ecosystem. The hook looks at the path.
3. A search inside the current card runs. A search of another plane returns the current card and does not run. A path on no plane runs. A path outside this checkout runs, including inside a terminal command.
4. Opening a file on the current card adds nothing.
5. Opening a file on another plane switches, returns that card, and the open proceeds.
6. A file on no plane stays on the current plane. The open proceeds.
7. A switch sticks. Compact writes that same card back.
8. A card with no plate names `.agents/skills/stamp-plate/SKILL.md`. Stamp one plate for that card. The hook does not write it.
