# Cloud agents — when and how

## Default: suited seats first
Named agents already have suits, memory, live docs, and machine access. Prefer them for routing, review, merge, deploy, live checks, thin edits, and anything that needs fleet context.

Do not spin a cloud to redo what a suited seat can do. That wastes credits.

## When to use a cloud
Only for **heavy multi-file code work in a git repo** that needs an isolated coding machine.

## When not to
Docs, checklists, board notes, restating CI, reviewing an open PR, deploy/publish, Light/Normal local work, a second cloud on the same track.

## Continuity
1. Same problem / PR / ship track → **resume** that cloud. Keep its branch.
2. Genuinely new outcome → launch new.
3. One cloud per ship track unless work is truly independent.
4. Before launch: list recent clouds; resume if lineage exists.

Chat seats after a long thread or a rolled-up history: `skills/survive-compact/SKILL.md` — read disk first; resume clouds as above.

## Handoff
Implementer owns the cloud. Coordinator may point at a track — does not puppeteer.

**Into cloud:** goal · repo · branch/PR · constraints · acceptance tests · resume id if same track.  
**Out:** PR URL · commit · what to verify — then seats take over.

Clouds cut metal. Seats run the company.
