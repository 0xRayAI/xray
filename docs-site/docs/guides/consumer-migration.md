# Consumer Migration & Integration Guide (v3.4+)

**Audience**: Plugin authors, bridge maintainers (Hermes, OpenClaw, Grok Build, OpenCode), and projects that consume `0xray` directly.

## Missed in the 4.1.4 Dist notes

The 4.1.3 → 4.1.4 steps below still apply. These lines were left out of the Dist notes. package.json stays 4.1.4 here.

1. Goggles. One named card fills that card's files. Bifrost, grokbot, and worn-turn are cards.
2. Seats. The mill seat is off the roster, the mesh, and the inbox. Forge launches the cloud agent and opens the pull request through its App. Blinky plans the wave, paces burn, handles Lane H and Dist, and onboards. An unassigned issue or a P1 wakes forge. CoS is not woken to reassign.
3. Station. A seat sets its own title. Planes are core, integration, ecosystem, distribution, and live. `Keys:` is `gh-<seat>`.
4. Wake and hotfix. The wake posts for real new work. A hotfix merges on green CI. Critic reviews after.
5. Suit. Worn Grok hooks run while Bifrost is live. The only TUI monitor is `inbox-watch.sh`. The default board is https://bifrost.0xray.dev.
6. Inbox. A printed open id is acked. The seed grace delivers a fresh comment. A noop wake 409 is skipped.
7. Board. The public board serves the kanban and `GET /history`, `/history/cards`, and `/history/transitions`.

## Unreleased

Notes for Dist when Arch1 publishes 4.1.5. package.json stays 4.1.4 here. npm still serves 4.1.4 until that publish. These steps are the main tree after 4.1.4.

1. Board. A prompt pulse spins only the card named by working_on. Seen is not working. A roster row is a fleet seat or a product node. A seat quiet for 7 days is dormant. A merge or a GitHub write lights the seat.
2. Tandem. Several tracks run at once, on both loops, and no seat waits for a nod.
3. Card. A card carries raci. A live card missing R or A is amber on its own mark. A same-path cluster is one tip and one pull.
4. Health. A missed /healthz makes the supervisor exit 1 so the one replica is replaced. The replica pid is not SIGKILL'd. The collector is not signaled.
5. Inbox. The watcher writes a new open line to the seat todo and does not ack it. The seat acks after the work. A merge handoff ack needs a review or comment link. A queued check is not a ci_fail line. One open line per head. A green head clears it.
6. Search. A plate file holds its card. One other card in a search switches to that card. Two cards stay. A path on no plane runs. A path outside this checkout runs.
7. Writes. Codex 70 denies a write only in a stale copy of this repo. A worktree on main is allowed.
8. Nudge. L1 through L3 stay on the next owner, the card owner, or the owing seat. CoS is not woken to reassign. A test server does not post the station nudge. Railway does, unless STATION_NUDGE=off.
9. OP cycle. Digest, then card, then do, then loop, then ship. The stanza is OP-PROC #op-cycle.
10. Pins. qs is 6.17.0 in the root lock and the docs-site lock, including nested body-parser. Status compare uses one canonical id.

## 4.1.3 → 4.1.4

A fleet on 4.1.3 follows this path. The v3 consumer steps below stay as they are.

1. Install and wear. `npm install 0xray`, then `npx 0xray wear`. The version is the one in `package.json`.
2. Node is 24.22.1. `engines.node` is `>=24.22.1`. A bare "Node 24" is not the pin.
3. Board. When `LIVE_URL` is set, the board is the collector. The board rule is in `house/live/docs/fleet-setup.md`. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`.
4. Inbox watch. When Bifrost is on, the only TUI monitor is `$XRAY_MAIN/house/live/tools/inbox-watch.sh <seat>`. After a poll that prints work it posts `live-inbox <seat> --turn start --tag wake`. An empty poll does not end the turn. The seat posts `live-inbox <seat> --turn end` when the chat finishes.
5. Cloud. A cloud run posts `live-inbox <seat> --cloud` beside the turn. The tag is `owner/repo#n` or `xray#n`. The cloud agent does not post that line. Turn start uses `--tag "bc-<first8> <track>"`. Turn end uses `--tag "bc-<first8>"`.
6. Cursor folder. Seat wakes use one cursor folder. The rule is the cursor-folder stanza in `grok-bot/OP-PROC.md`. `LIVE_CURSORS` is not required.
7. Reviews are PASS or FIX only. HOLD and FAIL are retired.

