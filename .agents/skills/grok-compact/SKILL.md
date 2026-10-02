---
name: grok-compact
description: >
  Read the grok-compact lens. Use when Grok PreCompact or session-start.js pre_compact is the path.
---

# grok-compact

The file is `src/integrations/grok/hooks/session-start.js`. The plate is `docs-site/docs/plates/grok-compact.md`.

1. PreCompact runs this file with `--hook-event=pre_compact`.
2. On pre_compact and post_compact it writes the station card, does not match the conversation, and prints nothing. Grok ignores hook stdout.
3. The plates that stay with this lens are payload-heat, cursor-compact, and work-fresh.

