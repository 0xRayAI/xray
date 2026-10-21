---
name: pre-tool
description: >
  Read the pre-tool lens. Use when this path is the one being opened.
---

# pre-tool

The Grok hook is `src/integrations/grok/hooks/pre-tool-use.js`. The Cursor hook is `src/integrations/cursor/hooks/pre-tool-use.js`. The plate is `docs-site/docs/plates/pre-tool.md`.

1. Both hosts join the command, the written content, and the paths.
2. Both run `evaluatePreToolGate` before the lens.
3. Cursor calls `lensDecision`. Grok calls `lensBeforeResearch`.
4. A deny from that gate finishes the hook. The tool does not run.
5. The plate that stays with this lens is lens-gate.
