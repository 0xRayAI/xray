# 0xRay processors → Grok Bot fleet map

SSOT catalog: `ops/0XRAY-PROCESSORS.md` (from 0xRayAI/xray PR #32 / `docs/PROCESSORS.md`)  
Blaze ask 2026-09-13: digest pre/post processors; many belong in **release scripts/gates** here.

## Rule
- Map **A (live hooks)** + **C (mill/git/CI)** into fleet release.
- Do **not** reimplement **B (ProcessorManager / old PostProcessor / processor-pipeline MCP)** as Bot gates.
- Grok Bot is **not** a fifth wear floor — no fake PreToolUse deny costume.

## Pipeline A — Agent tool hooks

| 0xRay id | Pre/Post | In this fleet? | Where / how |
|----------|----------|----------------|-------------|
| `evaluatePreToolGate` | pre | **Partial** | Worn via mill suit on seats that fastened 0xray; CoS/forge/critic/herald have mill+inspect. Not a CoS chat gate. |
| `grok-pre-tool-use` | pre | **When suit worn** | Host hook from `0xray` plant — not ship-ready skill |
| `grok-post-tool-use` / `runGrokPostprocessorLight` | post | **When suit worn** | ON in plant (`grok_postprocessor_light`) |
| SessionStart / compact | session | **When suit worn** | Host hooks |
| OpenCode / Hermes / OpenClaw twins | pre/post | **N/A / optional** | Only if those hosts fastened |

**Fleet stand-in (no PreToolUse):** Codex via **critic receipts** + `codex-fleet-constitution` skill — not tool deny.

## Pipeline B — ProcessorManager (legacy)

| Cluster | In this fleet? |
|---------|----------------|
| Boot pre: preValidate, tsc, codexCompliance, testAutoCreation, versionCompliance, errorBoundary, agentsMdValidation, logProtection, spawnGovernance, performanceBudget, asyncPattern, consoleLogGuard | **Not as Bot release gates** — shipped-legacy in npm; do not reimplement |
| Boot post: storytelling, sessionSummary, stateValidation, testExecution, regression, coverage, inferenceImprovement, nudge, refactoringLogging, commitBatcher, publishPreflight, postProcessorChain | **Not as Bot release gates** |
| Old `PostProcessor` loop | **Do not port** |
| `processor-pipeline` MCP | **Not in consumer 7** — skip |

**Useful twin ideas already covered elsewhere:**
- `agentsMdValidation` → ship-ready Task C + C2 live curls
- `versionCompliance` → package.json in core docs + foundry reconcile
- `publishPreflight` → ship-ready A–D + `foundry gate`
- `consoleLogGuard` → git pre-commit when hooks installed

## Pipeline C — Mill / git / release / CI → **primary map**

| 0xRay id | Pre/Post | In this fleet? | Implementation here |
|----------|----------|----------------|---------------------|
| `mint` | pre-wear | **Yes** | `@0xray/foundry mint` / fasten-suit skill |
| `inspect` (6 checks) | pre/post wear | **Yes** | foundry inspect; SUIT-ATTESTATION |
| `gate` / `gate --verify-only` | pre-publish | **Partial** | Used on 0xray npm ships; encode as hard step in ship-ready Task D |
| `release` (reconcile→stamp→gate→publish→tag) | release | **Partial** | forge owns npm after critic PASS; Blaze token |
| `docs-check` / `docs-build` | pre | **Partial** | Task C; C2 live curls added 2026-09-13 |
| `prepublishOnly` | pre-npm | **On 0xray package** | Not mirrored as Bot script yet |
| git `pre-commit` / `pre-push` | pre | **If hooks installed** | `npx @0xray/foundry hooks` — verify seats |
| git `post-commit` / `post-push` | post | **If hooks installed** | log/inference capture |
| CI mill-ci / enforce-agents-md / enforce-version | pre-merge | **On 0xRayAI/xray** | groover CI thinner (test only) — **gap** |

## Fleet-native gates (not named “processors” but same job)

| Gate | Pre/Post | Skill / ops |
|------|----------|-------------|
| Ship-ready A–D | pre-merge/publish | `ship-ready-mill-gate` |
| Core docs + `package.json` | pre | Task C general list |
| Live AGENTS/SKILLS/llms curl | pre | Task C2 |
| Critic PASS receipt | pre | critic seat |
| Done = pushed/live | post | OPS-SPEC |
| Gibberish check | pre-Dist | `GIBBERISH-CHECK.md` |
| Dynamo PASS citation | pre-mint (Groover) | factory-parity / #29 |
| Hangar pin | post-identity | optional receipt |

## Gaps (move into release scripts/gates)

1. **Hard `foundry gate` + `gate --verify-only`** before every npm publish (Task D) — not optional.
2. **`foundry docs-check`** in critic receipt for mill products.
3. **Confirm git hooks installed** on eng seats (`foundry hooks`).
4. **Groover CI** lacks mill/docs/agents enforce jobs — add or accept thinner plant.
5. Do **not** stand up ProcessorManager or processor-pipeline MCP on Grok seats.

## Recommended release order (this fleet)

```
worktree + PR
  → CI green
  → mill mint/inspect (if suit product)
  → docs core + live C2 curls
  → critic PASS
  → merge
  → foundry gate → gate --verify-only
  → npm publish / Railway deploy
  → Done curls (npm view / live AGENTS / health)
  → Dist (gibberish) if capital GO
```

## PRs
- Catalog: https://github.com/0xRayAI/xray/pull/32
