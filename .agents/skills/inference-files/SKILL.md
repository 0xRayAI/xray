---
name: inference-files
description: >
  Read the inference-files lens. Use when an inference cycle or session file is the page.
---

# inference-files

The loader is `loadSessionInferences` in `src/inference/inference-accumulator.ts`.

Cycle state, history, graded ids, and governance state live in `.xray/inference`. Session files still fall back to `docs/inference` until the writers move. The plates that stay with this lens are session-capture, write-home, and suit-organs.

