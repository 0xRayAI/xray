# Inventory — dead, alive, aside

Working paper for this maintenance cycle. Not a ship file. Do not commit it.

Tree: `main` at `601cdafc0` (published `0xray@4.0.34`). Counts below are the three walks. Spot-checks are marked.

A segment is alive when a worn entry reaches it, or a flag turns it on. Aside means it is on disk and parked on purpose. Dead means it is on disk and nothing worn calls it.

## Plate rule (later pass, not started)

A stamped plate pairs with a lens the inventory calls alive. The stamp pass runs after this list. Dead code and parked code get no plate. A pipeline facet does not get its own plate.

Ground keeps no plate file. `plateSource` in `src/integrations/hooks/goggles-pipeline.mjs` returns an empty body when the id is `ground`.

## Alive

Worn entries:

- CLI bin `0xray` → `dist/cli/index.js`, source `src/cli/index.ts`.
- Seven MCP servers in `.mcp.json`: governance, skills, enforcer, orchestrator, researcher, code-review, architect-tools. Repertoire and goggles are extra launchers, not part of that seven.
- `npm install` only links vendored Repertoire (`scripts/node/postinstall.cjs`). Suit files are `npx 0xray wear`.
- Hooks that actually start: Grok `session-start.js`, `pre-tool-use.js`, `post-tool-use.js`. Cursor shell wrappers call the package `.js` bodies.

Organs that are on:

- Repertoire memory routing and the inference cycle (`xray/features.json`).
- The lens: CLI `look` / `goggles`, MCP look, and `scoreAndRoute` from the Grok pre-tool hook and from `selectAgentForTask`.
- Local confer is called and always abstains.
- User asides are enabled. No aside file is stored under `.xray/state/asides/`.

Router allowlist is 22 names, all `status: "active"` in `src/agents/registry.ts`. The delegator reads `xray/routing-mappings.json`. The TypeScript copy `src/config/routing-mappings.ts` had no importer and is removed.

`src/delegation/agent-delegator.ts` does not load that TypeScript table. It reads `xray/routing-mappings.json` (or a project overlay). Spot-check: `content-creator` is in the registry and the TypeScript table, and is absent from `xray/routing-mappings.json`. Registered, and missing from the file the delegator loads.

Source folders a worn root reaches:

`agents`, `analytics`, `architect`, `cli`, `config`, `core`, `delegation`, `enforcement`, `execution`, `governance`, `inference`, `integrations`, `mcps`, `memory-routing`, `metrics`, `monitoring`, `nucleus`, `orchestrator`, `plugin`, `postprocessor`, `processors`, `reporting`, `security`, `services`, `session`, `skills`, `state`, `types`, `utils`, `validation`.

Worn plant is mill + inspect. Blip and sound fasten only when `foundry.json` asks.

## Aside

Parked on purpose:

- Synthesis is off (`synthesis.enabled` false).
- Inference governance is off, and the chain path inside that block is off.
- Confer quorum stays dark on this frontier host. No `confer.enabled` key.
- `auto_provision_worktree` is false.
- Phase E, calling, and synchronicity stay a written park in `.xray/state/ARCH1-GOGGLES-TUI.md`. Do not start Phase E.

Shipped, and not the routed agent:

Twenty of the 42 `src/opencode/agents/*.yml` files are never the routed agent: `api-design`, `architecture-patterns`, `auto-format`, `boot-orchestrator`, `framework-compliance-audit`, `git-workflow`, `hermes-agent`, `inference-improve`, `lint`, `model-health-check`, `performance-analysis`, `performance-optimization`, `processor-pipeline`, `project-analysis`, `security-scan`, `session-management`, `state-manager`, `storyteller`, `testing-best-practices`, `ui-ux-design`. Seventeen of those names still appear as a `skill` on a different agent. `git-workflow`, `lint`, and `testing-best-practices` do not. Default wear does not copy the YML. The package still ships `src/opencode/` because `package.json` `files` includes it.

`src/skills/` (45 files) is the costume catalog. This repo has no `foundry.json`. Costume is opt-in. Consumers do not get the 45-skill dump from install.

`src/tools/` had two wrappers and only their tests imported them. Both are removed.

On disk, not the suit path: `examples/`, `docs/archive/` (one test reads a single legacy file), `logs/` (write sink), root `public/*.html` (the build still copies it into `dist/public`), `railway.json`, `vercel.json`, and `grok-bot/` (separate package `@0xray/grok-bot@0.1.8`; this repo only tests it).

## Dead

Worth and Superseded for every path below are maintained on `docs-site/docs/architecture/v3-museum.md`. Grab with `git show 601cdafc0:PATH`. This file is the working paper.

Removed this pass. No `src` importer, and no test imported the modules. `src/__tests__/infrastructure/infrastructure.test.ts` no longer requires `src/performance`. Storyteller no longer looks in the root `skills/` tree.

