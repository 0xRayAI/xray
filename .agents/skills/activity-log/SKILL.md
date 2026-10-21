---
name: activity-log
description: >
  Read the activity-log lens. Use when something appends or reads activity.log.
---

# activity-log

The writer is `src/core/activity-logger.ts`. The plate is `docs-site/docs/plates/activity-log.md`.

Shipped `log_path` is `.opencode/logs`, and the logger strips a trailing `/logs`, so the file is `.opencode/activity.log`. With no path, the fallback is `logs/framework/activity.log`. write-home names `.xray/logs/activity.log` and the logger does not call it. The plates that stay with this lens are write-home, reporting, and suit-organs.
