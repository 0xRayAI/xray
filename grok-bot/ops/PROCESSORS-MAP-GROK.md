# Processors → what Grok Bot actually uses

Full catalog lives upstream in `docs/PROCESSORS.md` on 0xRay. This page is the **fleet map**.

## Rule
Wire **live host hooks** + **mill/git/release gates**.  
Do **not** rebuild the old ProcessorManager / post-processor loop / processor-pipeline MCP as bot gates.

## Use these
| When | Call |
|------|------|
| Before write/spawn | Host pre-tool gate (when suit worn) |
| After write | Light postprocessor (on in current plants) |
| Before/after commit, before push | Git hooks on the product repo |
| Before tag/publish | `npx @0xray/foundry gate` then `gate --verify-only` |
| Wear check | `npx @0xray/foundry inspect` |
| Docs | `npx @0xray/foundry docs-check` (+ live URL checks when needed) |

## Skip as bot release gates
Boot ProcessorManager lists, old PostProcessor loop, `processor-pipeline` MCP (not in the consumer tool set).

## Related
`THREE-LAYERS.md` · `HOOKS-GATE-CHECKLIST.md` · upstream `docs/PROCESSORS.md`
