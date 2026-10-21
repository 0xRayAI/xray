---
name: stamp-plate
description: >
  Stamp a plate or add a goggles lens in the 0xray repo.
  Use when the user says stamped plate, stamp a plate, create a plate,
  add a plate, lens, lense, add a plane, or name one plane.
---

# Stamp a plate or a lens

Do this. Do not explore the tree to rediscover it.

Work from a new branch and worktree off current `origin/main`. One plate, one ASCII file. Its optional PNG lives at `docs-site/static/plates/x/<id>.png`. Run the test named below before the PR.

## Which kind of plate

There are two kinds of stamped plate.

- **ASCII table plate (for agents).** The box drawing in `docs-site/docs/plates/<id>.md`, made with this skill. Every plate tied to a lens must be this kind. The lens and recall open it, it carries the file:line cites, and it is the source of truth for that plate.
- **Graphical plate (for X and people).** A PNG drawn with the `draw-stamped-card` skill from an ASCII plate critic already approved. It never adds a claim the ASCII plate does not have, and a lens never points at it. Commit it as `docs-site/static/plates/x/<id>.png`, named for its ASCII plate.

Order: the ASCII plate first, through critic. The graphical plate after, when X or people need it.

## Plate

1. Add `docs-site/docs/plates/<id>.md`.
   Frontmatter: `title`, `sidebar_label`, `plate_type`.
   `plate_type` is `state flow`, `domain model`, or omitted for a pipeline.
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
