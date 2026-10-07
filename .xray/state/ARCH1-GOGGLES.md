# Goggles — full plan for Arch1 (friend version)

2026-09-30 · local · not shipped · under development · calling off

Hand this whole page to Arch1.

## One breath

Goggles = eyes on the suit. Pick one way to look. Get a short card of goodies without reading the whole repo. Zoom only where you need a facet, feat, or fix. Don’t try to see everything at once. Not shipped yet.

## What we’re building

An agent looks at a thing (repo, seat, feature, plane) and gets the goodies fast — door in, key files, skills, what’s worn vs what’s on disk — without reading everything. Then zooms in only where a change is needed.

If look doesn’t return the card table below, it isn’t Goggles yet.

## How it feels

Put the glasses on.
Pick one way of looking (see lens card).
Get back a filled card (or a row per plane).
Zoom only if needed: whole place → a piece → one path → one thing.
Cut facet / feat / fix. Put things back (teardown). Stop.
OPEN stays empty until something is picked. Calling stays off.

## Lens card — all the types

### THE LENS (glasses on)

Checks the list of plane names against the names in the code.
Quiet when they match.
Does not read the live running suit by itself yet.
Worn field is where file ≠ what’s actually running (when known).

### WAYS OF LOOKING (pick one — open list, not locked to six)

| Type | Friend hear | What the look leans toward |
| --- | --- | --- |
| dichotomy | this vs that | splits, brakes, Frame A ≠ Frame B |
| syncopate | timing / beat | when things kick, cadence, stagger |
| synthesis | one picture from pieces | how parts fit without dumping all files |
| digest | short goodies | fill the card table — primary look for “what’s here” |
| triage | what’s broken / what first | empty Entry, missing Skills, Worn drift, holes |
| loop | the repeating cycle | card → build → gate → ship → lesson (not a repo dump) |

More types may show up later. Name one. Call it a reading. Don’t tell every flavor’s whole story at once.

### ZOOM (only after a way is picked)

whole place → a piece → one path → one thing

### OPEN

Empty slot. Nothing picked. Lit can mean “level you’re on,” not “feature unlocked.”

### STOP

If it looks like a pipeline drawing, leave this view and stop. Pipelines are not zoom steps. Don’t fold pipelines/ground into zoom without a new Blaze lock.

## The card table (what a look returns)

This is the digest shape. Notes still have it. Worn look does not return it anymore — bring it back.

| Field | What it holds |
| --- | --- |
| From | The plane you left. Empty means you are already inverted (home / ground). |
| Digest | The one line you can take back. |
| Plate | The stamp, if there is one. |
| Entry | The door in. |
| Exit | The door out. |
| Files | The key files. |
| Skills | SKILLS.md or one SKILL.md, if there is one. |
| Setup | What has to be true before. |
| Teardown | What you put back, including the return to ground. |
| Worn | What this session is actually running, if it differs from the file. |

### Rules for filling

- Digest: one honest line. No essay.
- Empty is allowed and meaningful (especially Entry / Exit / Setup / Teardown today).
- Worn: only when running path ≠ source path (e.g. dist/… vs src/…).
- Skills: name the file; don’t paste the skill body into the card.
- Plate: stamp id or empty — don’t invent stamps.
- From: set when you moved from another plane; empty on ground / already home.

## Last committed map (what was actually filled)

Filled from the last committed map. Exit, Setup, Teardown empty on every row. No row had Entry. Skills only on ground. Worn only on routing.

| Plane | Digest | Entry | Key files | Skills | Worn |
| --- | --- | --- | --- | --- | --- |
| ground | Home. The dev plane. | empty | src, grok-bot/OP-PROC.md, src/opencode/agents, Agents.md, src/integrations, package.json. Mill has no path. | SKILLS.md | empty |
| routing | Task text becomes an agent. | empty | src/nucleus/thin-dispatch.ts | empty | dist/nucleus/thin-dispatch.js |
| house | A state flow plate: the stages a house goes through before doctor says House: PASS. | empty | grok-bot/lib/seat-doctor.cjs | empty | empty |
| boot | BootOrchestrator.executeBootSequence brings the framework up. | empty | empty | empty | empty |
| governance | A proposal is deliberated inside the suit, filtered by Dynamo Solar, then merged. | empty | empty | empty | empty |
| memory-recall | Speech becomes a lesson. | empty | empty | empty | empty |
| orchestration | Multi-step work is planned, run, and closed. | empty | empty | empty | empty |
| processor | Three pipelines run in parallel. | empty | empty | empty | empty |
| reporting | Logs become a report. | empty | empty | empty | empty |

