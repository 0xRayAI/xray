---
name: lens-gate
description: >
  Read the lens-gate lens. Use when this path is the one being opened.
---

# lens-gate

The function is `lensBeforeResearch` in `src/integrations/hooks/goggles-pipeline.mjs`. The plate is `docs-site/docs/plates/lens-gate.md`.

1. A research call is `read_file`, `grep`, `glob`, a researcher tool, or a shell that runs `rg`, `grep`, `ag`, `ack`, `fd`, `find`, or `git grep`.
2. A shell that runs `python3`, `node`, `cat`, `head`, `tail`, `sed`, `less`, `more`, `bat`, or `awk` against a project source file is also research. `echo` naming a path is not.
3. Exactly one card-plane name lets that call continue. Zero, or more than one, stops it with `Name one plane.`
4. The first open of a source file that no lens lists is allowed and remembered. The next search stops until that file is on a lens and `docs-site/docs/plates/<id>.md` is on disk. The next edit stops too, unless it is the plate, the lens json, the skill, or the registry.
5. The hook does not author a plate or a lens.
6. The plate that stays with this lens is pre-tool.