- `src/benchmark/`
- `src/infrastructure/`
- `src/performance/`
- `src/public/` (`XrayService`; root `public/*.html` stays)
- `src/testing/`
- Root `skills/` (31 stale copies; wear reads `src/skills`)
- `monitoring/prometheus.yml` and `monitoring/alertmanager.yml`
- `api/health.ts` (Vercel routes to `api/mcp.ts`)
- Root `workflows/post-deployment-audit.yml` (the packed copy is `src/opencode/workflows/`)
- `advanced-features/` (27 files; no production importer)
- `src/integrations/grok/hooks/pre-tool-use.ts` (the live hook is `pre-tool-use.js`)
- `src/delegation/task-skill-router.d.ts` (declaration only; no importer)
- `src/orchestrator/self-direction-activation.ts` and its unit test (the class had no production importer)
- `src/tools/` (`assess-complexity-tool.ts`, `query-routing-tool.ts`) and their tests
- Four unwired analytics CLI commands, plus `src/analytics/consent-manager.ts` (only those commands and its test imported it). `npx 0xray analytics` still runs `SimplePatternAnalyzer`
- `src/agents/known-names.ts`, `src/core/trace-context.ts`, `src/enforcement/test-auto-healing.ts`, `src/integrations/cross-language-bridge.ts`, `src/integrations/base/ExampleIntegration.ts`
- `src/mcps/connection/connection-manager.ts` and its test. The pool, `McpConnection`, and `ProcessSpawner` stay
- `src/orchestrator/universal-registry-bridge.ts`
- `CodeChangeAnalyzer`, `ProcessorConfigLoader`, `RetryHandler`, `ComprehensiveValidator`, `session-capture-processor.ts`
- `src/utils/batch-operations.ts`, `task-graph.ts`, `test-template-generator.ts`, `todo-manager.js`, `token-manager.ts`
- `src/validation/agent-config-validator.ts`, `orchestration-flow-validator.ts`. Estimation and report-content validators stay
- Unwired CLI commands `enforce`, `govern`, `security-audit`. The worn gate is `evaluatePreToolGate` in `delegation-gate-runtime.mjs`
- `src/integrations/enforcement-gate.ts` and its test. Hosts do not import it
- `src/config/routing-mappings.ts` (the JSON file is the one the delegator loads)
- `src/core/bridge.mjs` (Hermes `bridge.mjs` stays)
- Unused barrels: `enforcement/index`, `enforcement/loaders/index`, `inference/index`, `metrics/index`, `mcps/index`, `mcps/orchestrator/index`, `postprocessor/metamorphosis/index`, `security/index`
- `postprocessor/integration.ts` and the security cluster that nothing on the suit path imported: `comprehensive-security-audit`, `security-hardening-system`, `security-orchestration-layer`, `security-agent-coordinator`

Kept on purpose:

- `src/scripts/integration.ts` is the `0xray-integration` bin.
- `src/cli/server.ts` had no importer and no CLI command. Removed. Express stays, because govern-http and the postprocessor triggers still import it.
- Gitignored `backups/` and root `*.tgz` were not removed.

Names that stay gone, and have no `src` file: `parseLook`, `cascadeOf`, `listPipelineIds`, `pops`, `writePopJob`, `notesWithPopJob`, `notesWithPickup`, `setCardLine`, `disarm`. The words `cycle`, `arm`, and `scratch` still appear as ordinary locals. There is no function by those dead names. `planeWord` stays.

## Plates already on disk

Nine lens planes. Eight already have a drawing under `docs-site/docs/plates/`.

| Plane | Plate file | Stamp state |
| --- | --- | --- |
| ground | none | Empty on purpose |
| house | `house.md` | Drawn. Typed `state flow` |
| routing | `routing.md` | Pipeline drawing |
| boot | `boot.md` | Pipeline drawing |
| governance | `governance.md` | Pipeline drawing |
| memory-recall | `memory-recall.md` | Pipeline drawing |
| orchestration | `orchestration.md` | Pipeline drawing |
| processor | `processor.md` | Pipeline drawing |
| reporting | `reporting.md` | Pipeline drawing |

Extra drawings, not one of the nine: `goggles.md`, `suit.md`, `kits.md`, `host-pack.md`, `glossary.md`, `grokbot.md`. The index lists those six as domain models.

Alive source folders in the list above do not each get a lens or a plate.

## Stamp pass

Routing plate matches `scoreAndRoute`. Governance vote includes `needs_revision`.

This loop restamped the plates whose drawings named work the lens file does not do:

- Memory recall is `plates.cjs`: score the intent, load one plate, stamp a missing worn copy. Speech-to-lesson is not this file.
- Processor is `ProcessorManager`: `executePreProcessors`, then `executePostProcessors`. The suit hooks and the mill are not this file.
- Orchestration is one tool per call. `spawnAside` wraps `orchestrate-task`, `analyze-complexity`, and `govern-and-apply`.
- Boot now names memory monitoring, processor health, then agents and plugins, in the order `executeBootSequence` runs them.
- Reporting no longer draws the SessionStart schedule marker. That marker is `scheduleAutonomousReportingMarker` in the hook runtime. This class caches, formats, and writes when `outputPath` is set.

House stays the state-flow drawing. Its entry and exit are locked to `EMPTY` and `DOCTOR · House: PASS?`. Ground still has no plate file.

`content-creator` stays out of `xray/routing-mappings.json`. The live file already sends content, blog, and marketing to `growth-strategist`. Adding a second row would collide.

Setup and teardown stay blank on the layer plates. The code does not name those boxes.

## Left for a later pass

- Release script waits for the registry before it tags. That edit is in the working tree, tested, and not committed.
- Do not start Phase E.
