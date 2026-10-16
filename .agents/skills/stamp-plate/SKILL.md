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

The lens with the same id is the door. Stamp it in the same change. It lists one skill.

`stampPlateIfMissing` copies that file to `.xray/state/plates/<id>.md` only when the copy is missing.

## Lens

A search lens is one token in `CARD_PLANES` inside `src/integrations/hooks/goggles-pipeline.mjs`. A hyphenated name is one word (`memory-recall`). A new token must not sit inside an existing token, and an existing token must not sit inside the new one.

The lens is the door. It lists one skill. Read the lens and the skill is already there.

1. Add the token to `CARD_PLANES`.
2. Add a `<token>` entry in `src/integrations/hooks/goggles-planes.json`, beside `routing` and `house`.
   - `files`: the file this lens stands for.
   - `skills`: `.agents/skills/<token>/SKILL.md`. One path. That file is in the same change. Do not add `src/skills/<token>/SKILL.md`.
   - `plates`: the other plate ids that belong with this lens. Do not repeat `<token>`. The lens's own drawing is `docs-site/docs/plates/<token>.md`.
3. Leave the top-level `planes` array as it is. That array is the worn set, not the search lens.
4. Write `.agents/skills/<token>/SKILL.md` in the same change. Short steps for this one artifact.
5. A pipeline lens also gets a plate, type omitted, with `INPUT` and `OUTPUT`. `ground` lists `SKILLS.md` and has no plate file.
6. Opening the lens's own drawing, or a plate named in `plates`, stays on the plane. Any other drawing is refused: `The reading is <token>. That drawing is not the plane.`
7. Run `npx vitest run src/__tests__/unit/goggles-pipeline.test.ts` from the worktree. The worktree needs `dist` or the worn build drifts.

Naming exactly one plane lets the search continue. Zero planes, or more than one, stops it with `Name one plane.`

## Deep dive

Every process you open, and every segue of code you follow in that dive, gets a stamped plate and a lens in the same change.

1. The depth is the path you opened. A file you only named does not get one. A file you opened and explained does.
2. One plate for the top file is too shallow once the children are open. Each opened segue gets its own plate and its own lens.
3. The token must not contain an existing card name, and an existing card name must not contain the token. `boot` is already a plane, so a token that contains `boot` is illegal.
4. The hook does not author the plate. The seat does, with the steps above.
