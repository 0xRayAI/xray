---
name: pre-tool
description: >
  Read the pre-tool lens. Use when this path is the one being opened.
---

# pre-tool

The hook is `src/integrations/grok/hooks/pre-tool-use.js`. The plate is `docs-site/docs/plates/pre-tool.md`.

1. `extractFromEvent` collects the command, the written content, and the file paths.
2. Those strings are joined and passed to `lensBeforeResearch`.
3. A deny from that gate finishes the hook. The tool does not run.
4. The plate that stays with this lens is lens-gate.