## Temperament on upgrade (v4.0)

Existing `.xray/features.json` **without** `suit_temperament` stays **guided** (full spawn-plan deny). Postinstall merge will not silently frontier a Grok consumer. New installs copy shipped `profile: "auto"` (Grok → frontier, Hermes/OpenCode → guided). See [Suit temperament](./v3-temperament.md).

## Quick Start for v3 Consumers

```bash
npm install 0xray
npx 0xray wear
```

Wear writes the consumer suit, including when npm did not run the install script. When that script does run, it symlinks vendored `@0xray/repertoire` into `node_modules` and prints `npx 0xray wear`. Wear then:

| Step | Action |
|------|--------|
| 1 | `AGENTS-consumer.md` → project `AGENTS.md` |
| 2 | `.gitignore.default` → `.gitignore` (if absent) |
| 3 | Deploy `.xray/` (`codex.json`, `features.json`, `config.json`) |
| 4 | Write project `.mcp.json` with **7 MCP servers** |
| 5 | Install **4 chat bridges**: OpenCode, Grok, Hermes, OpenClaw, plus **Cursor** `.cursor/hooks.json` |
| 6 | Fasten mill plant (`mill` + `inspect`). Fasten is foundry-plant/0. `"plant": "@0xray/blip"` (aliases blip/sound) fastens whatever that mill declares. Nested mill `@0xray/foundry@0.1.12`. The mill suit also wears every catalog skill and every role file. A blip or sound seat fastens that plant only. |
| 7 | Optional git pre-commit hook. Factory hangar shops coexist via `shopPlant` |

Manual install (idempotent, same outcome):

```bash
npx 0xray opencode install
npx 0xray grok install
npx 0xray hermes install
npx 0xray openclaw install
npx 0xray setup # optional extras
```

## Seven MCP Servers (v3.4.1)

All consumer MCP servers use `npx -y 0xray mcp <cmd>` — no `dist/` subpath hacks:

| Server | Command |
|--------|---------|
| `xray-governance` | `mcp governance` |
| `xray-skills` | `mcp skills` |
| `xray-orchestrator` | `mcp orchestrator` |
| `xray-enforcer` | `mcp enforcer` |
| `xray-researcher` | `mcp researcher` |
| `xray-code-review` | `mcp code-review` |
| `xray-architect-tools` | `mcp architect-tools` |

Grok plugin MCP config shares the same `XRAY_MCP_SERVERS` constant as `install-bridges.cjs`.

## Key v3 Consumer Changes

### v3.4.1 — Unified bridge installer

- **`install-bridges.cjs`** is the single consumer onboarding path (replaces scattered per-platform setup).
- **`setup.cjs`** uses `isConsumerInstall()` — works for both `node_modules/0xray` and `node_modules/xray`.
- Hermes bridge honors `XRAY_ROOT` env and `xray-consumer-root.txt` marker.
- Grok skills sync to **both** `~/.grok/plugins/0xray/skills/` and `~/.grok/skills/`.

### v3.4 — Nucleus exports

- `0xray/nucleus` and `0xray/nucleus/*` are the supported way to reach core surfaces.
- Internal `dist/nucleus/...` paths are not part of the public contract.

### v3.3 — Memory routing + Repertoire

