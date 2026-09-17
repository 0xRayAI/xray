# What Grok Bot runs when

When work happens, call these checks. This is **not** a copy of every 0xRay processor.

**A friend would hear:** Only the live gates and mill/git/release checks. Skip the old processor warehouse.

## Rule
Wire **live host hooks** + **mill / git / release** gates.
Do **not** rebuild ProcessorManager, the old PostProcessor loop, or `processor-pipeline` as bot gates.

Full inventory (humans only): `docs/PROCESSORS.md` on 0xRay. Do not paste it here.

## When → call

| When | Call |
|------|------|
| Before write or spawn | Host pre-tool gate: `evaluatePreToolGate` / Grok `pre-tool-use.js` (when the suit is worn) |
| After write | Light postprocessor `runGrokPostprocessorLight` (already on in current plants) |
| Before commit | Git `pre-commit` via `run-hook.js` on the **product** repo |
| After commit | Git `post-commit` + `inference_session_capture` |
| Before push | Git `pre-push` on the product repo |
| Before tag or publish | `npx @0xray/foundry gate` then `gate --verify-only` |
| Wear / plant check | `npx @0xray/foundry inspect` (six checks; `--skip-live` after install) |
| Docs freshness | `npx @0xray/foundry docs-check` (+ live URL checks when agents must read them) |
| Consumer pack | `consumer-install-smoke.mjs` / `pack:tmp-proof` |

## Skip (not bot release gates)
- Boot `PROCESSOR_DEFS` extras (`nudge`, `storytellingTrigger`, `spawnGovernance` — spawn is already the pre-tool gate)
- Old `PostProcessor` loop
- `processor-pipeline` MCP (not one of the seven tools this kit ships)
- Factory-only / helper processors from the inventory

## Review of this kit
Ops/docs mirrors of this map are **Normal**: implementer + CI. No Reviewer card.
**Strict** only for ship, live, security, or identity.

## Related
`THREE-LAYERS.md` · `HOOKS-GATE-CHECKLIST.md` · `LEAN-COMPUTE.md` · upstream `docs/PROCESSORS.md`