Also empty on every row: Exit · Setup · Teardown · Plate (not shown above).

Kind 0 name-checks the six outer names (dichotomy, syncopate, synthesis, digest, triage, loop) against the same six in the code. Quiet when that list matches. These nine are the card map, not that check. Do not collapse them. Do not fix Kind 0 into ground, routing, or the rest. Filling Files / Entry / Worn is the card, not Kind 0.

## Honest status (don’t stretch the suit)

| Claim | True now? |
| --- | --- |
| Two dials: lens + ways of looking; zoom separate | yes (shape) |
| OPEN empty; calling off; local / not shipped | yes |
| Kind 0 = names in file vs names in code | yes |
| Look returns the card table | no — notes only; worn look dropped it |
| Entry / Exit / Setup / Teardown filled | no — empty everywhere on last map |
| Live suit read as Kind 0 | no — later card |
| Pipelines are zoom | no — leave-view stop |
| Grok CLI shipped this | no — feat/goggles-look local, not committed |
| End-user “try it” | no — coming soon / under development |

Plate PNGs that still say pipelines-as-scope, lens-reads-running-suit, or CLI-shipped are ahead of the worn cut. File wins over picture.

## Build order for Arch1

1. Wire `look` back to `assemblePlane` and the field list already in the file. Same card, not a new format. Restore the rows from `a577ae76b`, or refill them only where that is still true. Test it. Digest first.
2. Replay / refresh the nine-plane map — keep digests honest; fill Files where true; keep Worn when dist ≠ src.
3. Fill holes that matter — Entry, Exit, Setup, Teardown where they exist; leave empty when they don’t (don’t invent).
4. One way of looking at a time — digest fills cards; triage highlights empties/drift; don’t stack every flavor.
5. Zoom after a card — big → piece → path → one thing → facet/feat/fix.
6. Stamps — local, not shipped, calling off, OPEN empty.

Do not fold pipelines into zoom. Do not claim live-suit Kind 0. Do not invent new plane names or a fixed outer count without Blaze.

## Done looks like

- look (digest) returns the card table for a plane or the set.
- Agent can answer “what’s here?” from Digest + Files + Skills + Worn without reading the tree.
- Empty Entry/Exit/Setup/Teardown are visible (triage can flag them).
- Zoom path to a change is clear from a filled row.
- Docs match worn behavior; friend can hear the product in the one-breath line.

## Acceptance (paste on the card)

- goal: look returns the card table again
- constraints: local only; calling off; no pipeline-as-zoom; no fake live-suit Kind 0; no invent empties
- path: digest look → fill fields from map + disk → Worn when differs → zoom optional
- acceptance: table shape matches fields above; Kind 0 still name-checks the six outer names, not the nine; at least Digest+Files path works for ground + routing; Entry/Exit/Setup/Teardown either filled from truth or left empty
- evidence: sample card output in chat or .xray/state/
- next owner: Arch1 → Blaze review
- escalate: if look would need a live suit inspect — stop and ask (new card)

## Tiny engineer appendix

Goggles = one of four kit organs (with Repertoire, Dynamo, Clearing). Not a host pack. Never “Grok Bot kit.”

Outer ways of looking (dichotomy…) ≠ these nine internal planes (ground, routing…). Different lists. Don’t collapse.

Suit also has seven operating planes (code, OP-PROC, model, suit, mill, host, test/ship) — another layer. Don’t collapse.

Synchronicity unplaced. Confer dark. No mystery plate types for “actuality.”

Older “four kinds” (domain / pipelines / ground) drafts are outdated. This friend page wins.

## Source

Last committed map + card field notes (Arch1 / Blaze 2026-09-30) · Host Pack / goggles floor eng 2026-09-29 · friend rewrite after bot-lingo fail · honesty on worn cut vs plate.
