---
name: inference-cycle
description: >
  Read the inference-cycle lens. Use when the inference cycle is the page.
---

# inference-cycle

The file is `src/inference/inference-cycle.ts`. The plate is `docs-site/docs/plates/inference-cycle.md`.

1. Read this lens. The skill is this file.
2. The class is `InferenceCycle`. The phases are collecting, proposing, governing, applying, deploying, and verifying.
3. The shipped flag leaves Dynamo off. Apply and verify run on the CLI cycle only when something was approved.
4. `govern-and-apply` calls `governExternalProposals` and does not apply.
