---
name: stamp-plate
description: >
  Stamp a plate or add a goggles lens in the 0xray repo.
  Use when the user says stamped plate, stamp a plate, create a plate,
  add a plate, lens, lense, add a plane, or name one plane.
---

# Stamp a plate or a lens

Do this. Do not explore the tree to rediscover it.

Work from a new branch and worktree off current `origin/main`. One plate, one ASCII file. Its X copy is a PNG at `docs-site/static/plates/x/<id>.png`. An X PNG is freely designed in the stamped style (riveted frame, icon cards with bold caps condensed titles, glowing cyan block arrows, numbered tiles, footer banner) and must flow the same as the `.md` plate: same nodes, text, order, edges and layers, checked by the flow-equivalence test in `src/__tests__/unit/plates.test.ts`. Run that test before the PR.

## Which kind of plate

There are two kinds of stamped plate.

- **ASCII table plate (for agents).** The box drawing in `docs-site/docs/plates/<id>.md`, made with this skill. Every plate tied to a lens must be this kind. The lens and recall open it, it carries the file:line cites, and it is the source of truth for that plate.
- **Graphical plate (for X and people).** An X PNG freely designed in the stamped style: riveted frame, icon cards with bold caps condensed titles, glowing cyan block arrows, numbered tiles, footer banner. It must flow the same as the `.md` plate: same nodes, text, order, edges and layers. The flow-equivalence test checks that. It adds no claim the ASCII plate does not have, and a lens never points at it. Width stays 1280. Height grows before any font shrinks. A line is never cut. Commit it as `docs-site/static/plates/x/<id>.png`. Draw it with `grok-bot/skills/draw-stamped-card/recipes/layered-flow/render.py`. The references in `.agents/skills/stamp-plate/refs/` are the stamped frame (`stamped-frame.png`), the flow the markdown already has (`flow-source.png`), and one infographic in that style (`infographic.png`).

Order: the ASCII plate first, through critic. The graphical plate after, when X or people need it.

## Plate

1. Add `docs-site/docs/plates/<id>.md`.
   Frontmatter: `title`, `sidebar_label`, `plate_type`.
   `plate_type` is `pipeline`, `state flow`, or `domain model`.
   The body is a box drawing. A pipeline plate contains the words `INPUT` and `OUTPUT`. A state flow or domain model does not have to.
   End with `stamped · 0xray <version>` using the version already in `package.json`. Do not bump the package.
2. Add `<id>` in the same position in both id lists:
   `src/memory-routing/plates.ts` `PLATE_IDS`
   `src/integrations/hooks/plates.cjs` `PLATE_IDS`
3. Add `CUES` for `<id>` in `plates.cjs`. Use a phrase (`review plate`, `re-review`). A bare common word steals recall or ties, and a tie recalls nothing. `in-house tooling review` must stay null.
4. Put `<id>` in the array in `src/__tests__/unit/plates.test.ts` and add one `recallPlate` assertion.
5. Add the doc to `docs-site/sidebars.ts` and the matching section of `docs-site/docs/plates/index.md`.
6. Run `npx vitest run src/__tests__/unit/plates.test.ts`.

Write `.agents/skills/<id>/SKILL.md` in the same change. Short steps for this one artifact.

`stampPlateIfMissing` copies that file to `.xray/state/plates/<id>.md` only when the copy is missing.

## Missing plate

A card with no plate needs one plate. Stamp that one plate for the card. Do not add a plane. Do not stamp a second plate for the same card. The hook does not write the plate. You do, with the steps above.

## Lens

The planes are dev, integration, domain, and ecosystem. A plane holds many cards. One card is one thing. Each card has its own plate, and it can name more on the Plates row. Do not add a fifth plane.

A session starts on dev. The cards are in `.xray/state/LENS.md`. A search inside the current card runs. Any other search returns the current card. The path switches the card. A missing plate names this skill.

1. Write the skill in the same change as the plate.
2. Run `npx vitest run src/__tests__/unit/goggles-pipeline.test.ts src/__tests__/unit/plates.test.ts` from the worktree.

## Deep dive

A plate is the drawing for a path you opened and explained. A file you only named does not get one.

1. One plate for the top file. A child you opened and explained gets its own plate.
2. A plate id is not a plane. The planes stay the four above.
3. The hook does not author the plate. The seat does, with the steps above.
