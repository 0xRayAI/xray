# Cloud prompt footer

This file is `grok-bot/ops/cloud-memory/PROMPT-FOOTER.md`. Append it to a cloud agent prompt. The rule is Fallout in `grok-bot/OP-PROC.md`.

The seat that launched the cloud logs every owner message as activity before anything else, including a quick follow-up that arrives mid-turn. The command is step 1 of `grok-bot/skills/station/SKILL.md`.

Forge cards each line of the list below before replying.

## Fell out

End the report with a Fell out list. One line per item that showed up outside the job: a deferred item, a held plate, a review follow-up, an owner later, or a bug found while reading.

Each line carries a one-line what, `From:` (this card or pull request), `Waiting on:` (`#N merged`, `#N closed`, or `nothing`), and `Owner:`.

`Waiting on:` releases when that issue or pull request merges or closes. The release appends a new archive row (`key|stage|state|updated`). The earlier row stays.

An empty list is written `Fell out: nothing`.

A line that still has no card is a miss. The miss becomes a new card. The pull request under review keeps its own verdict.
