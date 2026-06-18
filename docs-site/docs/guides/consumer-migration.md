# Consumer Migration & Integration Guide (v3.4+)

**Audience**: Plugin authors, bridge maintainers (Hermes, OpenClaw, Grok Build, OpenCode), and projects that consume `0xray` directly.

**Version**: 3.4.1

## Quick Start for v3 Consumers

```bash
npm install 0xray
```

Postinstall **automatically** runs `install-bridges.cjs` (consumer projects only):

| Step | Action |
|------|--------|
| 1 | `AGENTS-consumer.md` → project `AGENTS.md` |
| 2 | `.gitignore.default` → `.gitignore` (if absent) |
| 3 | Deploy `.xray/` (`codex.json`, `features.json`, `config.json`) |
| 4 | Write project `.mcp.json` with **7 MCP servers** |
| 5 | Install **4 bridges**: OpenCode, Grok, Hermes, OpenClaw |
| 6 | Sync **45 skills** to platform skill directories |
| 7 | Optional git pre-commit hook |

Manual install (idempotent, same outcome):

```bash
npx 0xray opencode install
npx 0xray grok install
npx 0xray hermes install
npx 0xray openclaw install
npx 0xray setup    # optional extras
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

- Pluggable `memory_routing` block in `features.json` (validated by `features.schema.json`).
- Repertoire (`@0xray/repertoire`) is the default provider in the framework repo.
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
| `advanced-features/` on boot path | Decoupled — not consumer install |
| PostProcessor default | Soft-deprecated (`enablePostProcessor: false`) |

## No breaking changes for basic users

If you only use `@agent` invocations, the CLI/TUI, or default plugin hook injection, v3.4+ changes are transparent.

## Related

- [Getting Started](./getting-started.md)
- [Memory Routing](./memory-routing.md)
- [MCP Servers](../mcp/README.md)
- [Full Reference](../full-reference.md)
- Architecture: `PIPELINE_INVENTORY`, `V3-ENFORCEMENT-PIPELINES`, `PIPELINE_ARCHITECTURES`