- **Repertoire is preferred.** Vendored 0.2.9 ships **on**. Dest is named laws, not hangar `repo-*`.
- Pluggable `memory_routing` block in `features.json` (validated by `features.schema.json`).
- Repertoire (`@0xray/repertoire`) is the default provider. Station is the compact ticket, not a substitute.
- `MemoryRoutingProvider` contract: `enrichTasks`, `getTaskConfidence`, `resolveThinDispatch`, `ingestFeedback`.
- External hosts: add `repertoire-mcp` to `.mcp.json` (`repertoire__get_task_confidence`, etc.).
- See [Memory Routing](./memory-routing.md) and [Repertoire Integration](./repertoire.md).

### v3.3.1 — Confidence gate

- Orchestrator execution planning applies a confidence gate before multi-agent dispatch.

### v3.2 — Hardening

- Typecheck integration for orphan files, SelfProposalEngine, AsideContext.
- Canonical `release.mjs` pipeline with consumer smoke gate.

### v3.1.1 — Rename + marketplace

- StringRay → **0xRay** rename complete.
- Root `.mcp.json` + `.grok-plugin/plugin.json` for marketplace discovery.
- ConfigLoader supports `mcpServers` format.
- **Removed**: `hermes bridge` CLI (use `hermes install`), `.opencode/xray/` fallback.

## Postinstall / setup hygiene

`scripts/node/postinstall.cjs`, `setup.cjs`, and `install-bridges.cjs`:

- Walk from `node_modules` to consumer project root.
- Legacy `xray` package name tolerance.
- Hooks and MCPs placed correctly for node_modules and copy-to-root layouts.
- **Mill target:** do not mill npm global prefix or npx `_npx` cache. Parent of `node_modules` is the mill target only when it is a real project (`package.json`). `npm i -g` mill-skips dogfood (mills the 0xray package itself, not Homebrew `lib`). Isolated HOME never writes passwd `~/.grok`.

## Verify gate (term 76)

Every release passes `npm run release:gate` (or CI equivalent):

- `npm pack` → fresh consumer install
- ValidatorRegistry load (29 validators)
- Enforcement gate from tarball
- Nucleus plugin-registry access
- Activity log reachability
- Hook pipeline + MCP packaging
- 4-bridge consumer smoke (7 MCP servers)

```bash
npm run release:gate
npm run release:npm # gate first, then npm publish — do not use a scripts.publish lifecycle
```

## 0xray (framework) vs consumer project

| Context | Proposals |
|---------|-----------|
| Framework repo (`0xray`) | `source: 'system' \| 'metamorphosis'`, `tags: ['0xray']`, `onChain: true` |
| Consumer projects | `source: 'agent'`, `tags: ['<package>']`, `onChain: false` |

Automatic in `inference-cycle.ts` + `governance-service.ts`.

## Recommended integration points

- **Enforcement**: shared gate via plugin injection or `0xray/integration`
- **Direct nucleus** (advanced): `0xray/nucleus` for plugin registry, governance handle
- **Logging**: `frameworkLogger` → `logs/framework/activity.log`
- **Hooks**: rely on postinstall; manual: `npx 0xray setup`

## Removals / deprecations (since 3.1)

| Item | Status |
|------|--------|
| StringRay / strray-ai branding | Retired (3.1.1) |
| `hermes bridge` CLI | Removed — use `hermes install` |
| `.opencode/xray/` fallback | Removed (3.1.1) |
| `advanced-features/` | Removed |
| PostProcessor default | Soft-deprecated (`enablePostProcessor: false`) |

## No breaking changes for basic users

If you only use `@agent` invocations, the CLI/TUI, or default plugin hook injection, v3.4+ changes are transparent.

## Related

- [Getting Started](./getting-started.md)
- [Memory Routing](./memory-routing.md)
- [MCP Servers](../mcp/README.md)
- [Full Reference](../full-reference.md)
- [4.0 vision](../architecture/v4-vision.md) · [Trim list](../architecture/v3-museum.md)