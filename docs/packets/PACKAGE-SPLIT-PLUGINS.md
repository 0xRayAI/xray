# 0xray v5.0.0 — package split and plugin model

Packet only. No code in this change. The word for the human is **owner**.

Owner GO 2026-10-21 10:32 CT. This file is the fold. The generalist close read 1192 of 1192 files on tree `4fffb6cce`. That close stays internal. This packet summarizes it. It does not paste it.

Cites below were re-checked on this branch after it merged `origin/main` (`02a5ce6b`). A cite marked VERIFIED was opened in this working tree for this fold. The same lines hold on `4fffb6cce` for the files checked there.

## Packet

- goal: Ship 0xray 5.0.0 as the three-subsystem core with modules plugged in, and split fleet pieces into @0xray packages plus sign-in and chat slots.
- constraints: Packet only. No code in this change. Say owner. No personal names. Issue 495 stays open. chrono and jelly stay on the owner account.
- path: docs/packets/PACKAGE-SPLIT-PLUGINS.md. This fold fills Subsystem, Core, and the module map from the 1192-file close.
- acceptance: Core is Inference, External Governance, and the Autonomous Engine, plus wear, validate, doctor, and the Codex gate. Modules, packages, and fell-out cards are named.
- gates: This docs pull request carries gate C only. B and D stay off. The 5.0.0 publish gates below are not this pull request.
- evidence: Generalist close, 1192 of 1192 files, tree 4fffb6cce. Lines marked VERIFIED were re-opened on this tree.
- next owner: forge (@forge0x1), critic (@critic0x), and Arch1 (@arch10x), for three-way sign-off.
- escalate: the owner, if forge, critic, and Arch1 do not all sign off.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/record-map.md`, `docs-site/docs/plates/foundry.md`, `docs-site/docs/plates/repertoire.md`.

## What the skeleton had wrong

The skeleton left Subsystem and Core as pending research, and it left the config file and the Foundry name undecided. The close settles those.

- Core is the three subsystems that already exist, plus suit wear, validate, and doctor, plus the Codex gate that wears them. Nothing in the close adds a fourth subsystem.
- The plugin and config loader stays inside External Governance. It is not its own subsystem.
- The config file is `features.json`. `config.json` overlaps token caps. COALESCE those caps into `features.json`, then drop `config.json`.
- Keep the package name `@0xray/foundry`. Do not rename it to `@0xray/mill`.
- `@0xray/repertoire` stays its own package. It is the memory organ Inference calls through `src/memory-routing`. Do not fold the organ into the core package. Root `package.json` does not declare it. Postinstall cite: `scripts/node/postinstall.cjs:89-92`. The rule is [Release order](../../grok-bot/OP-PROC.md#release-order).
- Sign-in and chat slots are new. They are not `src/nucleus/plugin-registry.ts`, not `.xray/plugins`, and not `/login`.
- `@0xray/hooks` may hold host shims. The constitution stays in core. Cursor and Grok hooks call `evaluatePreToolGate`, then a Codex check, then the lens, then `repertoireRoute`. Pulling that gate out of core takes the Codex check off the turn.
- `govern-and-apply` calls `governExternalProposals` and does not apply. Apply stays on the CLI cycle when a proposal was approved.
- Shipped `inference_governance.enabled` is false. VERIFIED `xray/features.json:200`. That flag gates the cycle and the MCP tool. It does not gate `GovernanceService.resolveRequireExternalDynamo` or `SelfProposalEngine`. The three switches are named under External Governance. The Dynamo pin is the public origin at `src/integrations/governance/types.ts:77`. The server repo stays on the owner account.
- `getLevelFromScore` never reads the `enterprise` field. VERIFIED `src/delegation/complexity-core.ts:141-148`. `xray/features.json:148` sets `enterprise` to 100. `DEFAULT_THRESHOLDS.enterprise` is 75 (`complexity-core.ts:90`) and is also unread. The cuts the function uses are 15, 25, and 50 (`:87-89`). A score above 50 is enterprise.
- Cutoff literals are `0.92/0.95`, `0.82/0.88`, and `0.75/0.80`. VERIFIED `src/governance/governance-core.ts:105-110`. `PHI` and `TAU` are not those cutoffs.
- `resolveDynamoBaseUrl` prefers a configured endpoint, then `GOVERNANCE_ENDPOINT`, then `PUBLIC_DYNAMO_SSOT`. VERIFIED `src/integrations/governance/types.ts:83-87`. The public origin is the pin.

## Core

### Inference

`src/inference` plus the Repertoire organ behind `src/memory-routing`. `InferenceCycle` phases run on `inference:run`. With the shipped flag false, that cycle stays on the local matrix. The turn hooks do not construct `InferenceCycle`.

Plugs in here: repertoire (its own package), session capture, the inference corpus under `docs/inference`, state under `.xray/inference`.

### External Governance

A mix, one subsystem.

- In-repo `GovernanceService`, `governance-core`, and `CodexPolicyService`.
- The constitution inside `src/nucleus/delegation-gate.ts` (Codex 11, 29, 69, 70, and a destructive shell). It sits beside the vote. It is not inside `govern()`.
- `GovernanceClient` posts `{baseUrl}/call_connected_tool`. The pin, when neither config nor `GOVERNANCE_ENDPOINT` names a host, is `PUBLIC_DYNAMO_SSOT` at `src/integrations/governance/types.ts:77`: `https://mcp-production-80e2.up.railway.app`. There is no package version for that server in this suit. The server repo stays on the owner account.
- The features loader, `src/core/features-config.ts`, lives here. `xray/features.json` is data. The loader is core.
- `src/enforcement` is the worn `xray-enforcer` server. It stays in this subsystem. One reader of `xray/codex.json` is enough. An empty codex load returns 60 and `is_fallback` true. That 60 is not the worn 70.

