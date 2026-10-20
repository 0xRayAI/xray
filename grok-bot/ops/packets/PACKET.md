# Packet: npm test failures on main (#397)

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

## Packet

- goal: `npm test` on current main is green. The seven failures in #397 are fixed in place. No test is skipped or deleted.
- constraints: Minimal diffs. Do not edit the vendored organ. Do not put a closing keyword on #397. Packet sections are scope, files, tests, and docs.
- path: This file, then the files below, on one branch.
- acceptance: The seven tests pass. A full `npm test` pass count is higher than the baseline and the fail count is zero.
- gates: A and C. B and D stay off. This is not a publish.
- evidence: Baseline on `0965e9737` is 7 failed, 4083 passed, 15 skipped (4105). After this change, `npm test` is 0 failed, 4092 passed, 15 skipped (4107).
- next owner: critic
- escalate: owner, if a failure is declared out of scope after this packet

Plates read: `docs-site/docs/plates/routing.md`, `docs-site/docs/plates/governance.md`, `docs-site/docs/plates/suit-wear.md`, `docs-site/docs/plates/repertoire.md`, `docs-site/docs/plates/lens-gate.md`.

## Scope

Seven failures from `npm test` on `0965e9737` (7 failed, 4083 passed, 15 skipped). Each line says whether the test or the code is wrong.

1. Plane routing. `selectAgentForTask follows the file when a plane is named` expects `scoreAndRoute('open the boot plane')` to set `file` to `src/core/boot-orchestrator.ts`. `lensPlane` only reads `suitHint`, and `suitHint` only names the four planes (`dev`, `integration`, `domain`, `ecosystem`), so `boot` yields no files. The test is right. The code is wrong. `suitHint('open the boot plane')` stays empty; that goggles assertion stays.
2. Governance revision. `revises a proposal that names a plane and is not about that file` expects `needs_revision` and the boot file in the summary. `govern` already revises an approve when `lensPlane` returns a file the proposal does not mention. The same empty `lensPlane` result leaves the vote at approve. The test is right. The governance branch is right. `lensPlane` is wrong.
3. Fasten writes. `second fasten keeps file bytes and skips repeat writes` expects zero writes. A mill plugin gains catalog `SKILL.md` files that are not in the plugin source tree, so the settle check fails and the plugin is deleted and copied again. The test is right. The code is wrong.
4. Organ float. `repeats the same confidence and agent, then sees a changed file` expects the second confidence to deeply equal the first. The file cache stores the signals parse. Decay then uses the wall clock, so a later lookup of the same file moves `avgConfidence` by about `4e-11` (`0.8828882590148883` then `0.8828882589703781`). The test is right. The cache is incomplete. The vendored decay formula stays.
5. OpenCode mirror, three assertions. `.opencode/agents/ contains YML agent files`, `.opencode/codex.codex exists`, and infrastructure `should have agent configuration files`. The build used `cp -r src/opencode/ .opencode/`. When `.opencode` already exists, GNU cp nests `.opencode/opencode/` and the tests' paths stay missing. The tests are right. The copy is wrong. `npm test` runs the corrected copy before vitest so the suite does not need a full `tsc`. A checkout with no `dist` can still fail other tests; that is out of scope.

Out of scope: compiling `dist` inside `npm test`, changing vendored decay, skipping any of the seven tests.

## Files

- `src/integrations/hooks/goggles-pipeline.mjs` — `lensPlane` resolves one named card that is not one of the four planes. Two names stay quiet. `suitHint` is unchanged.
- `src/nucleus/thin-dispatch.ts` — comment only.
- `scripts/node/install-bridges.cjs` — a settled mill plugin includes the catalog skill bodies, so a repeat fasten does not wipe the tree.
- `src/memory-routing/lookup-cache.ts` — repeat `getTaskConfidence` for one task while the signals file stamp is unchanged.
- `scripts/node/materialize-opencode-mirror.cjs` — merge `src/opencode` into an existing `.opencode`.
- `package.json` — `build` and `test` run that script instead of `cp -r src/opencode/ .opencode/`.
- `src/__tests__/unit/materialize-opencode.test.ts` — the merge does not nest, and both scripts call it.
- `docs-site/docs/plates/routing.md` — one card attaches its first file; two names stay quiet.

## Tests

Kept, not skipped:

- `src/__tests__/unit/agent-capabilities-routing.test.ts`
- `src/__tests__/unit/governance-service.test.ts`
- `src/__tests__/unit/install-bridges-config.test.ts`
- `src/__tests__/unit/memory-routing/lookup-cache.test.ts`
- `src/__tests__/e2e/postinstall-config-e2e.test.ts`
- `src/__tests__/infrastructure/infrastructure.test.ts`
- `src/__tests__/unit/goggles-pipeline.test.ts` (`suitHint('open the boot plane')` stays empty)
- `src/__tests__/unit/materialize-opencode.test.ts` (new)

Proof is `npm test` before and after.

## Docs

`docs-site/docs/plates/routing.md` matches the card rule. The governance plate already lists `needs_revision` as a vote. No other manual page changes.
