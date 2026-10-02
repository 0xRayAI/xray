---
name: lens-gate
description: >
  Read the lens-gate lens. Use when this path is the one being opened.
---

# lens-gate

The function is `lensBeforeResearch` in `src/integrations/hooks/goggles-pipeline.mjs`. The plate is `docs-site/docs/plates/lens-gate.md`.

1. A research call is `read_file`, `grep`, `glob`, a researcher tool, or a shell that runs `rg`, `grep`, `ag`, `ack`, `fd`, `find`, or `git grep`.
2. Exactly one card-plane name lets that call continue. Zero, or more than one, stops it with `Name one plane.`
3. The hook does not author a plate or a lens.
4. The plate that stays with this lens is pre-tool.
