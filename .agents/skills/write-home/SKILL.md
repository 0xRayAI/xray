---
name: write-home
description: >
  Read the write-home lens. Use when a log or an inference file is written.
---

# write-home

The file is `src/integrations/hooks/write-home.cjs`. The plate is `docs-site/docs/plates/write-home.md`.

Activity goes to `.xray/logs/activity.log`. The latest session goes to `.xray/inference/latest-session.json`. A read uses the new path when it exists, and the old path when it does not. The plates that stay with this lens are activity-log, session-capture, inference-files, trail-state, and suit-wear.

