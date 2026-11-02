# Cloud prompt footer

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

This file is `grok-bot/ops/cloud-memory/PROMPT-FOOTER.md`. Append it to a cloud agent prompt.

The prompt log is step 1 of [station](../../skills/station/SKILL.md). The card rule, including fallout, is [Card](../../OP-PROC.md#card).

## Fell out

End the report with a Fell out list, one line per item the card rule names.

Each line carries a one-line what, `From:`, `Waiting on:`, and `Owner:`.

A bullet that names a bug, gap, follow-up, or ask must also carry `repo#n` (`xray#808` or `owner/repo#n`) or a GitHub issue, pull, or comment URL. A bullet without that link fails the footer check.

An empty list is written `Fell out: nothing`.
