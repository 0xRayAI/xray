# Consumer Migration & Integration Guide (v3.4+)

**Audience**: Plugin authors, bridge maintainers (Hermes, OpenClaw, Grok Build, OpenCode), and projects that consume `0xray` (npm: `0xray`) directly for enforcement, nucleus access, or MCP surfaces.

**Scope**: v3.4.0+ changes relevant to published package consumers. The v3 nucleus is the canonical integration point. 100% backward compatibility for existing plugin hooks is maintained where possible; new recommended paths use the explicit exports.

## Quick Start for v3 Consumers

1. Depend on the published package:
   ```bash
   npm install 0xray
   ```
   (Postinstall runs automatically and installs hooks + resolves paths for `node_modules/0xray` or copied layouts.)

2. The default integration surface (plugin) continues to work:
   - OpenCode `opencode` config points at the built plugin.
   - Hermes / Grok / OpenClaw bridges load the injection surface.

3. For direct / advanced usage (new in v3 nucleus focus):
   - Use the mapped exports (no deep `dist/` subpath hacks):
     ```ts
     import { /* nucleus entry */ } from '0xray/nucleus';
     import { /* specific, e.g. plugin registry */ } from '0xray/nucleus/plugin-registry';
     ```
   - See `package.json` `"exports"` for `./nucleus` and `./nucleus/*`.

## Key v3 Consumer Changes (What You Need to Know)

- **Nucleus exports**: `0xray/nucleus` and `0xray/nucleus/*` are the supported way to reach core (plugin-registry, governance surfaces, etc.). Internal `dist/nucleus/...` paths are not part of the public contract.
- **Postinstall / setup hygiene**: `scripts/node/postinstall.cjs`, `setup.cjs`, and `prepare-consumer.cjs` use robust detection:
  - If running from `node_modules`, walk to package root.
  - Legacy "xray" name tolerance during transition.
  - Hooks and MCPs are placed correctly for both pure node_modules consumers and "copy-to-root" layouts.
- **Verify gate (term 76)**: Every release (including 3.4.0) is required to pass `npm run verify:consumer` (or the CI equivalent in release.yml). This exercises:
  - `npm pack` → fresh consumer install.
  - ValidatorRegistry load (29 validators).
  - Enforcement gate (beforeToolHook / afterToolHook) from the tarball.
  - Nucleus plugin-registry access.
  - Activity log (frameworkLogger) reachability.
  - Hook pipeline.
  - MCP packaging.
- **Governance / detector**: The source-change governance detector (`scripts/ci/source-change-governance-detector.mjs`) and retro proposals are **0xray-repo CI only**. Consumer projects use the normal inference + governance surfaces (or their own self-hosted Dynamo). Detector does **not** run in consumer trees.
- **Bridges (hermes, openclaw, etc.)**: The 4-bridge E2E in verify-consumer exercises real model paths. Partial passes (e.g. 2/4 or 3/4) have been tolerated historically due to model output variance in JSON parsing for certain bridges; core gate + nucleus features are what block releases. Bridge maintainers should test against the published tarball.

## 0xray (Framework) vs Consumer Project Distinction

When the package name is `0xray` (self-hosting the framework):
- Proposals carry `source: 'system' | 'metamorphosis'`, `tags: ['0xray']`, `onChain: true`.
- Self-evolution (SelfProposalEngine) runs the Term 72 post-apply audit asserting frameworkLogger provenance.

Consumer projects (any other package name) default to:
- `source: 'agent'`, `tags: ['<your-package>']`, `onChain: false` (from features.json `proposal_defaults`).

This distinction is automatic in `inference-cycle.ts` + `governance-service.ts`. No consumer action required.

## Recommended Integration Points (v3.4)

- Enforcement: route through the shared gate (`0xray/integration` or the plugin injection) — full 29-validator + PostProcessor + escalation.
- Direct nucleus (advanced): `0xray/nucleus` for plugin registry, governance handle, etc.
- Logging: all production paths use `frameworkLogger` (structured to `logs/framework/activity.log`).
- Hooks: rely on postinstall; for manual: `npx 0xray setup` or the cjs setup entry.

## Testing Your Integration

Run (or require in your CI):
```bash
npm run verify:consumer
```
Expect core phases (plugin reg, enforcement gate from tarball, activity.log, hooks) to PASS. Bridge variance is noted but the gate for nucleus/consumer features is what matters for v3+.

See the full v3.4 closure details (including Term 72 audit implementation, detector self-governance demo, 0xray vs project distinction, and diagrams) in:
- `docs/reflections/v3.4-reboot-readiness.md`

## No Breaking Changes for Basic Users

If you only use `@agent` invocations, the CLI/TUI, or the default plugin hook injection, v3.4 changes are transparent. The work was subtractive + governance closure + publish hygiene.

For questions on a specific bridge or advanced nucleus use, open an issue or reference the architecture docs under `/architecture` (PIPELINE_INVENTORY, V3-ENFORCEMENT-PIPELINES, PIPELINE_ARCHITECTURES for the new v3 flows).

---

*Maintained as part of the v3+ cascade. One thing at a time; this stub captures the immediate consumer-visible surface after the nucleus + exports + verify work.*
