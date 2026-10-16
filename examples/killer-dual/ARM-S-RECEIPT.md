# ARM-S receipt — KILLER-DUAL suited

**Did not** hand-invoke `src/integrations/cursor/hooks/pre-compact.js`. Host fire is Y only if invoke-probe logged `event=preCompact` or `.xray/state/cursor-precompact.json` was written by the host.

| | |
|--|--|
| Ticket | KILLER-DUAL-CLOUD |
| Arm | **S (suited)** |
| Cloud | `bc-cd19bb4e-a4bc-57da-8979-754bb0c202fe` — https://cursor.com/agents/bc-cd19bb4e-a4bc-57da-8979-754bb0c202fe |
| Model (run-info) | `cursor-grok-4.6-high` |
| Window cite | **Grok 500k locked** (ticket). Host `context_window_size`: **MISS**. |
| Compact class (this snapshot) | `cursor-host-precompact-FAIL` (pre-fire). Post-fire: `RECEIPT-HOST-PRECOMPACT.md` |

## Harness proof

| Check | Result |
|-------|--------|
| `hooks-at-boot` | **YES** |
| `.cursor/hooks.json` at first probe | present (662 bytes, version 1, `preToolUse` / `preCompact` / `afterFileEdit` via `invoke-probe.sh`) |
| `src/integrations/cursor/hooks/pre-compact.js` | present |
| Live `preToolUse` spawn | **yes** — `.xray/state/cursor-hook-invoke.log` |
| Host `preCompact` | **N** — invoke-probe `event=preCompact` count **0**; `cursor-precompact.json` absent |
| Repertoire fastened | **yes** — `node_modules/@0xray/repertoire` → realpath `vendor/@0xray/repertoire` `@0xray/repertoire@0.2.0`; provider + 8 signals; Station `Repertoire: on — 8 signals` |
| Mill plant present | `scripts/foundry/plant/skills/mill/SKILL.md` + `inspect/SKILL.md` (factory exo; not a consumer mint this run) |

### Boot (HEAD before research pull-as-hook-fix)

`git rev-parse HEAD` = `6fd253d808b814fbe10bcd6bc0a3e4109626de4d` — `Merge pull request #52 from 0xRayAI/cursor/host-fire-4-precompact-b223` · branch `main` then `cursor/killer-dual-arm-s-02fe`.

### Repertoire wear cite

```
vendor: /workspace/vendor/@0xray/repertoire
worn:   /workspace/node_modules/@0xray/repertoire
name:   @0xray/repertoire@0.2.0
providerExists: true
signalsExists: true (8)
resume: Repertoire: on — 8 signals
```

`scripts/node/wear-vendored-repertoire.cjs` + postinstall `wear-repertoire` log.

## Usage (real — not chars÷4)

| Source | Cite |
|--------|------|
| `cursor-cloud` `run-info` | `bcId` `bc-cd19bb4e-a4bc-57da-8979-754bb0c202fe`, `originalModelName` `cursor-grok-4.6-high`, `createdAtMs` `1789463537810`, run URL above |
| `cursor-cloud` `environment-info` | env `3bdf392a-aebd-11f1-bf4b-42ffb4d10ea7`, build `bld-20260915-d4853023-9cec-4899-aba8-38845c2d0d93`, `gitSetup=reuse`, `warmFork=warm_fork` |
| `cursor-cloud` `get-events` | **count 0** |
| Host token fields | **MISS** (`context_tokens` / `context_usage_percent` / `context_window_size` never arrived — those live on `preCompact` stdin) |
| FILL / chars÷4 | **not used** (`classifyUsageCite` forbids it) |

Peak real usage cite this run: **Cloud MCP identity** `cursor-grok-4.6-high` @ `bc-cd19bb4e-…202fe`. Token counts: **MISS** (honest). Dashboard usage meter: **not exposed** on `run-info` / `get-events`.

## Compact row

Live Station (gitignored; seed `STATION.seed.md`):

```
Compact: preCompact N (count=0) · usage MISS · repertoire fastened
Usage: source=cursor-cloud-run-info model=cursor-grok-4.6-high window=Grok 500k locked … tokens=MISS
```

Snapshot: `cursor-usage-receipt.snapshot.json`.

## Verify

`npm test -- src/__tests__/unit/cursor-hooks.test.ts` — **10 passed**. Also `station-hot-swap` + `wear-vendored-repertoire` (25 tests combined). After `npm ci` + `npm run build` on this snapshot — `dist/` was missing at boot; invoke-probe still logged because it prints **before** `exec` of the hook JS.

## PR

Branch pushed: `cursor/killer-dual-arm-s-02fe`. **PR create FAIL** this run: `ManagePullRequest` could not look up `github.com/0xRayAI/xray` (`[unauthenticated] Error`). Compare: https://github.com/0xRayAI/xray/compare/main...cursor/killer-dual-arm-s-02fe
