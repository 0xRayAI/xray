---
name: stamp-plate
description: >
  Stamp a plate or add a goggles lens in the 0xray repo.
  Use when the user says stamped plate, stamp a plate, create a plate,
  add a plate, lens, lense, add a plane, or name one plane.
---

# Stamp a plate or a lens

Do this. Do not explore the tree to rediscover it.

Work from a new branch and worktree off current `origin/main`. One plate, one file. Run the test named below before the PR.

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

`stampPlateIfMissing` copies that file to `.xray/state/plates/<id>.md` only when the copy is missing.

## Lens

A search lens is one token in `CARD_PLANES` inside `src/integrations/hooks/goggles-pipeline.mjs`. A hyphenated name is one word (`memory-recall`).

1. Add the token to `CARD_PLANES`.
2. Add a `<token>` entry with `files` in `src/integrations/hooks/goggles-planes.json`, beside `routing` and `house`.
3. Leave the top-level `planes` array as it is. That array is the worn set, not the search lens.
4. A pipeline lens also gets a plate, type omitted, with `INPUT` and `OUTPUT`. `ground` is a lens with no plate file.
5. Run `npx vitest run src/__tests__/unit/goggles-pipeline.test.ts`.

Naming exactly one plane lets the search continue. Zero planes, or more than one, stops it with `Name one plane.`