Three switches. Shipped `inference_governance.enabled` is false (`xray/features.json:200`).

1. Cycle. `isGovernanceMcpPreferred` reads `enabled ?? true` (`src/inference/inference-cycle.ts:464-468`). With the shipped false, `governProposals` uses `governWithLocalMatrix` (`:406-407`, `:445-461`) and does not call Dynamo, unless `XRAY_FORCE_MCP_GOVERNANCE` is `true` (`:403-404`).
2. MCP tool. `resolveRequireExternal` returns `enabled === true` (`src/mcps/governance.server.ts:257-264`). With the shipped false, `govern_proposals` does not require external.
3. Service default. `GovernanceService.resolveRequireExternalDynamo` does not read `enabled` (`src/governance/governance-service.ts:134-149`). With the shipped file and no `XRAY_LOCAL_MODE`, it returns true. `SelfProposalEngine` submits `requireExternalDynamo: true` (`src/postprocessor/metamorphosis/SelfProposalEngine.ts:419`) and does not read the flag. An explicit value wins at `governance-service.ts:135`.

Until the fell-out card lands, the flag keeps Dynamo off for the cycle and the MCP tool. It does not keep the service default or `SelfProposalEngine` off Dynamo.

Two doors. The service calls code-review, security-audit, and the research skill. `inference:run` with the flag off uses `governWithLocalMatrix`. The MCP tool returns a vote. The governance server imports `getGovernanceService`. `SelfProposalEngine` imports nucleus `govern-http`. The nucleus is not the sole path.

`checkProposal` sends `fix` and `guard` to `evaluate_governance` with an empty review list. Other types go to `govern_with_solar`. `applyDecisionLogic` ignores the configured confidence cutoffs. Local confer abstains and labels `UNREVIEWED`. It does not call the client. COALESCE that request shape before a path that still requires external is used. If the live schema requires one review, that call fails on first use.

### Autonomous Engine

`thinDispatch`, the orchestrator MCP, the delegation gate, asides, confer, and synthesis. `scoreAndRoute` uses the cuts above, not `features.json` `enterprise` 100. Default confer is off. Shipped `synthesis.enabled` is false (`xray/features.json:174`). When synthesis is due on the guided path, `evaluateSynthesisGate` denies `govern-and-apply` and allows `analyze-complexity`. A frontier profile skips that deny on a write. `confer-switch` does not edit the synthesis block.

`evaluatePreToolGate` runs station heat, then the constitution, then synthesis and pending delegations unless ceremony is lite, then the spawn plan. A frontier spawn with no plan is allow plus warn (`spawn-plan-missing`). A guided host, and Hermes on `auto`, still deny that spawn. A Hermes write that breaks the type rule is gate `codex-11` even on a frontier profile.

