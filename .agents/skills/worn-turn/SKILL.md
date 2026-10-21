---
name: worn-turn
description: >
  Read the worn-turn lens. Use when the tool hook chain is the page.
---

# worn-turn

The plate is `docs-site/docs/plates/worn-turn.md`.

1. Cursor and Grok both run `evaluatePreToolGate`, then a codex check, then the lens, then `repertoireRoute`.
2. A deny stops the hook.
3. This chain does not call `InferenceCycle` or Dynamo. The shipped flag is off.
4. The plates that stay with this lens are pre-tool, delegation-gate, and lens-gate.