Suit lifecycle in this core: `0xray wear`, `0xray validate`, `0xray doctor`. `validate` is the closed wear check. KEEP doctor and validate. Stop advertising `fix`. `install`, `init`, and `fix` print that nothing was written. `credible-init` always prints that the pod is not implemented.

## Modules, not core

House, goggles, foundry, bifrost, hooks-as-shims, repertoire-as-package, and the docs site do not import the three subsystems upward. No file under `house/` or `grok-bot/lib` imports those three. `server.mjs` does not import `InferenceCycle`, `GovernanceClient`, or `scoreAndRoute`.

The four kits stay Repertoire, Dynamo, Clearing, and Goggles. House, bifrost, and hooks are packages. The words House kit mean the template package `@0xray/house`. That package is not a fifth kit.

| Surface | Paths | Home | Plugs into | Reason |
| --- | --- | --- | --- | --- |
| Live board | `house/live/app/server.mjs`, `house/live/feed/live_mesh.py`, `house/live/tools/live-inbox`, wake template, deploy script | `@0xray/bifrost` | module, not core | The board is a client of seats. It does not vote and it does not route the turn. |
| Burst publisher | `house/live-mesh/fetch_feed.py` build and write | stays inside bifrost | module, not core | The adapter replaces `build` and `write`. Do not make `@0xray/burst`. |
| House template | `grok-bot/templates/house`, seat doctor | `@0xray/house` | module, not core | House kit means this template package, not a fifth kit. The four kits stay Repertoire, Dynamo, Clearing, and Goggles. House, bifrost, and hooks are packages. `@0xray/grok-bot` depends on the template. `pulsar-game.mjs` reaches `wave-schedule.mjs`. Depend on the board file. Do not copy it. |
| Grok bot | `grok-bot/` | `@0xray/grok-bot` | module, not core | Seat kit. It wears the suit. It is not the suit. |
| Repertoire | `vendor/@0xray/repertoire` | `@0xray/repertoire` | Inference | Organ behind `src/memory-routing`. Own package. Move the package to the 0xRayAI org. |
| Foundry / mill | `scripts/foundry` | `@0xray/foundry` | module, not core | Already that package. Plant fasten: [Roles](../../grok-bot/OP-PROC.md#roles). |
| Product mill | dependency `@0xray/blip` | stays `@0xray/blip` | module, not core | Foundry depends on it. Do not merge it with a hangar tool that shares the name. |
| Goggles | lens, plates reader, `src/integrations/hooks/plates.cjs` | `@0xray/goggles` | External Governance and the engine | `lensBeforeResearch` runs on the turn. The plate reader is input. The gate that consumes the lens stays in core. |
| Host shims | `.cursor/hooks`, Grok launcher `scripts/mjs/run-grok-hook.mjs` | `@0xray/hooks` | Autonomous Engine | Adapters. The constitution they call stays in core. |
| Docs site | `docs-site/` | stays in the suit repo until a later cut | module, not core | The manual. Not a runtime subsystem. |
| Dynamo server | owner-account repo | out of the v5 packages | External Governance | The client stays. The server does not move. Dynamo stays one of the four kits. |
| Clearing | hangar kit, owner account | not a package in this split | not a subsystem | Clearing stays the hangar kit. It is not a package in this split, and it is not a subsystem. |
| Sign-in, xAI | not in this repo | `@0xray/auth-xai` | module, not core | Optional. Wraps bedrock OAuth and Railway refresh. xAI fleets only. Interactive mode in `scripts/node/setup-xai-oauth.mjs` saves local auth and stops. Only `daemonMain` calls `deployToRailway`. |
| Sign-in, fallback | not in this repo | a small fallback package, name still open | module, not core | Owner token or GitHub, so a non-xAI board can drag a card. |
| Chat | not in this repo | `@0xray/chat` | module, not core | Provider picker. Optional per board. Keys stay out of the repo. |
| Codex file | `xray/codex.json` | core, External Governance | External Governance | Worn 70-term file. The gate that enforces it stays in core. |

`xray/routing-mappings.json` is a keyword map `AgentDelegator` reads. It is not `getAgentForTier` and it is not the board's `inbox-roles.json`. COALESCE it into one engine table. Do not merge it into the board. `xray/integrations.json` and `workflow_state.json` had no live reader in the close. RIP as unused data is fair. That RIP is SINGLE until those files are re-opened. It does not move a package.

## Packages

| Package | Owns | Moves |
| --- | --- | --- |
| `0xray` 5.0.0 | the three subsystems, wear, validate, doctor, the Codex gate, the features loader | stays the suit |
| `@0xray/bifrost` | server, collector, live-inbox, wake template, deploy script | `house/live/**` |
| `@0xray/house` | the template package (House kit means this package, not a fifth kit) and seat doctor | `grok-bot/templates/house/**`, seat-doctor program |
| `@0xray/repertoire` | the memory organ | already a package; org move only |
| `@0xray/foundry` | the mill, release stamp | already `scripts/foundry` |
| `@0xray/goggles` | lens and plate reader | plate runtime plus the lens the turn calls |
| `@0xray/hooks` | host shims only | `.cursor/hooks` adapters and the Grok launcher |
| `@0xray/auth-xai` | optional xAI sign-in | new, not in this tree |
| fallback sign-in | optional non-xAI sign-in | new, name open |
| `@0xray/chat` | optional provider picker | new, not in this tree |
| `@0xray/grok-bot` | seat kit | stays; depends on `@0xray/house` |
| `@0xray/blip` | product mill | stays an external dependency of foundry |

Clearing is not in this list. It stays the hangar kit.

## Dependency graph

```
0xray 5.0.0
  Inference --calls--> @0xray/repertoire
  External Governance --client--> Dynamo server (owner account, not a package)
  External Governance --reads--> xray/features.json, xray/codex.json
  Autonomous Engine --calls--> evaluatePreToolGate (in core)
@0xray/hooks --imports--> Autonomous Engine
@0xray/goggles --read by--> the turn, after the gate
@0xray/foundry --depends--> @0xray/blip
@0xray/house --depends--> @0xray/bifrost (wave-schedule, do not copy)
@0xray/grok-bot --depends--> @0xray/house
@0xray/bifrost --optional--> @0xray/auth-xai | fallback sign-in | @0xray/chat
```

Core does not import bifrost, house, foundry, or the docs site. Default plugins are off, so a board with no sign-in plugin stays read-only.

## Plugin interface

House config enables slots through `features.json` `plugins`. Default: no sign-in, no chat.

Sign-in:

- `identify(request) -> { id, label } | null`
- `canWrite(user, card) -> boolean`
- Kanban drag-and-drop needs some sign-in plugin. It does not need xAI.
- No tokens in the repo. Refresh lives in the plugin process.

Chat:

- `send(message) -> reply`
- `stream(message) -> chunks`
- The fleet sets the provider and the key in the host env. The key is not committed.

Both slots are off until `plugins.sign_in` or `plugins.chat` names an installed package.

## Config schema

One file: `xray/features.json`, copied to `.xray/features.json` by wear.

```json
{
  "plugins": {
    "sign_in": null,
    "chat": null
  }
}
```

`null` means the slot is off. A string is the package name. `inference_governance.enabled` stays false until a fleet opts in. That flag is the cycle switch and the MCP switch. It is not the service default and it is not the `SelfProposalEngine` submit. `synthesis.enabled` stays false. `goggles.enabled` stays true. Doctor already exits 1 when goggles are off, and that is the only failure it exits on today.

Token caps that still live in `config.json` move into `features.json` in the same change that drops `config.json`.

## Migration order

1. **bifrost.** Move the live board. Pin the version in each install. Docs-check: setup, WAKE-ROUTINE, and the bifrost plate name the package. Test: the server still does not import `InferenceCycle`, `GovernanceClient`, or `scoreAndRoute`.
2. **auth-xai.** Optional plugin. Docs-check: only xAI fleets enable it. Test: default `plugins.sign_in` is null, and a null slot cannot drag a card.
3. **fallback sign-in.** Owner token or GitHub. Docs-check: a non-xAI board can drag a card only after this slot is set. Test: `canWrite` is false when the slot is null.
4. **chat.** Optional. Docs-check: keys are env, not files. Test: default `plugins.chat` is null and the board exposes no send.
5. **the rest.** house, goggles, hooks (shims only), foundry stays put, repertoire org move. Docs-check: OP-PROC, onboarding, CHANGELOG, docs-site, the house template. Receipts: [Nothing ships unproven](../../house/OP-PROC.md#3-nothing-ships-unproven). Postinstall: [Release order](../../grok-bot/OP-PROC.md#release-order).

## Fleet migration

Sweep, in this order, after the package that step moves:

- setup and onboarding
- `grok-bot/templates/house` and WAKE-ROUTINE
- `grok-bot/OP-PROC.md`
- docs-site guides and the plates listed below
- CHANGELOG and a 4.x to 5 page

Each sweep says the same package name the step just moved. A page that still says the board, the organ, or the mill lives inside the suit is stale for that step.

## What breaks for 4.x fleets

- The board is read-only until a sign-in plugin is configured. Drag-and-drop stops for fleets that had an implicit write.
- Wear and postinstall: [Release order](../../grok-bot/OP-PROC.md#release-order). Cite `scripts/node/postinstall.cjs:89-92`.
- Plant fasten, including a blip seat: [Roles](../../grok-bot/OP-PROC.md#roles).
- `govern-and-apply` still does not apply. A caller that treated the tool name as apply was already wrong on 4.x.
- `features.json` `enterprise: 100` does not change routing. It does not start changing routing in 5.0.0 either, until the cuts are one table.
- The Dynamo pin is the public origin `PUBLIC_DYNAMO_SSOT` (`src/integrations/governance/types.ts:77`), `https://mcp-production-80e2.up.railway.app`. A configured endpoint or `GOVERNANCE_ENDPOINT` overrides it (`types.ts:83-87`). There is no package version for that server in this suit.

## 4.x to 5 migration guide

1. The tarball drill is [Nothing ships unproven](../../house/OP-PROC.md#3-nothing-ships-unproven).
2. Pin `@0xray/bifrost` to the version the fleet runs. Point `LIVE_URL` at that install.
3. Leave `plugins.sign_in` and `plugins.chat` null. Confirm the board is read-only.
4. Fleets that drag cards install either `@0xray/auth-xai` or the fallback, and set `plugins.sign_in`.
5. Fleets that want chat set `plugins.chat` and the provider key in the host env.
6. Wear, setup, and doctor: [Nothing ships unproven](../../house/OP-PROC.md#3-nothing-ships-unproven). Save the receipts per seat.
7. Do not copy `wave-schedule.mjs` into the house kit. Depend on bifrost.
8. Do not vendor the Dynamo server. The pin is the public origin in `types.ts:77`. The flag keeps the cycle and the MCP tool off Dynamo. The service default and `SelfProposalEngine` still require external until the fell-out card lands.

## Versioning against v5

- `0xray` is **5.0.0**.
- New packages in this split (`bifrost`, `house`, `goggles`, `hooks`, `auth-xai`, the fallback, `chat`) publish **5.0.0** in the same release train and declare a peer on `0xray` `^5.0.0`.
- `@0xray/grok-bot` and `@0xray/foundry` keep their own version lines. Each declares a peer on `0xray` `^5.0.0` when it is tested against that suit. `@0xray/grok-bot` also depends on `@0xray/house` at the 5.0.0 line.
- `@0xray/repertoire` keeps its own version. The org move does not reset it. The suit keeps linking the vendored build until the org package is the one wear resolves.
- `@0xray/blip` stays an external dependency of foundry.

## Release gates

For the 5.0.0 publish, after this packet is signed off:

- The packed tarball is proven on a suit that is still on 4.x.
- Every seat posts install, wear, validate, and doctor receipts. The sequence is [Nothing ships unproven](../../house/OP-PROC.md#3-nothing-ships-unproven).
- Three-way sign-off: forge (@forge0x1), critic (@critic0x), Arch1 (@arch10x).

This pull request is the packet. It does not publish. Gate C is the docs check on this file. B and D stay off.

Doctor receipts are not a green bar today. `runDoctor` returns exit code 1 only when goggles are off. VERIFIED `src/cli/commands/doctor.ts:94`. A missing install still exits 0. The fell-out card for that exit is a gate on the publish, not a reason to treat a 0 as healthy.

## Tests and docs-check

This pull request adds no tests. The checks below are the ones each migration step must grow.

- Default `plugins.sign_in` and `plugins.chat` are null.
- Postinstall: [Release order](../../grok-bot/OP-PROC.md#release-order). Cite `scripts/node/postinstall.cjs:89-92`.
- Doctor exit code matches the defect it claims. Until the fell-out card lands, a receipt must include the text, not only the exit code.
- Plate ids in `src/integrations/hooks/plates.cjs` match the plates the manual draws.
- Docs-check: no page sends a fleet to `@0xray/mill`, to a fourth subsystem, or to a sign-in slot named `/login`.

## Plates and lenses

Listed only. Nothing here draws or stamps a plate. Drawing waits until critic PASSes this packet.

Redraw, from the close, per subsystem:

- Inference: inference-cycle. Six phases. Say the shipped flag leaves Dynamo off. Say `govern-and-apply` does not apply.
- External Governance: governance (two doors), dynamo (the client only; the server is not a package), delegation-gate (beside the vote, not inside `govern()`).
- Autonomous Engine: routing, orchestration, confer (default off), synthesis (shipped flag false), temperament (missing config stays guided; frontier spawn is warn).
- Modules: activity-log (three homes: shipped `activity_logging.log_path` is `.opencode/logs` at `xray/features.json:105`; `write-home` names `.xray/logs/activity.log`; status reads `logs/framework/activity.log`), worn-turn (the hook chain, not a replacement for the gate), bifrost, house, repertoire, foundry, grokbot.

On this tree, `PLATE_IDS` already contains `bifrost` (`plates.cjs:19`), `worn-turn` (`:49`), `repertoire` (`:54`), `dynamo` (`:55`), `foundry` (`:56`), and `grokbot` (`:66`). VERIFIED. Do not file those as missing. Boot and processor skills exist under `.agents/skills/`. Do not file those as missing.

New, after the slots exist and critic has PASSed: one plate for the sign-in slot and one plate for the chat slot. Not before.

Retired: none from this close. Do not retire a plate because an older gap list omitted it.

## Verdicts

Only VERIFIED lines drive these. SINGLE notes stay proposals.

- INTEGRATE the Dynamo client in External Governance. KEEP the server on the owner account. The pin is `PUBLIC_DYNAMO_SSOT` (`types.ts:77`). The flag at `features.json:200` gates the cycle and the MCP tool. The service default and `SelfProposalEngine` stay on the fell-out card.
- COALESCE `config.json` token caps into `features.json`, then drop `config.json`. The overlap is the close. The file pair was not re-opened line by line here, so the drop waits on that re-open before code.
- COALESCE routing cuts onto the three numbers `getLevelFromScore` reads. VERIFIED `complexity-core.ts:141-148`.
- INTEGRATE repertoire as a package plugged into Inference. Do not merge it into `0xray`.
- INTEGRATE foundry under its current name. A rename to mill is withdrawn.
- RIP of `xray/integrations.json` and `workflow_state.json` is SINGLE. Not a code change in this packet.
- The pre-tool gate stays in core. Host shims are the only move into `@0xray/hooks`.

## Risks

- Fail-open hooks and doctors that exit 0 are in the 4.x tree. Copying them into a package copies the hole. The cards below are the list.
- Splitting the delegation gate into `@0xray/hooks` takes Codex enforcement off the turn.
- With the shipped flag false, `GovernanceService.resolveRequireExternalDynamo` still returns true and `SelfProposalEngine` still submits `requireExternalDynamo: true`. A seat that treats every path as off Dynamo will still call it. The card below is the fix.
- Turning `inference_governance.enabled` on without a review in the `fix` and `guard` request fails on first use if the schema requires one review.
- Two doctors disagree. `doctor.ts` and the seat doctor are different programs. A fleet receipt that treats them as one check will lie.
- A public bifrost deploy serves history. The close reports `validSession` true in public mode. That stays SINGLE until re-opened. Do not treat it as a signed verdict.
- `KernelOrchestrator.performDelegation` is a stub in the close. SINGLE. Do not describe the nucleus as the sole governance path while the governance server still imports the service.

## Open questions

- Package name for the fallback sign-in. Owner token and GitHub are the behavior. The name is not locked.
- Whether `@0xray/goggles` takes the plate markdown or only the reader. The manual can stay in the suit repo for 5.0.0.
- Issue 495 stays open. Its card is reworked onto the sign-in slot after this packet is signed. This file does not close it.

## Fell out

Claims the 1192-file close withdraws, grouped by the fix. Fail-open and exit 0 come first. Each line is a card stub: what it is, the source, what it waits on, and the owner. A stub that waits on sign-off waits on #510, this packet.

### Fail-open

- `GovernanceService.resolveRequireExternalDynamo` does not read `inference_governance.enabled` and returns true on the shipped file (`governance-service.ts:134-149`, VERIFIED). `SelfProposalEngine` submits `requireExternalDynamo: true` (`SelfProposalEngine.ts:419`, VERIFIED). Make both follow the flag. Source #510. Waits on three-way sign-off of #510, this packet, then a code change. Owner: owner.
- The Grok launcher writes allow and exits 0 when the hook file is missing or throws, so the constitution never runs (`scripts/mjs/run-grok-hook.mjs:23-37`, VERIFIED). Source #510. Waits on three-way sign-off of #510, this packet, then a code change. Owner: owner.
- Hermes TypeScript `onPreToolCall` allows the tool when the bridge throws and does not call the delegation gate (`hermes-agent-integration.ts:359-365`, VERIFIED). The Python plugin calls that gate first and can block (`__init__.py:236-238`, VERIFIED). Source #510. Waits on three-way sign-off of #510, this packet, then a code change. Owner: owner.
- A quality-gate BLOCKED line is logged and the Python pre-tool returns without blocking (`__init__.py:286-316`, VERIFIED). Source #510. Waits on three-way sign-off of #510, this packet, then a code change. Owner: owner.

### Doctors and other checks that exit 0 on failure

- `0xray doctor` exits 0 when the package is missing or Node is old. It exits 1 only when goggles are off (`doctor.ts:94`, VERIFIED). Source #510. Waits on three-way sign-off of #510, this packet, then a code change. Owner: owner.
- The suit-confirm script exits 0 when every bridge is skipped (`confirm-suit-all.mjs:208-253`, VERIFIED). Source #510. Waits on three-way sign-off of #510, this packet, then a code change. Owner: owner.
- A pipeline run skips a missing pipeline file and can still exit 0. Source #510. Waits on a re-open of that runner, then sign-off of #510, this packet. Owner: owner.
- Cursor wear on a folder that is not a git checkout exits 0 and writes nothing. The consumer wear test leaves the factory hooks file byte-identical. Source #510. Waits on three-way sign-off of #510, this packet, then a code change. Owner: owner.

### Tests that assert nothing

- The Hermes plugin test still expects four tools and no delegation-gate call. The live hook calls that command first. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- Archive playbook sections 2 and 3 print OK when the dist file is missing. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- The metamorphosis phase test never asserts the govern mock. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- The `inference:run --no-apply` test only sees an approve vote. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- The concurrent orchestrator test only checks that every task succeeds. It does not prove a cap. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- The codex injector integration test returns undefined on every case, including the case titled as a block. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- The OpenCode integration test installs an inline mock. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- The cycle end-to-end reaches phase complete and does not assert applied. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- The processor-pipeline test locks handler names in a string table. It does not run the server. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- The Hono `govern_proposals` test accepts a governed result or an error string and does not lock the cutoff numbers. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.
- The nucleus-primary test still requires the MCP symbols and a local boot sequence. The boot pipeline script never imports `BootOrchestrator`. Source #510. Waits on three-way sign-off of #510, this packet, then a test change. Owner: owner.

### Stale docs

- A gap list says bifrost, grokbot, and worn-turn are missing from `PLATE_IDS`. They are at `plates.cjs:19`, `:66`, and `:49` (VERIFIED). Source #510. Waits on nothing in code. Owner: owner.
- A gap list says boot and processor have no skill files. Both exist under `.agents/skills/`. Source #510. Waits on nothing in code. Owner: owner.
- Notes cite `evalNudges` at `server.mjs:1180` and the tripwire default at `:1583`. The function is `:1234` and the 30 minute default is `:1656` (VERIFIED). Source #510. Waits on nothing in code. Owner: owner.
- The comment above `evalNudges` says level 2 goes to Coord (`server.mjs:1230-1231`, VERIFIED). The loop sends level 1 and repeating level 3 to the same owner (`:1275-1286`, VERIFIED). Source #510. Waits on three-way sign-off of #510, this packet, then a comment fix. Owner: owner.
- A claim that the server never posts is too wide. The handoff path does not post a packet. Wake delivery does. Arch1 launch posts when its flag is on. Source #510. Waits on nothing in code. Owner: owner.
- A claim that `station-hook-runtime.cjs` appends `activity.log`. It does not. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A v2 deletion title says those dist modules are gone. The vitest file still loads them. Source #510. Waits on three-way sign-off of #510, this packet, then a docs correction. Owner: owner.
- A claim that `postinstall` writes the consumer bridges. Cite `postinstall.cjs:89-92`. Rule: [Release order](../../grok-bot/OP-PROC.md#release-order). Source #510. Waits on nothing in code. Owner: owner.
- A claim that status reads `.xray/logs/activity.log`. It reads `logs/framework/activity.log` only. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- Archive Hermes and OpenClaw scripts are treated as the live contracts. Their root is `docs/archive`. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that `tripwire_push.py` is the live governor. The live clock is the server tripwire (`server.mjs:1656`, VERIFIED). Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that a frontier host always denies a planless spawn. `auto` plus grok allows it and sets `spawn-plan-missing`. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- Plant fasten: [Roles](../../grok-bot/OP-PROC.md#roles). A blip plant fastens blip only, and `worn-host` still requires mill and inspect. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that mint always copies the full skill catalog. Only a mill kind does. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that the MCP connectivity validator is the seven-server map. It lists 14 dist files and omits the governance server. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- `publish-agent` is on the help surface as a publisher. The body says coming soon (`publish-agent.ts:221`, VERIFIED). Source #510. Waits on three-way sign-off of #510, this packet, then a docs correction. Owner: owner.
- A claim that `handoff.mjs` posts packets. It computes missing rows. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that interactive xAI OAuth deploys to Railway. Only `daemonMain` calls `deployToRailway`. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that the fleet roster lock is nine seats. The routing test locks eight names. Blaze is the owner seat, not a roster seat. `arch1` is outside that eight. Herald, magnet, nibbler, and sound are parked. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that the dummy metamorphosis file uses a different matrix. The score function uses the same deltas. The dummy file stays a separate example. Source #510. Waits on nothing in code. Owner: owner.
- A claim that the nucleus is the sole governance path. The governance server must import `getGovernanceService`. `SelfProposalEngine` imports nucleus `govern-http`. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that station heat copies the note onto the card. The card gets the count. The note stays off the card. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that Hermes session-start archives every stale plan. A synthesis plan stays. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that a loose PASS in consult prose completes the todo. Only `Verdict: PASS` does. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that a governance MCP error abstains at confidence 0.5. The cycle test stores reject at confidence 0. Source #510. Waits on a docs correction after sign-off of #510, this packet. Owner: owner.
- A claim that a running cloud agent lights the seat on the served board. `applyCloudOwners` leaves the seat idle. Source #510. Waits on three-way sign-off of #510, this packet, before any board change. Owner: owner.

### Other

- `language-detector.ts` and `import-resolver.ts` were marked still on hold. The close counted both end to end. Source #510. Waits on nothing. Owner: owner.
- A running coverage line said 447. The corrected base is 448, and the written line already includes it. Source #510. Waits on nothing. Owner: owner.
- A claim that `working.py` was only a test lock. The source is read. `fetch_feed.py` calls it. Source #510. Waits on nothing in code. Owner: owner.

## Research handles

The close is one generalist answer to the docs, satellites, house, and runtime notes. Those four stay inputs. No new handle. The five subsystem handles and the four stack handles posted their rounds on the draft. This fold is the picture those rounds were waiting on. It is not a fourth subsystem and it is not a new package.

| Handle | Role |
| --- | --- |
| `[v5-inference]` | Subsystem: Inference |
| `[v5-governance]` | Subsystem: External Governance |
| `[v5-engine]` | Subsystem: Autonomous Engine |
| `[v5-generalist-1]` | Generalist. The 1192-file close summarized here. |
| `[v5-generalist-2]` | Generalist |
| `[v5-house]` | house, Bifrost, grok-bot |
| `[v5-runtime]` | the rest of src, hooks, scripts, CI |
| `[v5-docs]` | docs, plates, lenses, tests |
| `[v5-satellites]` | repertoire, the Dynamo server, bedrock OAuth |
| `[v5-packet]` | This fold |

## Sign-off

- [ ] forge (@forge0x1)
- [ ] critic (@critic0x)
- [ ] Arch1 (@arch10x)

Forge records its sign-off as a forge0x1 comment. Each comment @mentions the party it addresses. The checklist stays open until those three comments exist.
